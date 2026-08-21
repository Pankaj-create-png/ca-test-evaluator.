import { Router } from 'express';
import { allQuery, getQuery, runQuery } from '../db/database.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/history
 * Returns all past test evaluation results for the logged-in user, sorted by most recent first,
 * along with performance statistics.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all test results for current user
    const rows = await allQuery(
      `SELECT * FROM test_results WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // Format & parse JSON fields for each record
    const formattedResults = rows.map((row) => {
      let correctPoints = [];
      let missingPoints = [];
      let incorrectPoints = [];
      let evaluations = null;
      let imagePaths = [];

      try {
        if (row.correct_points) correctPoints = JSON.parse(row.correct_points);
      } catch {}
      try {
        if (row.missing_points) missingPoints = JSON.parse(row.missing_points);
      } catch {}
      try {
        if (row.incorrect_points) incorrectPoints = JSON.parse(row.incorrect_points);
      } catch {}
      try {
        if (row.evaluations_json) evaluations = JSON.parse(row.evaluations_json);
      } catch {}
      try {
        if (row.annotated_image_path) {
          if (row.annotated_image_path.startsWith('[')) {
            imagePaths = JSON.parse(row.annotated_image_path);
          } else {
            imagePaths = [row.annotated_image_path];
          }
        }
      } catch {}

      const percentage = row.max_marks > 0 ? Math.round((row.marks_awarded / row.max_marks) * 100) : 0;

      return {
        id: row.id,
        user_id: row.user_id,
        subject: row.subject,
        question: row.question,
        max_marks: row.max_marks,
        marks_awarded: row.marks_awarded,
        percentage: percentage,
        correct_points: correctPoints,
        missing_points: missingPoints,
        incorrect_points: incorrectPoints,
        icai_reference: row.icai_reference,
        feedback: row.feedback,
        evaluations: evaluations,
        annotated_image_path: row.annotated_image_path,
        image_paths: imagePaths,
        eval_type: row.eval_type || 'text',
        created_at: row.created_at
      };
    });

    // Compute Summary Statistics
    const totalTests = formattedResults.length;
    let avgPercentage = 0;
    const subjectMap = {};

    if (totalTests > 0) {
      let totalEarned = 0;
      let totalPossible = 0;

      formattedResults.forEach((r) => {
        totalEarned += r.marks_awarded;
        totalPossible += r.max_marks;

        const sub = r.subject || 'General';
        if (!subjectMap[sub]) {
          subjectMap[sub] = {
            subject: sub,
            count: 0,
            earned: 0,
            possible: 0
          };
        }
        subjectMap[sub].count += 1;
        subjectMap[sub].earned += r.marks_awarded;
        subjectMap[sub].possible += r.max_marks;
      });

      avgPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    }

    const subjectStats = Object.values(subjectMap).map((s) => ({
      subject: s.subject,
      count: s.count,
      avg_percentage: s.possible > 0 ? Math.round((s.earned / s.possible) * 100) : 0
    }));

    return res.json({
      success: true,
      results: formattedResults,
      stats: {
        total_tests: totalTests,
        avg_percentage: avgPercentage,
        subject_stats: subjectStats
      }
    });

  } catch (err) {
    console.error('Fetch test history error:', err);
    return res.status(500).json({ error: 'Failed to retrieve test history.' });
  }
});

/**
 * GET /api/history/:id
 * Fetches a single test result record by ID for the logged-in user
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const testId = req.params.id;
    const userId = req.user.id;

    const row = await getQuery(
      `SELECT * FROM test_results WHERE id = ? AND user_id = ?`,
      [testId, userId]
    );

    if (!row) {
      return res.status(404).json({ error: 'Test result record not found.' });
    }

    let correctPoints = [];
    let missingPoints = [];
    let incorrectPoints = [];
    let evaluations = null;
    let imagePaths = [];

    try {
      if (row.correct_points) correctPoints = JSON.parse(row.correct_points);
    } catch {}
    try {
      if (row.missing_points) missingPoints = JSON.parse(row.missing_points);
    } catch {}
    try {
      if (row.incorrect_points) incorrectPoints = JSON.parse(row.incorrect_points);
    } catch {}
    try {
      if (row.evaluations_json) evaluations = JSON.parse(row.evaluations_json);
    } catch {}
    try {
      if (row.annotated_image_path) {
        if (row.annotated_image_path.startsWith('[')) {
          imagePaths = JSON.parse(row.annotated_image_path);
        } else {
          imagePaths = [row.annotated_image_path];
        }
      }
    } catch {}

    const percentage = row.max_marks > 0 ? Math.round((row.marks_awarded / row.max_marks) * 100) : 0;

    return res.json({
      success: true,
      result: {
        id: row.id,
        user_id: row.user_id,
        subject: row.subject,
        question: row.question,
        max_marks: row.max_marks,
        marks_awarded: row.marks_awarded,
        percentage: percentage,
        correct_points: correctPoints,
        missing_points: missingPoints,
        incorrect_points: incorrectPoints,
        icai_reference: row.icai_reference,
        feedback: row.feedback,
        evaluations: evaluations,
        annotated_image_path: row.annotated_image_path,
        image_paths: imagePaths,
        eval_type: row.eval_type || 'text',
        created_at: row.created_at
      }
    });

  } catch (err) {
    console.error('Fetch single test result error:', err);
    return res.status(500).json({ error: 'Failed to retrieve test result.' });
  }
});

/**
 * DELETE /api/history/:id
 * Delete a past test result
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const testId = req.params.id;
    const userId = req.user.id;

    const result = await runQuery(
      `DELETE FROM test_results WHERE id = ? AND user_id = ?`,
      [testId, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Test result record not found or already deleted.' });
    }

    return res.json({ success: true, message: 'Test result deleted successfully.' });

  } catch (err) {
    console.error('Delete test result error:', err);
    return res.status(500).json({ error: 'Failed to delete test result.' });
  }
});

export default router;
