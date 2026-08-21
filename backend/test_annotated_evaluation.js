import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { buildImageSystemPrompt, buildImageUserPrompt } from './prompts/imageEvaluatorPrompt.js';
import { Router } from 'express';

dotenv.config();

// Create sample handwritten SVG answer sheet
const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="#fdfbf7"/>
  <line x1="100" y1="0" x2="100" y2="1000" stroke="#f87171" stroke-width="2"/>
  <line x1="0" y1="120" x2="800" y2="120" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="0" y1="200" x2="800" y2="200" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="0" y1="280" x2="800" y2="280" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="0" y1="360" x2="800" y2="360" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="0" y1="440" x2="800" y2="440" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="0" y1="520" x2="800" y2="520" stroke="#cbd5e1" stroke-width="1"/>
  
  <text x="120" y="100" font-family="sans-serif" font-weight="bold" font-size="28" fill="#1e293b">CA Foundation Paper 3 - Q1 Answer</text>
  <text x="120" y="180" font-family="sans-serif" font-size="24" fill="#1e293b">1. Principal (P) = Rs 10,000, Rate (R) = 5% p.a., Time (T) = 2 yrs</text>
  <text x="120" y="260" font-family="sans-serif" font-size="24" fill="#1e293b">2. Simple Interest (SI) = (P * R * T) / 100</text>
  <text x="120" y="340" font-family="sans-serif" font-size="24" fill="#1e293b">3. SI = (10000 * 5 * 2) / 100 = Rs 900</text>
  <text x="120" y="420" font-family="sans-serif" font-size="24" fill="#1e293b">4. Total Amount payable = 10,000 + 900 = Rs 10,900</text>
  <text x="120" y="500" font-family="sans-serif" font-size="24" fill="#1e293b">5. Conclusion: Interest calculation is completed.</text>
</svg>`;

const svgBase64 = Buffer.from(sampleSvg).toString('base64');

async function testGeminiRegions() {
  console.log('--- Testing Gemini Evaluation with Bounding Regions ---');
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('No Gemini API Key found in .env');
    return;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = buildImageSystemPrompt();
  const userPrompt = buildImageUserPrompt({
    subject: 'Quantitative Aptitude',
    question_text: 'Calculate Simple Interest and Total Amount for Principal Rs 10,000 at 5% p.a. for 2 years.',
    max_marks: 5
  });

  const contents = [
    { text: userPrompt },
    { text: '\n--- STUDENT HANDWRITTEN ANSWER SHEET IMAGES ---' },
    { text: 'Answer Sheet Page #1:' },
    {
      inlineData: {
        mimeType: 'image/svg+xml',
        data: svgBase64
      }
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    console.log('\n--- RAW GEMINI RESPONSE ---');
    console.log(response.text);

    const parsed = JSON.parse(response.text);
    console.log('\n--- PARSED EVALUATIONS ---');
    console.dir(parsed, { depth: null });

    if (parsed.evaluations && parsed.evaluations[0]?.regions) {
      console.log('\n✅ SUCCESSFULLY EXTRACTED REGIONS:');
      console.log(parsed.evaluations[0].regions);
    } else {
      console.log('\n⚠️ No regions extracted in output object.');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

testGeminiRegions();
