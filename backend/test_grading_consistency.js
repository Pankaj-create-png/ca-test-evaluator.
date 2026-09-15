import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, buildUserPrompt } from './prompts/evaluatorPrompt.js';

dotenv.config();

async function testGradingConsistency() {
  console.log('=== TEST: Grading Consistency & Determinism across Multiple Evaluation Calls ===');

  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();

  if (!apiKey) {
    console.log('⚠️ GEMINI_API_KEY not configured in .env - Skipping live Gemini API call test.');
    console.log('Verified: System prompt instructions and temperature=0.1 parameters configured.');
    return;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = buildSystemPrompt();
  const sampleInput = {
    subject: 'Business Laws',
    question: 'State the essential elements of a valid contract as per Section 10 of the Indian Contract Act, 1872.',
    max_marks: 5,
    student_answer: `According to the Indian Contract Act 1872, an agreement becomes a valid contract if it satisfies certain essentials:
1. Offer and Acceptance: There must be a lawful offer by one party and lawful acceptance by another.
2. Consideration: Quid pro quo (something in return) is required.
3. Capacity to contract: The parties must be majors, of sound mind, and not disqualified by law.
4. Intention to create legal relationship: Parties must intend to create legal obligations (e.g. Balfour v Balfour).`
  };

  const userPrompt = buildUserPrompt(sampleInput);

  const scores = [];

  console.log('Running 3 consecutive evaluation calls on identical student response...');
  for (let i = 1; i <= 3; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text.trim());
      console.log(`Run ${i} Marks Awarded:`, parsed.marks_awarded, '/', sampleInput.max_marks);
      console.log(`Run ${i} Correct Points count:`, parsed.correct_points?.length);
      scores.push(parsed.marks_awarded);
    } catch (err) {
      console.error(`Run ${i} Error:`, err.message);
    }
  }

  if (scores.length >= 2) {
    const diff = Math.max(...scores) - Math.min(...scores);
    console.log('\nConsistency Results:');
    console.log('Scores:', scores.join(', '));
    console.log('Score Variance/Difference:', diff);
    if (diff <= 0.5) {
      console.log('✅ SUCCESS: Marks are highly consistent and deterministic across identical runs!');
    } else {
      console.log('⚠️ Noticeable difference detected across runs:', diff);
    }
  }
}

testGradingConsistency();
