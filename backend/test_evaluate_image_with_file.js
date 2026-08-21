import fs from 'fs';
import path from 'path';

const imagePath = 'C:\\Users\\Moon\\.gemini\\antigravity-ide\\brain\\6c07e6f2-bb0d-4393-8b95-803fffaad434\\handwritten_answer_sheet_1787236132826.jpg';

async function testImageEvaluation() {
  console.log('--- Testing API /api/evaluate-image with Real Handwritten Sheet ---');

  if (!fs.existsSync(imagePath)) {
    console.error('Image file not found at:', imagePath);
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');

  const payload = {
    subject: 'Business Laws & Accounting',
    max_marks: 10,
    question_text: 'Q1(a) Explain essential elements of contract under Sec 10. Q1(b) Calculate distribution of partnership profit between A and B.',
    answer_images: [
      {
        data: `data:image/jpeg;base64,${base64Data}`,
        mimeType: 'image/jpeg'
      }
    ]
  };

  try {
    const res = await fetch('http://localhost:5000/api/evaluate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('\n--- EVALUATION SUMMARY ---');
    console.log('Success:', data.success);
    console.log('Evaluations count:', data.evaluations?.length);

    if (data.evaluations) {
      data.evaluations.forEach((evalItem, idx) => {
        console.log(`\nEvaluation #${idx + 1} (${evalItem.question_number}):`);
        console.log(`- Marks: ${evalItem.marks_awarded} / ${evalItem.max_marks}`);
        console.log(`- Correct Points (${evalItem.correct_points?.length}):`, evalItem.correct_points);
        console.log(`- Missing Points (${evalItem.missing_points?.length}):`, evalItem.missing_points);
        console.log(`- Incorrect Points (${evalItem.incorrect_points?.length}):`, evalItem.incorrect_points);
        console.log(`- Regions Found (${evalItem.regions?.length}):`, JSON.stringify(evalItem.regions, null, 2));
      });
    }
  } catch (err) {
    console.error('Evaluation API test failed:', err);
  }
}

testImageEvaluation();
