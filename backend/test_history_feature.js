import fs from 'fs';

async function testHistoryFeature() {
  console.log('--- TEST: End-to-End History & Evaluation Persistence ---');

  const testEmail = `history_student_${Date.now()}@ca-test.com`;
  const testPassword = 'Password123!';
  const testName = 'Priya Sharma';

  // 1. Signup user
  const signupRes = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
  });
  const signupData = await signupRes.json();
  const token = signupData.token;
  console.log('1. User Signup:', signupData.success ? 'SUCCESS' : 'FAILED', 'Token:', token ? 'Issued' : 'None');

  // 2. Perform Typed Evaluation
  const typedRes = await fetch('http://localhost:5000/api/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subject: 'Business Laws',
      question: 'State the essential elements of a valid contract per Section 10.',
      max_marks: 5,
      student_answer: 'Essentials of valid contract under Section 10: 1. Offer and Acceptance 2. Consideration 3. Capacity of parties.'
    })
  });
  const typedData = await typedRes.json();
  console.log('\n2. Typed Evaluation Saved to DB:', typedData.success ? 'SUCCESS' : 'FAILED', 'Test ID:', typedData.test_id);

  // 3. Fetch History
  const historyRes = await fetch('http://localhost:5000/api/history', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const historyData = await historyRes.json();
  console.log('\n3. Fetch History Results:');
  console.log('- Total tests returned:', historyData.results?.length);
  console.log('- Stats:', historyData.stats);
  if (historyData.results && historyData.results.length > 0) {
    console.log('- Latest Saved Item Subject:', historyData.results[0].subject);
    console.log('- Marks Awarded:', historyData.results[0].marks_awarded, '/', historyData.results[0].max_marks);
  }
}

testHistoryFeature();
