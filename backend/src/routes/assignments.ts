import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../data/database.js';
import { authenticateParent, authenticateChild, authenticateAny } from '../middleware/auth.js';
import type { Assignment, MathProblem, ReadingQuestion } from '../types/index.js';

const router = Router();

// List assignments (for parent or child)
router.get('/', authenticateAny, (req, res) => {
  try {
    const db = getDb();
    let query = `
      SELECT a.*, c.name as child_name
      FROM assignments a
      JOIN children c ON a.child_id = c.id
    `;
    const params: string[] = [];

    if (req.user) {
      // Parent: show all their children's assignments
      query += ' WHERE a.parent_id = ?';
      params.push(req.user.id);
    } else if (req.child) {
      // Child: show only their assignments
      query += ' WHERE a.child_id = ?';
      params.push(req.child.id);
    }

    // Filter by query params
    const { status, type, childId } = req.query;
    if (status) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' a.status = ?';
      params.push(status as string);
    }
    if (type) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' a.assignment_type = ?';
      params.push(type as string);
    }
    if (childId && req.user) {
      query += ' AND a.child_id = ?';
      params.push(childId as string);
    }

    query += ' ORDER BY a.created_at DESC';

    const assignments = db.all<Assignment & { child_name: string }>(query, params);

    res.json(assignments);
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({ error: 'Failed to list assignments' });
  }
});

