import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildFullTestSystemPrompt, buildFullTestUserPrompt } from '../prompts/fullTestEvaluatorPrompt.js';
import { runQuery } from '../db/database.js';
import { processAndFlattenPdfFiles } from '../utils/pdfConverter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/results');

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

  rawData = rawData.replace(/\s/g, '');

  return {
    inlineData: {
      mimeType: mimeType || 'image/jpeg',
      data: rawData
    }
  };
}

/**
 * Parses and sanitizes JSON response from Gemini for full test paper evaluation.
 */
function parseFullTestGeminiJson(text) {
  if (!text) {
    throw new Error('Empty response received from Gemini API for full test paper.');
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
  let overallFeedback = '';

  if (parsed.summary && parsed.summary.overall_feedback) {
    overallFeedback = String(parsed.summary.overall_feedback);
  }

  if (Array.isArray(parsed.evaluations)) {
    rawList = parsed.evaluations;
  } else if (Array.isArray(parsed)) {
    rawList = parsed;
  } else {
    rawList = [parsed];
  }

  const sanitizedEvaluations = rawList.map((item, idx) => {
    // Max marks per question can go up to 100
    const rawMax = typeof item.max_marks === 'number' ? item.max_marks : (parseFloat(item.max_marks) || 10);
    const maxM = Math.min(Math.max(1, rawMax), 100);

    const rawAw = typeof item.marks_awarded === 'number' ? item.marks_awarded : (parseFloat(item.marks_awarded) || 0);
    const marksAw = Math.min(Math.max(0, rawAw), maxM);

    const isUnclear = Boolean(
      item.unclear_handwriting ||
      (item.feedback && item.feedback.toLowerCase().includes('could not confidently read'))
    );

    const rawRegions = Array.isArray(item.regions) ? item.regions : [];
    const sanitizedRegions = rawRegions
      .map((r) => {
        if (!r || typeof r !== 'object') return null;
        const page = parseInt(r.page, 10) || 1;
        const x = parseFloat(r.x);
        const y = parseFloat(r.y);
        const width = parseFloat(r.width);
        const height = parseFloat(r.height);

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
      question_text: item.question_text ? String(item.question_text) : `Question ${idx + 1}`,
      max_marks: maxM,
      marks_awarded: isUnclear ? 0 : marksAw,
      handwriting_transcription: item.handwriting_transcription ? String(item.handwriting_transcription) : '',
      unclear_handwriting: isUnclear,
      location: {
        page: item.location?.page ? parseInt(item.location.page, 10) : 1,
        position: item.location?.position ? String(item.location.position) : `Answer Sheet Page ${item.location?.page || 1}`
      },
      regions: sanitizedRegions,
      correct_points: Array.isArray(item.correct_points) ? item.correct_points.map(String) : (item.correct_points ? [String(item.correct_points)] : []),
      missing_points: Array.isArray(item.missing_points) ? item.missing_points.map(String) : (item.missing_points ? [String(item.missing_points)] : []),
      incorrect_points: Array.isArray(item.incorrect_points) ? item.incorrect_points.map(String) : (item.incorrect_points ? [String(item.incorrect_points)] : []),
      icai_reference: item.icai_reference ? String(item.icai_reference) : 'ICAI CA Foundation Study Material',
      feedback: isUnclear
        ? 'Could not confidently read this answer - please retype it in the text form Column instead'
        : (item.feedback ? String(item.feedback) : 'Question evaluation completed.')
    };
  });

  return {
    evaluations: sanitizedEvaluations,
    overall_feedback: overallFeedback
  };
}

/**
 * POST /api/evaluate-full-test
 * Body: { subject, question_text, question_images: [], answer_images: [] }
 */
router.post('/evaluate-full-test', async (req, res) => {
  try {
    const { subject, question_text, question_images = [], answer_images = [] } = req.body;

    if (!answer_images || !Array.isArray(answer_images) || answer_images.length === 0) {
      return res.status(400).json({
        error: 'Please upload at least one image of the student answer sheet for the test paper.'
      });
    }

    if ((!question_images || question_images.length === 0) && (!question_text || !question_text.trim())) {
      return res.status(400).json({
        error: 'Please upload question paper image(s) or provide question details.'
      });
    }

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

    // Process and flatten any PDF files into individual page images
    const processedQuestionImages = await processAndFlattenPdfFiles(question_images);
    const processedAnswerImages = await processAndFlattenPdfFiles(answer_images);

    const systemPrompt = buildFullTestSystemPrompt();
    const userPromptText = buildFullTestUserPrompt({
      subject: subject || 'Business Laws',
      question_text
    });

    const contents = [];
    contents.push({ text: userPromptText });

    if (Array.isArray(processedQuestionImages) && processedQuestionImages.length > 0) {
      contents.push({ text: '\n--- QUESTION PAPER IMAGES / PAGES ---' });
      processedQuestionImages.forEach((img, idx) => {
        contents.push({ text: `Question Paper Page #${idx + 1}:` });
        contents.push(formatInlineData(img));
      });
    }

    contents.push({ text: '\n--- STUDENT HANDWRITTEN ANSWER SHEET IMAGES / PAGES (In page order) ---' });
    processedAnswerImages.forEach((img, idx) => {
      contents.push({ text: `Answer Sheet Page #${idx + 1}:` });
      contents.push(formatInlineData(img));
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const rawResponseText = response.text || '';

    try {
      const parsedResult = parseFullTestGeminiJson(rawResponseText);
      const evaluations = parsedResult.evaluations;
      const overallFeedback = parsedResult.overall_feedback;

      // Save answer images to disk
      const savedImagePaths = [];
      try {
        processedAnswerImages.forEach((img, idx) => {
          let rawData = typeof img === 'string' ? img : (img.data || img.url || '');
          let ext = 'jpg';
          if (rawData.includes('data:image/png')) ext = 'png';
          if (rawData.includes('data:image/webp')) ext = 'webp';

          if (rawData.includes(';base64,')) {
            rawData = rawData.split(';base64,')[1];
          }
          rawData = rawData.replace(/\s/g, '');

          const filename = `ans_full_${Date.now()}_${idx + 1}.${ext}`;
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, Buffer.from(rawData, 'base64'));

          savedImagePaths.push(`/uploads/results/${filename}`);
        });
      } catch (imgSaveErr) {
        console.error('Failed to save full test answer images to disk:', imgSaveErr);
      }

      // Calculate total test metrics (uncapped total max marks)
      let totalMarksAwarded = 0;
      let totalMaxMarks = 0;
      let allCorrectPoints = [];
      let allMissingPoints = [];
      let allIncorrectPoints = [];
      let primaryReference = 'ICAI CA Foundation Study Material';

      evaluations.forEach((item) => {
        totalMarksAwarded += Number(item.marks_awarded) || 0;
        totalMaxMarks += Number(item.max_marks) || 0;
        if (Array.isArray(item.correct_points)) allCorrectPoints.push(...item.correct_points);
        if (Array.isArray(item.missing_points)) allMissingPoints.push(...item.missing_points);
        if (Array.isArray(item.incorrect_points)) allIncorrectPoints.push(...item.incorrect_points);
        if (item.icai_reference && primaryReference === 'ICAI CA Foundation Study Material') {
          primaryReference = item.icai_reference;
        }
      });

      if (totalMaxMarks === 0) totalMaxMarks = 100;
      const percentage = Math.round((totalMarksAwarded / totalMaxMarks) * 100);

      const paperSummaryFeedback = overallFeedback || `Full test paper evaluation completed across ${evaluations.length} questions. Total Score: ${totalMarksAwarded}/${totalMaxMarks} (${percentage}%).`;

      // Save single result to database if user authenticated
      let savedTestId = null;
      if (req.user && req.user.id) {
        try {
          const dbRes = await runQuery(
            `INSERT INTO test_results (
               user_id, subject, question, max_marks, marks_awarded,
               correct_points, missing_points, incorrect_points, icai_reference, feedback,
               evaluations_json, annotated_image_path, eval_type
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'full_test')`,
            [
              req.user.id,
              subject || 'Business Laws',
              `Full Test Paper Evaluation (${evaluations.length} Questions)`,
              totalMaxMarks,
              totalMarksAwarded,
              JSON.stringify(allCorrectPoints),
              JSON.stringify(allMissingPoints),
              JSON.stringify(allIncorrectPoints),
              primaryReference,
              paperSummaryFeedback,
              JSON.stringify(evaluations),
              JSON.stringify(savedImagePaths)
            ]
          );
          savedTestId = dbRes.lastID;
        } catch (dbErr) {
          console.error('Failed to save full test evaluation result to DB:', dbErr);
        }
      }

      return res.json({
        success: true,
        test_id: savedTestId,
        eval_type: 'full_test',
        subject: subject || 'Business Laws',
        total_max_marks: totalMaxMarks,
        total_marks_awarded: totalMarksAwarded,
        percentage: percentage,
        overall_feedback: paperSummaryFeedback,
        evaluations: evaluations,
        evaluation: evaluations[0] || null,
        saved_image_paths: savedImagePaths,
        usage: response.usageMetadata || null
      });

    } catch (parseErr) {
      console.error('Failed to parse Gemini full test evaluation response:', rawResponseText, parseErr);
      return res.status(502).json({
        error: 'Failed to parse AI evaluation for full test paper.',
        details: parseErr.message,
        raw_output: rawResponseText
      });
    }

  } catch (error) {
    console.error('Error during full test paper evaluation:', error);
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
      error: error.message || 'An error occurred while evaluating the full test paper.',
      details: error.stack || null
    });
  }
});

export default router;
