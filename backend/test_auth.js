async function runAuthTests() {
  console.log('--- TEST 1: Unauthenticated call to /api/evaluate ---');
  try {
    const res = await fetch('http://localhost:5000/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'test', student_answer: 'test' })
    });
    const data = await res.json();
    console.log('Status (expected 401):', res.status, 'Response:', data);
  } catch (err) {
    console.error('Test 1 failed:', err);
  }

  const testEmail = `student_${Date.now()}@ca-student.com`;
  const testPassword = 'SecretPassword123!';
  const testName = 'Rohan Gupta';

  console.log('\n--- TEST 2: User Signup ---');
  let userToken = null;
  try {
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword
      })
    });
    const data = await res.json();
    console.log('Status (expected 201):', res.status, 'Response:', data);
    if (data.token) userToken = data.token;
  } catch (err) {
    console.error('Test 2 failed:', err);
  }

  console.log('\n--- TEST 3: Duplicate Signup Check ---');
  try {
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword
      })
    });
    const data = await res.json();
    console.log('Status (expected 400):', res.status, 'Response:', data);
  } catch (err) {
    console.error('Test 3 failed:', err);
  }

  console.log('\n--- TEST 4: User Login ---');
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const data = await res.json();
    console.log('Status (expected 200):', res.status, 'Response:', data);
    if (data.token) userToken = data.token;
  } catch (err) {
    console.error('Test 4 failed:', err);
  }

  console.log('\n--- TEST 5: Fetch Profile (/api/auth/me) with Token ---');
  try {
    const res = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    const data = await res.json();
    console.log('Status (expected 200):', res.status, 'Response:', data);
  } catch (err) {
    console.error('Test 5 failed:', err);
  }
}

runAuthTests();
