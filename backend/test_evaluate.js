// Direct test script for /api/evaluate endpoint validation

async function runTests() {
  console.log('--- TEST 1: Health Check ---');
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthData = await healthRes.json();
    console.log('Health Response:', healthData);
  } catch (e) {
    console.error('Health Check failed:', e);
  }

  console.log('\n--- TEST 2: Missing Fields Validation ---');
  try {
    const res = await fetch('http://localhost:5000/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Data:', data);
  } catch (e) {
    console.error('Validation test failed:', e);
  }

  console.log('\n--- TEST 3: Missing Gemini API Key Check ---');
  try {
    const res = await fetch('http://localhost:5000/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Business Laws',
        question: 'State the essential elements of a valid contract.',
        max_marks: 5,
        student_answer: 'A valid contract needs offer, acceptance, consideration...'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Data:', data);
  } catch (e) {
    console.error('API key check failed:', e);
  }
}

runTests();