// Get assignment with questions
router.get('/:id', authenticateAny, (req, res) => {
  try {
    const db = getDb();

    const assignment = db.get<Assignment>(
      'SELECT * FROM assignments WHERE id = ?',
      [req.params.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify access
    if (req.user && assignment.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.child && assignment.child_id !== req.child.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let questions: (MathProblem | ReadingQuestion)[] = [];

    if (assignment.assignment_type === 'math') {
      questions = db.all<MathProblem>(
        'SELECT * FROM math_problems WHERE assignment_id = ? ORDER BY problem_number',
        [req.params.id]
      );
    } else {
      questions = db.all<ReadingQuestion>(
        'SELECT * FROM reading_questions WHERE assignment_id = ? ORDER BY question_number',
        [req.params.id]
      );
    }

    res.json({
      ...assignment,
      questions
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Failed to get assignment' });
  }
});

// Create assignment (parent only)
router.post('/', authenticateParent, (req, res) => {
  try {
    const { childId, type, title, gradeLevel, problems, questions } = req.body;

    if (!childId || !type || !title) {
      return res.status(400).json({ error: 'childId, type, and title are required' });
    }

    if (type !== 'math' && type !== 'reading') {
      return res.status(400).json({ error: 'Type must be math or reading' });
    }

    const db = getDb();

    // Verify child belongs to parent
    const child = db.get<{ id: string; grade_level: number }>(
      'SELECT id, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const assignmentId = uuidv4();
    const grade = gradeLevel || child.grade_level;

    db.transaction(() => {
      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [assignmentId, req.user!.id, childId, type, title, grade]
      );

      if (type === 'math' && problems && Array.isArray(problems)) {
        for (let i = 0; i < problems.length; i++) {
          const p = problems[i];
          db.run(
            `INSERT INTO math_problems (id, assignment_id, category_id, problem_number, question_text, correct_answer, answer_type, options, explanation, hint, difficulty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              assignmentId,
              p.category_id || null,
              i + 1,
              p.question_text,
              p.correct_answer,
              p.answer_type || 'number',
              p.options ? JSON.stringify(p.options) : null,
              p.explanation || null,
              p.hint || null,
              p.difficulty || 'medium'
            ]
          );
        }
      } else if (type === 'reading' && questions && Array.isArray(questions)) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          db.run(
            `INSERT INTO reading_questions (id, assignment_id, chapter_id, question_number, question_text, correct_answer, options, difficulty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              assignmentId,
              q.chapter_id || null,
              i + 1,
              q.question_text,
              q.correct_answer,
              JSON.stringify(q.options),
              q.difficulty || 'medium'
            ]
          );
        }
      }
    });

    res.status(201).json({ id: assignmentId });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Submit answer (child only)
router.post('/:id/submit', authenticateChild, (req, res) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId || answer === undefined) {
      return res.status(400).json({ error: 'questionId and answer are required' });
    }

    const db = getDb();

    // Get assignment and verify access
    const assignment = db.get<Assignment>(
      'SELECT * FROM assignments WHERE id = ? AND child_id = ?',
      [req.params.id, req.child!.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    let isCorrect = false;
    let correctAnswer = '';
    let coinsEarned = 0;

    db.transaction(() => {
      // Update assignment status to in_progress if pending
      if (assignment.status === 'pending') {
        db.run(
          "UPDATE assignments SET status = 'in_progress' WHERE id = ?",
          [req.params.id]
        );
      }

      if (assignment.assignment_type === 'math') {
        const problem = db.get<MathProblem>(
          'SELECT * FROM math_problems WHERE id = ? AND assignment_id = ?',
          [questionId, req.params.id]
        );

        if (!problem) {
          throw new Error('Problem not found');
        }

        correctAnswer = problem.correct_answer;
        // Normalize answers: accept both "," and ".", and ignore trailing % signs
        const normalizeNumber = (val: string) =>
          val.trim().toLowerCase().replace(',', '.').replace(/\s*%$/, '');
        isCorrect = normalizeNumber(answer.toString()) === normalizeNumber(correctAnswer);

        db.run(
          `UPDATE math_problems SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [answer, isCorrect ? 1 : 0, questionId]
        );
      } else {
        const question = db.get<ReadingQuestion>(
          'SELECT * FROM reading_questions WHERE id = ? AND assignment_id = ?',
          [questionId, req.params.id]
        );

        if (!question) {
          throw new Error('Question not found');
        }

        correctAnswer = question.correct_answer;
        isCorrect = answer.toString().trim().toUpperCase() === correctAnswer.trim().toUpperCase();

        db.run(
          `UPDATE reading_questions SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [answer, isCorrect ? 1 : 0, questionId]
        );
      }

      // Award coins
      if (isCorrect) {
        const coins = db.get<{ current_streak: number }>(
          'SELECT current_streak FROM child_coins WHERE child_id = ?',
          [req.child!.id]
        );

        const streak = (coins?.current_streak || 0) + 1;
        const streakBonus = Math.min(streak * 5, 25); // +5 per streak, max +25
        coinsEarned = 10 + streakBonus;

        db.run(
          `UPDATE child_coins SET
           balance = balance + ?,
           total_earned = total_earned + ?,
           current_streak = ?
           WHERE child_id = ?`,
          [coinsEarned, coinsEarned, streak, req.child!.id]
        );
      } else {
        // Reset streak on wrong answer
        db.run(
          'UPDATE child_coins SET current_streak = 0 WHERE child_id = ?',
          [req.child!.id]
        );
      }

      // Log progress
      db.run(
        `INSERT INTO progress_logs (child_id, assignment_id, action, details, coins_earned)
         VALUES (?, ?, 'answered', ?, ?)`,
        [req.child!.id, req.params.id, JSON.stringify({ questionId, isCorrect }), coinsEarned]
      );

      // Check if assignment is complete
      let allAnswered = false;
      if (assignment.assignment_type === 'math') {
        const unanswered = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM math_problems WHERE assignment_id = ? AND child_answer IS NULL',
          [req.params.id]
        );
        allAnswered = (unanswered?.count || 0) === 0;
      } else {
        const unanswered = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM reading_questions WHERE assignment_id = ? AND child_answer IS NULL',
          [req.params.id]
        );
        allAnswered = (unanswered?.count || 0) === 0;
      }

      if (allAnswered) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [req.params.id]
        );

        // Daily completion bonus
        db.run(
          'UPDATE child_coins SET balance = balance + 50, total_earned = total_earned + 50 WHERE child_id = ?',
          [req.child!.id]
        );
        coinsEarned += 50;
      }
    });

    // Get updated coin balance
    const coins = db.get<{ balance: number; current_streak: number }>(
      'SELECT balance, current_streak FROM child_coins WHERE child_id = ?',
      [req.child!.id]
    );

    res.json({
      isCorrect,
      correctAnswer: isCorrect ? undefined : correctAnswer,
      coinsEarned,
      totalCoins: coins?.balance || 0,
      streak: coins?.current_streak || 0
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Delete assignment (parent only)
router.delete('/:id', authenticateParent, (req, res) => {
  try {
    const db = getDb();

    const result = db.run(
      'DELETE FROM assignments WHERE id = ? AND parent_id = ?',
      [req.params.id, req.user!.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

export default router;
