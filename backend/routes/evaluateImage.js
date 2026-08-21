import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildImageSystemPrompt, buildImageUserPrompt } from '../prompts/imageEvaluatorPrompt.js';
import { runQuery } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/results');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = Router();

/**
 * Format base64 image data into Google GenAI inlineData format.
 */
function formatInlineData(imgInput, defaultMime = 'image/jpeg') {
  let rawData = typeof imgInput === 'string' ? imgInput : (imgInput.data || imgInput.url || '');
  let mimeType = (typeof imgInput === 'object' && imgInput.mimeType) ? imgInput.mimeType : defaultMime;

  if (rawData.includes(';base64,')) {
    const parts = rawData.split(';base64,');
    const mimeMatch = parts[0].match(/data:(.*?)$/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    rawData = parts[1];
  }

  // Strip any remaining whitespace or newlines
  rawData = rawData.replace(/\s/g, '');

  return {
    inlineData: {
      mimeType: mimeType || 'image/jpeg',
      data: rawData
    }
  };
}

/**
 * Parses and sanitizes JSON response from Gemini for image evaluation.
 */
function parseImageGeminiJson(text, fallbackMaxMarks = 5) {
  if (!text) {
    throw new Error('Empty response received from Gemini API.');
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed = JSON.parse(cleaned);

  let rawList = [];
  if (Array.isArray(parsed.evaluations)) {
    rawList = parsed.evaluations;
  } else if (Array.isArray(parsed)) {
    rawList = parsed;
  } else {
    rawList = [parsed];
  }

  const sanitizedEvaluations = rawList.map((item, idx) => {
    const maxM = typeof item.max_marks === 'number' ? item.max_marks : (parseFloat(item.max_marks) || fallbackMaxMarks);
    const marksAw = typeof item.marks_awarded === 'number' ? item.marks_awarded : (parseFloat(item.marks_awarded) || 0);

    const isUnclear = Boolean(item.unclear_handwriting || (item.feedback && item.feedback.toLowerCase().includes('could not confidently read')));

    const rawRegions = Array.isArray(item.regions) ? item.regions : [];
    const sanitizedRegions = rawRegions
      .map((r) => {
        if (!r || typeof r !== 'object') return null;
        const page = parseInt(r.page, 10) || 1;
        const x = parseFloat(r.x);
        const y = parseFloat(r.y);
        const width = parseFloat(r.width);
        const height = parseFloat(r.height);

        // Check if coordinates are valid floats between 0 and 1
        if (
          isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) ||
          x < 0 || x > 1 || y < 0 || y > 1 || width <= 0 || height <= 0
        ) {
          return null;
        }

        return {
          type: r.type === 'missing' ? 'missing' : 'incorrect',
          page: Math.max(1, page),
          x: Math.min(Math.max(0, x), 1),
          y: Math.min(Math.max(0, y), 1),
          width: Math.min(Math.max(0.01, width), 1 - x),
          height: Math.min(Math.max(0.01, height), 1 - y),
          note: r.note ? String(r.note) : ''
        };
      })
      .filter(Boolean);

    return {
      question_number: item.question_number ? String(item.question_number) : `Q${idx + 1}`,
      question_text: item.question_text ? String(item.question_text) : '',
      max_marks: Math.max(1, maxM),
      marks_awarded: Math.min(Math.max(0, marksAw), maxM),
      handwriting_transcription: item.handwriting_transcription ? String(item.handwriting_transcription) : '',
      unclear_handwriting: isUnclear,
      location: {
        page: item.location?.page ? parseInt(item.location.page, 10) : 1,
        position: item.location?.position ? String(item.location.position) : 'Answer Sheet Page 1'
      },
      regions: sanitizedRegions,
      correct_points: Array.isArray(item.correct_points) ? item.correct_points.map(String) : (item.correct_points ? [String(item.correct_points)] : []),
      missing_points: Array.isArray(item.missing_points) ? item.missing_points.map(String) : (item.missing_points ? [String(item.missing_points)] : []),
      incorrect_points: Array.isArray(item.incorrect_points) ? item.incorrect_points.map(String) : (item.incorrect_points ? [String(item.incorrect_points)] : []),
      icai_reference: item.icai_reference ? String(item.icai_reference) : 'ICAI CA Foundation Study Material',
      feedback: isUnclear
        ? 'Could not confidently read this answer - please retype it in the text form Column instead'
        : (item.feedback ? String(item.feedback) : 'Evaluation completed.')
    };
  });

  return sanitizedEvaluations;
}

/**
 * POST /api/evaluate-image
 * Body: { subject, max_marks, question_text, question_images: [], answer_images: [] }
 */
router.post('/evaluate-image', async (req, res) => {
  try {
    const { subject, max_marks, question_text, question_images = [], answer_images = [] } = req.body;

    // Validate requirements
    if (!answer_images || !Array.isArray(answer_images) || answer_images.length === 0) {
      return res.status(400).json({
        error: 'Please upload at least one image of the student answer sheet.'
      });
    }

    if ((!question_images || question_images.length === 0) && (!question_text || !question_text.trim())) {
      return res.status(400).json({
        error: 'Please provide either question paper image(s) or question text.'
      });
    }

    const parsedMaxMarks = Number(max_marks) || 5;

    // Determine API Key
    const apiKey = (
      req.headers['x-gemini-api-key'] ||
      req.headers['x-anthropic-api-key'] ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();

    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API Key is missing. Please configure it in backend/.env or UI settings.',
        code: 'MISSING_API_KEY'
      });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const ai = new GoogleGenAI({ apiKey });

    // Build Multimodal Contents
    const systemPrompt = buildImageSystemPrompt();
    const userPromptText = buildImageUserPrompt({
      subject: subject || 'Business Laws',
      question_text,
      max_marks: parsedMaxMarks
    });

    const contents = [];
    contents.push({ text: userPromptText });

    // Attach Question Paper Images if provided
    if (Array.isArray(question_images) && question_images.length > 0) {
      contents.push({ text: '\n--- QUESTION PAPER IMAGES ---' });
      question_images.forEach((img, idx) => {
        contents.push({ text: `Question Paper Image #${idx + 1}:` });
        contents.push(formatInlineData(img));
      });
    }

    // Attach Answer Sheet Images
    contents.push({ text: '\n--- STUDENT HANDWRITTEN ANSWER SHEET IMAGES (In page order) ---' });
    answer_images.forEach((img, idx) => {
      contents.push({ text: `Answer Sheet Page #${idx + 1}:` });
      contents.push(formatInlineData(img));
    });

    // Call Gemini multimodal model
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const rawResponseText = response.text || '';

    try {
      const evaluations = parseImageGeminiJson(rawResponseText, parsedMaxMarks);

      // Save answer images to disk
      const savedImagePaths = [];
      try {
        answer_images.forEach((img, idx) => {
          let rawData = typeof img === 'string' ? img : (img.data || img.url || '');
          let ext = 'jpg';
          if (rawData.includes('data:image/png')) ext = 'png';
          if (rawData.includes('data:image/webp')) ext = 'webp';

          if (rawData.includes(';base64,')) {
            rawData = rawData.split(';base64,')[1];
          }
          rawData = rawData.replace(/\s/g, '');

          const filename = `ans_${Date.now()}_${idx + 1}.${ext}`;
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, Buffer.from(rawData, 'base64'));

          savedImagePaths.push(`/uploads/results/${filename}`);
        });
      } catch (imgSaveErr) {
        console.error('Failed to save answer image files to disk:', imgSaveErr);
      }

      // Calculate aggregated marks & points across all evaluated questions
      let totalMarksAwarded = 0;
      let totalMaxMarks = 0;
      const primaryQuestionText = (question_text && question_text.trim()) || evaluations[0]?.question_text || 'Handwritten Answer Sheet Evaluation';
      
      let allCorrectPoints = [];
      let allMissingPoints = [];
      let allIncorrectPoints = [];
      let primaryReference = 'ICAI CA Foundation Study Material';
      let primaryFeedback = '';

      evaluations.forEach((item) => {
        totalMarksAwarded += Number(item.marks_awarded) || 0;
        totalMaxMarks += Number(item.max_marks) || parsedMaxMarks;
        if (Array.isArray(item.correct_points)) allCorrectPoints.push(...item.correct_points);
        if (Array.isArray(item.missing_points)) allMissingPoints.push(...item.missing_points);
        if (Array.isArray(item.incorrect_points)) allIncorrectPoints.push(...item.incorrect_points);
        if (item.icai_reference) primaryReference = item.icai_reference;
        if (item.feedback && !primaryFeedback) primaryFeedback = item.feedback;
      });

      if (totalMaxMarks === 0) totalMaxMarks = parsedMaxMarks;

      // Save result to database if user authenticated
      let savedTestId = null;
      if (req.user && req.user.id) {
        try {
          const dbRes = await runQuery(
            `INSERT INTO test_results (
               user_id, subject, question, max_marks, marks_awarded,
               correct_points, missing_points, incorrect_points, icai_reference, feedback,
               evaluations_json, annotated_image_path, eval_type
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'image')`,
            [
              req.user.id,
              subject || 'Business Laws',
              primaryQuestionText,
              totalMaxMarks,
              totalMarksAwarded,
              JSON.stringify(allCorrectPoints),
              JSON.stringify(allMissingPoints),
              JSON.stringify(allIncorrectPoints),
              primaryReference,
              primaryFeedback || 'Image evaluation completed.',
              JSON.stringify(evaluations),
              JSON.stringify(savedImagePaths)
            ]
          );
          savedTestId = dbRes.lastID;
        } catch (dbErr) {
          console.error('Failed to save image evaluation result to DB:', dbErr);
        }
      }

      return res.json({
        success: true,
        test_id: savedTestId,
        subject: subject || 'Business Laws',
        max_marks: parsedMaxMarks,
        evaluations: evaluations,
        evaluation: evaluations[0] || null, // First evaluation item for single-question view compatibility
        saved_image_paths: savedImagePaths,
        usage: response.usageMetadata || null
      });
    } catch (parseErr) {
      console.error('Failed to parse Gemini image evaluation response:', rawResponseText, parseErr);
      return res.status(502).json({
        error: 'Failed to parse AI evaluation from handwritten answer images.',
        details: parseErr.message,
        raw_output: rawResponseText
      });
    }

  } catch (error) {
    console.error('Error during image-based CA evaluation:', error);
    const errorMsg = error.message || '';

    if (
      error.status === 400 && (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) ||
      error.status === 401 ||
      error.status === 403 ||
      errorMsg.includes('PERMISSION_DENIED')
    ) {
      return res.status(401).json({
        error: 'Invalid Gemini API Key. Please verify your API key in backend/.env or UI settings.',
        code: 'INVALID_API_KEY'
      });
    }

    if (error.status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
      return res.status(429).json({
        error: 'Gemini API rate limit exceeded or quota exhausted. Please try again shortly.',
        code: 'RATE_LIMIT'
      });
    }

    return res.status(500).json({
      error: error.message || 'An error occurred while evaluating the uploaded images.',
      details: error.stack || null
    });
  }
});

export default router;
