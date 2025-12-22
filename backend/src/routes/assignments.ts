import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../data/database.js';
import { authenticateParent, authenticateChild, authenticateAny } from '../middleware/auth.js';
import type { Assignment, MathProblem, ReadingQuestion, PackageProblem, AssignmentAnswer } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Scratch images directory
// Use DATA_DIR env var if set, otherwise derive from DATABASE_PATH, otherwise use relative path
const dataDir = process.env.DATA_DIR ||
  (process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : path.join(__dirname, '../../../data'));
const SCRATCH_IMAGES_DIR = path.join(dataDir, 'scratch-images');

// Ensure scratch images directory exists
if (!fs.existsSync(SCRATCH_IMAGES_DIR)) {
  fs.mkdirSync(SCRATCH_IMAGES_DIR, { recursive: true });
}

// Helper to save base64 image to disk
function saveScratchPadImage(assignmentId: string, questionId: string, dataUrl: string): string | null {
  try {
    // dataUrl format: "data:image/png;base64,<base64data>"
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `${assignmentId}_${questionId}.${ext}`;
    const filepath = path.join(SCRATCH_IMAGES_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    // Return relative path for database storage (without /api prefix since NEXT_PUBLIC_API_URL already includes /api)
    return `/scratch-images/${filename}`;
  } catch (error) {
    console.error('Failed to save scratch pad image:', error);
    return null;
  }
}

const router = Router();

// Helper to validate that a multiple choice question is answerable
function validateMultipleChoiceQuestion(correctAnswer: string, options: string[] | null): { valid: boolean; error?: string } {
  if (!options || options.length < 2) {
    return { valid: false, error: 'Question has no options configured' };
  }

  const normalizedAnswer = correctAnswer.trim().toUpperCase();
  const optionLetters = options.map(opt => opt.charAt(0).toUpperCase());

  if (!optionLetters.includes(normalizedAnswer)) {
    return {
      valid: false,
      error: `Question misconfigured: correct_answer "${correctAnswer}" does not match any option (${optionLetters.join(', ')})`
    };
  }

  return { valid: true };
}

// List assignments (for parent or child)
router.get('/', authenticateAny, (req, res) => {
  try {
    const db = getDb();
    let query = `
      SELECT a.*, c.name as child_name,
        -- Score calculation: correct answers
        CASE
          WHEN a.package_id IS NOT NULL THEN
            (SELECT COUNT(*) FROM assignment_answers aa WHERE aa.assignment_id = a.id AND aa.is_correct = 1)
          WHEN a.assignment_type = 'math' THEN
            (SELECT COUNT(*) FROM math_problems mp WHERE mp.assignment_id = a.id AND mp.is_correct = 1)
          ELSE
            (SELECT COUNT(*) FROM reading_questions rq WHERE rq.assignment_id = a.id AND rq.is_correct = 1)
        END as correct_count,
        -- Score calculation: total questions
        CASE
          WHEN a.package_id IS NOT NULL THEN
            (SELECT COUNT(*) FROM package_problems pp WHERE pp.package_id = a.package_id)
          WHEN a.assignment_type = 'math' THEN
            (SELECT COUNT(*) FROM math_problems mp WHERE mp.assignment_id = a.id)
          ELSE
            (SELECT COUNT(*) FROM reading_questions rq WHERE rq.assignment_id = a.id)
        END as total_count
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

    query += ' ORDER BY COALESCE(a.display_order, 999999) ASC, a.created_at DESC';

    const assignments = db.all<Assignment & { child_name: string; correct_count: number; total_count: number }>(query, params);

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

    let questions: (MathProblem | ReadingQuestion | (PackageProblem & Partial<AssignmentAnswer>))[] = [];

    // Package-based assignments (both math and reading) load from package_problems
    if (assignment.package_id) {
      questions = db.all<PackageProblem & Partial<AssignmentAnswer>>(
        `SELECT pp.*, aa.child_answer, aa.is_correct, aa.answered_at, aa.attempts_count, aa.hint_purchased, aa.scratch_pad_image
         FROM package_problems pp
         LEFT JOIN assignment_answers aa ON pp.id = aa.problem_id AND aa.assignment_id = ?
         WHERE pp.package_id = ?
         ORDER BY pp.problem_number`,
        [req.params.id, assignment.package_id]
      );
    } else if (assignment.assignment_type === 'math') {
      // Legacy embedded math problems (includes attempts_count and hint_purchased)
      questions = db.all<MathProblem>(
        'SELECT * FROM math_problems WHERE assignment_id = ? ORDER BY problem_number',
        [req.params.id]
      );
    } else {
      // Legacy embedded reading questions
      questions = db.all<ReadingQuestion>(
        'SELECT * FROM reading_questions WHERE assignment_id = ? ORDER BY question_number',
        [req.params.id]
      );
    }

    // Auto-complete reading assignments if all questions answered but status not updated
    // This fixes assignments that were affected by the completion bug
    if (assignment.status !== 'completed' && assignment.assignment_type === 'reading') {
      const allAnswered = questions.every(q => 'child_answer' in q && q.child_answer !== null);
      if (allAnswered && questions.length > 0) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [req.params.id]
        );
        assignment.status = 'completed';
      }
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

// Submit answer (child only) - with multi-attempt support for math
router.post('/:id/submit', authenticateChild, (req, res) => {
  try {
    const { questionId, answer, scratchPadImage } = req.body;

    if (!questionId || answer === undefined) {
      return res.status(400).json({ error: 'questionId and answer are required' });
    }

    // Save scratch pad image if provided (math assignments only)
    let scratchPadPath: string | null = null;
    if (scratchPadImage && typeof scratchPadImage === 'string') {
      scratchPadPath = saveScratchPadImage(req.params.id, questionId, scratchPadImage);
    }

    const db = getDb();
    const MAX_ATTEMPTS = 3;
    const ATTEMPT_MULTIPLIERS = [1.0, 0.66, 0.33]; // 100%, 66%, 33%

    // Get assignment and verify access
    const assignment = db.get<Assignment & { hints_allowed: number }>(
      'SELECT * FROM assignments WHERE id = ? AND child_id = ?',
      [req.params.id, req.child!.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Helper to normalize number answers
    const normalizeNumber = (val: string) =>
      val.trim().toLowerCase().replace(',', '.').replace(/\s*%$/, '');

    // Reading assignments use single-attempt logic (no retries)
    const isReadingAssignment = assignment.assignment_type === 'reading';

    let isCorrect = false;
    let correctAnswer = '';
    let coinsEarned = 0;
    let attemptNumber = 1;
    let questionComplete = false;
    let explanation: string | null = null;
    let hint: string | null = null;
    let hintPurchased = false;

    db.transaction(() => {
      // Update assignment status to in_progress if pending
      if (assignment.status === 'pending') {
        db.run(
          "UPDATE assignments SET status = 'in_progress' WHERE id = ?",
          [req.params.id]
        );
      }

      // Package-based assignments (both math and reading)
      if (assignment.package_id) {
        const problem = db.get<PackageProblem>(
          'SELECT * FROM package_problems WHERE id = ? AND package_id = ?',
          [questionId, assignment.package_id]
        );

        if (!problem) {
          throw new Error('Problem not found');
        }

        correctAnswer = problem.correct_answer;
        explanation = problem.explanation;
        hint = problem.hint;

        // Check existing answer for attempt count
        const existingAnswer = db.get<AssignmentAnswer>(
          'SELECT * FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
          [req.params.id, questionId]
        );

        if (existingAnswer) {
          // Check if already complete
          if (existingAnswer.is_correct === 1 || (existingAnswer.attempts_count || 1) >= MAX_ATTEMPTS) {
            throw new Error('Question already completed');
          }
          attemptNumber = (existingAnswer.attempts_count || 1) + 1;
          hintPurchased = existingAnswer.hint_purchased === 1;
        }

        // For reading: single attempt (no multi-attempt)
        if (isReadingAssignment && existingAnswer) {
          throw new Error('Question already answered');
        }

        // Check answer
        if (problem.answer_type === 'multiple_choice') {
          // Validate that the question is answerable (correct_answer matches an option)
          const options = problem.options ? JSON.parse(problem.options) : null;
          const validation = validateMultipleChoiceQuestion(correctAnswer, options);
          if (!validation.valid) {
            throw new Error(validation.error || 'Question is misconfigured');
          }
          isCorrect = answer.toString().trim().toUpperCase() === correctAnswer.trim().toUpperCase();
        } else {
          isCorrect = normalizeNumber(answer.toString()) === normalizeNumber(correctAnswer);
        }

        questionComplete = isCorrect || attemptNumber >= MAX_ATTEMPTS || isReadingAssignment;

        // Insert or update answer
        db.run(
          `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, answered_at, attempts_count, hint_purchased, scratch_pad_image)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
           ON CONFLICT(assignment_id, problem_id) DO UPDATE SET
             child_answer = excluded.child_answer,
             is_correct = excluded.is_correct,
             answered_at = excluded.answered_at,
             attempts_count = excluded.attempts_count,
             scratch_pad_image = COALESCE(excluded.scratch_pad_image, scratch_pad_image)`,
          [uuidv4(), req.params.id, questionId, answer, isCorrect ? 1 : 0, attemptNumber, hintPurchased ? 1 : 0, scratchPadPath]
        );
      } else if (assignment.assignment_type === 'math') {
        // Legacy embedded math problems
        const problem = db.get<MathProblem & { attempts_count?: number; hint_purchased?: number }>(
          'SELECT * FROM math_problems WHERE id = ? AND assignment_id = ?',
          [questionId, req.params.id]
        );

        if (!problem) {
          throw new Error('Problem not found');
        }

        correctAnswer = problem.correct_answer;
        explanation = problem.explanation || null;
        hint = problem.hint || null;

        // Check if already complete
        if (problem.is_correct === 1 || (problem.attempts_count || 1) >= MAX_ATTEMPTS) {
          throw new Error('Question already completed');
        }

        if (problem.child_answer !== null) {
          attemptNumber = (problem.attempts_count || 1) + 1;
        }
        hintPurchased = problem.hint_purchased === 1;

        isCorrect = normalizeNumber(answer.toString()) === normalizeNumber(correctAnswer);
        questionComplete = isCorrect || attemptNumber >= MAX_ATTEMPTS;

        db.run(
          `UPDATE math_problems SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP, attempts_count = ?, scratch_pad_image = COALESCE(?, scratch_pad_image)
           WHERE id = ?`,
          [answer, isCorrect ? 1 : 0, attemptNumber, scratchPadPath, questionId]
        );
      } else {
        // Legacy embedded reading questions (single attempt only)
        const question = db.get<ReadingQuestion>(
          'SELECT * FROM reading_questions WHERE id = ? AND assignment_id = ?',
          [questionId, req.params.id]
        );

        if (!question) {
          throw new Error('Question not found');
        }

        if (question.child_answer !== null) {
          throw new Error('Question already answered');
        }

        correctAnswer = question.correct_answer;

        // Validate that the question is answerable (correct_answer matches an option)
        const options = question.options ? JSON.parse(question.options) : null;
        const validation = validateMultipleChoiceQuestion(correctAnswer, options);
        if (!validation.valid) {
          throw new Error(validation.error || 'Question is misconfigured');
        }

        isCorrect = answer.toString().trim().toUpperCase() === correctAnswer.trim().toUpperCase();
        questionComplete = true; // Reading is always single-attempt

        db.run(
          `UPDATE reading_questions SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [answer, isCorrect ? 1 : 0, questionId]
        );
      }

      // Calculate coins with attempt multiplier (math only)
      if (isCorrect) {
        const coins = db.get<{ current_streak: number }>(
          'SELECT current_streak FROM child_coins WHERE child_id = ?',
          [req.child!.id]
        );

        const streak = (coins?.current_streak || 0) + 1;
        const streakBonus = Math.min(streak * 5, 25);
        const fullReward = 10 + streakBonus;

        // Apply attempt multiplier for math assignments
        if (!isReadingAssignment) {
          const multiplier = ATTEMPT_MULTIPLIERS[attemptNumber - 1] || 0.33;
          coinsEarned = Math.floor(fullReward * multiplier);
        } else {
          coinsEarned = fullReward;
        }

        db.run(
          `UPDATE child_coins SET
           balance = balance + ?,
           total_earned = total_earned + ?,
           current_streak = ?
           WHERE child_id = ?`,
          [coinsEarned, coinsEarned, streak, req.child!.id]
        );
      } else {
        // Only reset streak on final attempt wrong (or reading wrong)
        if (questionComplete) {
          db.run(
            'UPDATE child_coins SET current_streak = 0 WHERE child_id = ?',
            [req.child!.id]
          );
        }
        // For math attempts 1-2: keep streak intact for next question
      }

      // Log progress
      db.run(
        `INSERT INTO progress_logs (child_id, assignment_id, action, details, coins_earned)
         VALUES (?, ?, 'answered', ?, ?)`,
        [req.child!.id, req.params.id, JSON.stringify({ questionId, isCorrect, attemptNumber }), coinsEarned]
      );

      // Check if assignment is complete (all questions are questionComplete)
      let allComplete = false;
      if (assignment.package_id) {
        const totalProblems = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM package_problems WHERE package_id = ?',
          [assignment.package_id]
        );

        let completedProblems: { count: number } | undefined;
        if (isReadingAssignment) {
          // Reading: any answered question is complete (single attempt only)
          completedProblems = db.get<{ count: number }>(
            `SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ?`,
            [req.params.id]
          );
        } else {
          // Math: questions are complete if correct OR have 3 attempts
          completedProblems = db.get<{ count: number }>(
            `SELECT COUNT(*) as count FROM assignment_answers
             WHERE assignment_id = ? AND (is_correct = 1 OR attempts_count >= ?)`,
            [req.params.id, MAX_ATTEMPTS]
          );
        }
        allComplete = (completedProblems?.count || 0) >= (totalProblems?.count || 0);
      } else if (assignment.assignment_type === 'math') {
        const incomplete = db.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM math_problems
           WHERE assignment_id = ? AND is_correct != 1 AND (attempts_count IS NULL OR attempts_count < ?)`,
          [req.params.id, MAX_ATTEMPTS]
        );
        allComplete = (incomplete?.count || 0) === 0;
      } else {
        const unanswered = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM reading_questions WHERE assignment_id = ? AND child_answer IS NULL',
          [req.params.id]
        );
        allComplete = (unanswered?.count || 0) === 0;
      }

      if (allComplete) {
        db.run(
          "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [req.params.id]
        );

        // Completion bonus
        db.run(
          'UPDATE child_coins SET balance = balance + 50, total_earned = total_earned + 50 WHERE child_id = ?',
          [req.child!.id]
        );
        coinsEarned += 50;
      }
    });

    // Get updated coin balance and streak
    const coins = db.get<{ balance: number; current_streak: number }>(
      'SELECT balance, current_streak FROM child_coins WHERE child_id = ?',
      [req.child!.id]
    );

    const currentStreak = coins?.current_streak || 0;
    const canRetry = !questionComplete && !isReadingAssignment;

    // Calculate potential reward for next attempt (for UI display)
    let potentialReward = 0;
    if (canRetry) {
      const nextMultiplier = ATTEMPT_MULTIPLIERS[attemptNumber] || 0.33;
      const baseReward = 10 + Math.min(currentStreak * 5, 25);
      potentialReward = Math.floor(baseReward * nextMultiplier);
    }

    // Calculate hint availability
    const canBuyHint = !isReadingAssignment
      && assignment.hints_allowed === 1
      && attemptNumber >= 1
      && !hintPurchased
      && !questionComplete
      && hint !== null;
    const hintCost = canBuyHint ? Math.floor(potentialReward / 2) : 0;

    res.json({
      isCorrect,
      correctAnswer: questionComplete && !isCorrect ? correctAnswer : undefined,
      coinsEarned,
      totalCoins: coins?.balance || 0,
      streak: currentStreak,
      // Multi-attempt fields
      attemptNumber,
      canRetry,
      maxAttempts: isReadingAssignment ? 1 : MAX_ATTEMPTS,
      potentialReward,
      canBuyHint,
      hintCost,
      explanation: questionComplete ? explanation : undefined,
      questionComplete
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    if (message === 'Question already completed' || message === 'Question already answered') {
      return res.status(400).json({ error: message, questionComplete: true });
    }
    if (message.includes('misconfigured') || message.includes('does not match any option')) {
      console.error('Question validation error:', message);
      return res.status(422).json({
        error: message,
        questionMisconfigured: true,
        helpText: 'This question has an invalid answer configuration. Please contact the parent to fix or remove this assignment.'
      });
    }
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Buy hint for a question (child only)
router.post('/:id/questions/:questionId/buy-hint', authenticateChild, (req, res) => {
  try {
    const { id: assignmentId, questionId } = req.params;
    const db = getDb();

    // Get assignment and verify access
    const assignment = db.get<Assignment & { hints_allowed: number }>(
      'SELECT * FROM assignments WHERE id = ? AND child_id = ?',
      [assignmentId, req.child!.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check hints are allowed for this assignment
    if (!assignment.hints_allowed) {
      return res.status(403).json({ error: 'Hints not allowed for this assignment' });
    }

    // Only math assignments support hints
    if (assignment.assignment_type !== 'math') {
      return res.status(400).json({ error: 'Hints only available for math assignments' });
    }

    let hintText: string | null = null;
    let hintCost = 0;

    db.transaction(() => {
      // Get problem and existing answer based on assignment type
      if (assignment.package_id) {
        const problem = db.get<PackageProblem>(
          'SELECT * FROM package_problems WHERE id = ? AND package_id = ?',
          [questionId, assignment.package_id]
        );

        if (!problem) {
          throw new Error('Problem not found');
        }

        hintText = problem.hint;

        const existingAnswer = db.get<AssignmentAnswer>(
          'SELECT * FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
          [assignmentId, questionId]
        );

        // Validate hint purchase conditions
        if (!existingAnswer || (existingAnswer.attempts_count || 0) < 1) {
          throw new Error('Must attempt question first');
        }
        if (existingAnswer.hint_purchased) {
          throw new Error('Hint already purchased');
        }
        if (existingAnswer.is_correct === 1 || (existingAnswer.attempts_count || 1) >= 3) {
          throw new Error('Question already complete');
        }

        // Calculate hint cost (half of next attempt reward)
        const nextAttemptMultiplier = existingAnswer.attempts_count === 1 ? 0.66 : 0.33;
        const coins = db.get<{ current_streak: number }>(
          'SELECT current_streak FROM child_coins WHERE child_id = ?',
          [req.child!.id]
        );
        const streak = coins?.current_streak || 0;
        const baseReward = 10 + Math.min(streak * 5, 25);
        const potentialReward = Math.floor(baseReward * nextAttemptMultiplier);
        hintCost = Math.floor(potentialReward / 2);

        // Check balance
        const balance = db.get<{ balance: number }>(
          'SELECT balance FROM child_coins WHERE child_id = ?',
          [req.child!.id]
        );
        if ((balance?.balance || 0) < hintCost) {
          throw new Error('Not enough coins');
        }

        // Deduct coins
        db.run(
          'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
          [hintCost, req.child!.id]
        );

        // Mark hint as purchased
        db.run(
          'UPDATE assignment_answers SET hint_purchased = 1, coins_spent_on_hint = ? WHERE assignment_id = ? AND problem_id = ?',
          [hintCost, assignmentId, questionId]
        );
      } else {
        // Legacy embedded math problems
        const problem = db.get<MathProblem & { attempts_count?: number; hint_purchased?: number }>(
          'SELECT * FROM math_problems WHERE id = ? AND assignment_id = ?',
          [questionId, assignmentId]
        );

        if (!problem) {
          throw new Error('Problem not found');
        }

        hintText = problem.hint || null;

        // Validate hint purchase conditions
        if (problem.child_answer === null || (problem.attempts_count || 0) < 1) {
          throw new Error('Must attempt question first');
        }
        if (problem.hint_purchased) {
          throw new Error('Hint already purchased');
        }
        if (problem.is_correct === 1 || (problem.attempts_count || 1) >= 3) {
          throw new Error('Question already complete');
        }

        // Calculate hint cost
        const nextAttemptMultiplier = (problem.attempts_count || 1) === 1 ? 0.66 : 0.33;
        const coins = db.get<{ current_streak: number }>(
          'SELECT current_streak FROM child_coins WHERE child_id = ?',
          [req.child!.id]
        );
        const streak = coins?.current_streak || 0;
        const baseReward = 10 + Math.min(streak * 5, 25);
        const potentialReward = Math.floor(baseReward * nextAttemptMultiplier);
        hintCost = Math.floor(potentialReward / 2);

        // Check balance
        const balance = db.get<{ balance: number }>(
          'SELECT balance FROM child_coins WHERE child_id = ?',
          [req.child!.id]
        );
        if ((balance?.balance || 0) < hintCost) {
          throw new Error('Not enough coins');
        }

        // Deduct coins
        db.run(
          'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
          [hintCost, req.child!.id]
        );

        // Mark hint as purchased
        db.run(
          'UPDATE math_problems SET hint_purchased = 1 WHERE id = ?',
          [questionId]
        );
      }
    });

    // Get updated balance
    const updatedCoins = db.get<{ balance: number }>(
      'SELECT balance FROM child_coins WHERE child_id = ?',
      [req.child!.id]
    );

    res.json({
      success: true,
      hint: hintText || 'No hint available',
      coinsCost: hintCost,
      newBalance: updatedCoins?.balance || 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to buy hint';
    if (['Must attempt question first', 'Hint already purchased', 'Question already complete', 'Not enough coins'].includes(message)) {
      return res.status(400).json({ error: message });
    }
    console.error('Buy hint error:', error);
    res.status(500).json({ error: 'Failed to buy hint' });
  }
});

// Reorder assignments (parent only)
router.put('/reorder', authenticateParent, (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds array is required' });
    }

    const db = getDb();

    // Verify all assignments belong to this parent
    const placeholders = orderedIds.map(() => '?').join(',');
    const assignments = db.all<{ id: string }>(
      `SELECT id FROM assignments WHERE id IN (${placeholders}) AND parent_id = ?`,
      [...orderedIds, req.user!.id]
    );

    if (assignments.length !== orderedIds.length) {
      return res.status(403).json({ error: 'One or more assignments not found or not owned by you' });
    }

    // Update display_order for each assignment
    db.transaction(() => {
      orderedIds.forEach((id, index) => {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ?',
          [index, id]
        );
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder assignments error:', error);
    res.status(500).json({ error: 'Failed to reorder assignments' });
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
