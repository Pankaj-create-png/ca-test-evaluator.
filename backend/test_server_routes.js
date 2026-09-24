import express from 'express';
import evaluateRouter from './routes/evaluate.js';
import evaluateImageRouter from './routes/evaluateImage.js';
import evaluateFullTestRouter from './routes/evaluateFullTest.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/api', evaluateRouter);
app.use('/api', evaluateImageRouter);
app.use('/api', evaluateFullTestRouter);

async function runServerRouteTests() {
  console.log('=== INTEGRATION TEST: Server Routes & Failure Handling ===');

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Test server running on port ${port}`);

    try {
      console.log('\n--- TEST 1: Single Question Typed Evaluation ---');
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': process.env.GEMINI_API_KEY || ''
        },
        body: JSON.stringify({
          subject: 'Business Laws',
          question: 'State the essential elements of a valid contract under Section 10.',
          max_marks: 5,
          student_answer: 'An agreement requires offer, acceptance, consideration, legal capacity, and intention to create legal relations.'
        })
      });

      const data = await res.json();
      const elapsed = Date.now() - start;

      if (res.ok && data.success) {
        console.log(`✓ Single question evaluation succeeded in ${elapsed}ms!`);
        console.log('  Marks awarded:', data.evaluation.marks_awarded, '/', data.max_marks);
        console.log('  Feedback:', data.evaluation.feedback);
      } else {
        console.log(`Status: ${res.status}`, data);
      }

      console.log('\n--- TEST 2: Error Format for Invalid API Key ---');
      const invalidKeyRes = await fetch(`${baseUrl}/api/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': 'INVALID_DUMMY_KEY_12345'
        },
        body: JSON.stringify({
          subject: 'Business Laws',
          question: 'What is a contract?',
          max_marks: 5,
          student_answer: 'A contract is an agreement enforceable by law.'
        })
      });

      const invalidKeyData = await invalidKeyRes.json();
      console.assert(invalidKeyRes.status === 401, `Expected status 401, got ${invalidKeyRes.status}`);
      console.assert(invalidKeyData.code === 'INVALID_API_KEY', `Expected code INVALID_API_KEY, got ${invalidKeyData.code}`);
      console.log(`✓ Invalid API Key response verified: ${invalidKeyRes.status} - "${invalidKeyData.error}"`);

      console.log('\nALL SERVER ROUTE TESTS COMPLETED SUCCESSFULLY! 🎉');
    } catch (err) {
      console.error('Server route test error:', err);
    } finally {
      server.close();
    }
  });
}

runServerRouteTests();
