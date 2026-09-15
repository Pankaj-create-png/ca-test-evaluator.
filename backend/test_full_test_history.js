import { runQuery, allQuery } from './db/database.js';

async function testFullTestHistoryPersistence() {
  console.log('=== TEST: Full Test Paper History Persistence & Verification ===');

  try {
    // 1. Create dummy user if needed
    const dummyUserEmail = `fulltest_user_${Date.now()}@test.com`;
    const userRes = await runQuery(
      `INSERT INTO users (name, email, hashed_password) VALUES (?, ?, ?)`,
      ['Test Student', dummyUserEmail, 'hashedpass123']
    );
    const userId = userRes.lastID;
    console.log('1. Created Test User ID:', userId);

    // 2. Insert Full Test Result into test_results
    const sampleEvaluations = [
      {
        question_number: 'Q1(a)',
        question_text: 'State the essential elements of a valid contract under Section 10 of the Indian Contract Act, 1872.',
        max_marks: 10,
        marks_awarded: 8.5,
        handwriting_transcription: '1. Offer and acceptance. 2. Lawful consideration. 3. Capacity of parties...',
        unclear_handwriting: false,
        location: { page: 1, position: 'Top of Page 1' },
        regions: [{ type: 'missing', page: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.1, note: 'Omitted Section 14 Free Consent' }],
        correct_points: ['Identified offer and acceptance', 'Stated lawful consideration', 'Stated capacity of parties'],
        missing_points: ['Omitted explicit reference to Section 14 Free Consent'],
        incorrect_points: [],
        icai_reference: 'ICAI Study Material: Paper 2 Business Laws, Chapter 1, Unit 1',
        feedback: 'Good legal foundation. Include Section 14 to secure full 10 marks.'
      },
      {
        question_number: 'Q1(b)',
        question_text: 'Explain the doctrine of Caveat Emptor under the Sale of Goods Act, 1930.',
        max_marks: 10,
        marks_awarded: 7.0,
        handwriting_transcription: 'Caveat Emptor means let the buyer beware...',
        unclear_handwriting: false,
        location: { page: 2, position: 'Middle of Page 2' },
        regions: [],
        correct_points: ['Correctly defined doctrine of Caveat Emptor', 'Stated general rule'],
        missing_points: ['Missed statutory exception under Section 16(1) regarding fitness for purpose'],
        incorrect_points: [],
        icai_reference: 'ICAI Study Material: Paper 2 Business Laws, Chapter 2',
        feedback: 'Satisfactory explanation. Ensure statutory exceptions are listed.'
      }
    ];

    const sampleImages = ['/uploads/results/ans_full_test1.jpg', '/uploads/results/ans_full_test2.jpg'];

    const insertRes = await runQuery(
      `INSERT INTO test_results (
         user_id, subject, question, max_marks, marks_awarded,
         correct_points, missing_points, incorrect_points, icai_reference, feedback,
         evaluations_json, annotated_image_path, eval_type
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'full_test')`,
      [
        userId,
        'Business Laws',
        'Full Test Paper Evaluation (2 Questions)',
        20,
        15.5,
        JSON.stringify(['Identified offer and acceptance', 'Correctly defined doctrine of Caveat Emptor']),
        JSON.stringify(['Omitted Section 14 Free Consent', 'Missed statutory exception under Section 16(1)']),
        JSON.stringify([]),
        'ICAI Study Material: Paper 2 Business Laws',
        'Full test paper evaluation completed across 2 questions. Total Score: 15.5/20 (78%).',
        JSON.stringify(sampleEvaluations),
        JSON.stringify(sampleImages)
      ]
    );

    console.log('2. Inserted Full Test Result ID:', insertRes.lastID);

    // 3. Query DB to verify stored record
    const rows = await allQuery(
      `SELECT * FROM test_results WHERE id = ? AND user_id = ?`,
      [insertRes.lastID, userId]
    );

    if (rows.length === 0) {
      throw new Error('Inserted test result not found!');
    }

    const row = rows[0];
    const retrievedEvaluations = JSON.parse(row.evaluations_json);
    const retrievedImages = JSON.parse(row.annotated_image_path);

    console.log('\n3. Verification Results:');
    console.log('- Record ID:', row.id);
    console.log('- User ID:', row.user_id);
    console.log('- Subject:', row.subject);
    console.log('- Question Field:', row.question);
    console.log('- Max Marks:', row.max_marks);
    console.log('- Marks Awarded:', row.marks_awarded);
    console.log('- Eval Type:', row.eval_type);
    console.log('- Evaluations count:', retrievedEvaluations.length);
    console.log('- Q1 Number:', retrievedEvaluations[0].question_number, 'Score:', retrievedEvaluations[0].marks_awarded, '/', retrievedEvaluations[0].max_marks);
    console.log('- Q2 Number:', retrievedEvaluations[1].question_number, 'Score:', retrievedEvaluations[1].marks_awarded, '/', retrievedEvaluations[1].max_marks);
    console.log('- Saved Image Paths count:', retrievedImages.length);

    console.log('\n✅ TEST PASSED: Full test paper evaluations correctly saved and retrieved from DB.');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
  }
}

testFullTestHistoryPersistence();
