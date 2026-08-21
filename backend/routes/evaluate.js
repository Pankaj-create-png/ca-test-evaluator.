import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/evaluatorPrompt.js';
import { runQuery } from '../db/database.js';

const router = Router();

/**
 * Extracts and parses JSON from Gemini's response text,
 * handling potential markdown wrapping or text artifacts.
 */
function parseGeminiJson(text) {
  if (!text) {
    throw new Error('Empty response received from Gemini API.');
  }

  let cleaned = text.trim();

  // Strip markdown code fences if wrapped
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Locate the first { and last } to isolate the JSON object if any leading/trailing text exists
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);

  // Validate and normalize fields
  return {
    marks_awarded: typeof parsed.marks_awarded === 'number' ? parsed.marks_awarded : parseFloat(parsed.marks_awarded) || 0,
    correct_points: Array.isArray(parsed.correct_points) ? parsed.correct_points : (parsed.correct_points ? [String(parsed.correct_points)] : []),
    missing_points: Array.isArray(parsed.missing_points) ? parsed.missing_points : (parsed.missing_points ? [String(parsed.missing_points)] : []),
    incorrect_points: Array.isArray(parsed.incorrect_points) ? parsed.incorrect_points : (parsed.incorrect_points ? [String(parsed.incorrect_points)] : []),
    icai_reference: parsed.icai_reference ? String(parsed.icai_reference) : 'ICAI CA Foundation Study Material',
    feedback: parsed.feedback ? String(parsed.feedback) : 'Evaluation completed.'
  };
}

/**
 * POST /api/evaluate
 * Body: { subject, question, max_marks, student_answer }
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { subject, question, max_marks, student_answer } = req.body;

    // Validate inputs
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required and must be a valid CA Foundation paper.' });
    }
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question text is required.' });
    }
    if (!student_answer || typeof student_answer !== 'string' || !student_answer.trim()) {
      return res.status(400).json({ error: 'Student answer is required.' });
    }

    const parsedMaxMarks = Number(max_marks);
    if (isNaN(parsedMaxMarks) || parsedMaxMarks <= 0) {
      return res.status(400).json({ error: 'Max marks must be a positive number.' });
    }

    // Determine API Key (from header if provided from UI, or environment variable)
    const apiKey = (
      req.headers['x-gemini-api-key'] ||
      req.headers['x-anthropic-api-key'] ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();

    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API Key is missing. Please add GEMINI_API_KEY in backend/.env or configure it in the UI settings.',
        code: 'MISSING_API_KEY'
      });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    // Initialize Google GenAI client
    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      subject: subject.trim(),
      question: question.trim(),
      max_marks: parsedMaxMarks,
      student_answer: student_answer.trim()
    });

    // Call Gemini generateContent API
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const rawResponseText = response.text || '';

    try {
      const evaluationResult = parseGeminiJson(rawResponseText);
      // Ensure marks awarded doesn't exceed max marks or fall below 0
      evaluationResult.marks_awarded = Math.min(
        Math.max(0, evaluationResult.marks_awarded),
        parsedMaxMarks
      );

      // Save result to database if user authenticated
      let savedTestId = null;
      if (req.user && req.user.id) {
        try {
          const dbRes = await runQuery(
            `INSERT INTO test_results (user_id, subject, question, max_marks, marks_awarded, correct_points, missing_points, incorrect_points, icai_reference, feedback, eval_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'text')`,
            [
              req.user.id,
              subject.trim(),
              question.trim(),
              parsedMaxMarks,
              evaluationResult.marks_awarded,
              JSON.stringify(evaluationResult.correct_points || []),
              JSON.stringify(evaluationResult.missing_points || []),
              JSON.stringify(evaluationResult.incorrect_points || []),
              evaluationResult.icai_reference || '',
              evaluationResult.feedback || ''
            ]
          );
          savedTestId = dbRes.lastID;
        } catch (dbErr) {
          console.error('Failed to save typed evaluation result to DB:', dbErr);
        }
      }

      return res.json({
        success: true,
        test_id: savedTestId,
        subject,
        max_marks: parsedMaxMarks,
        evaluation: evaluationResult,
        usage: response.usageMetadata || null
      });
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON response:', rawResponseText, parseErr);
      return res.status(502).json({
        error: 'Failed to parse AI evaluation into the expected ICAI evaluation format.',
        details: parseErr.message,
        raw_output: rawResponseText
      });
    }
  } catch (error) {
    console.error('Error during CA evaluation:', error);

    const errorMsg = error.message || '';

    // Handle Gemini-specific API errors
    if (
      error.status === 400 && (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) ||
      error.status === 401 ||
      error.status === 403 ||
      errorMsg.includes('PERMISSION_DENIED') ||
      errorMsg.includes('API_KEY_INVALID')
    ) {
      return res.status(401).json({
        error: 'Invalid Gemini API Key. Please verify your API key in backend/.env or the UI settings.',
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
      error: error.message || 'An unexpected error occurred while evaluating the answer.',
      details: error.stack || null
    });
  }
});

export default router;
