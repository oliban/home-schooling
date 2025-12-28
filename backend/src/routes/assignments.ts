import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../data/database.js';
import { redis, cacheHits, cacheMisses } from '../index.js';
import { authenticateParent, authenticateChild, authenticateAny } from '../middleware/auth.js';
import { validateNumberAnswer } from '../utils/answer-validation.js';
import type { Assignment, MathProblem, ReadingQuestion, PackageProblem, AssignmentAnswer } from '../types/index.js';

// Cache TTL in seconds (shorter for active assignments that change frequently)
const ASSIGNMENTS_CACHE_TTL = 60; // 1 minute

// Cache key generators
function getAssignmentsListCacheKey(userId: string, userType: 'parent' | 'child', filters: { status?: string; type?: string; childId?: string }): string {
  const filterStr = [
    filters.status || '',
    filters.type || '',
    filters.childId || ''
  ].join(':');
  return `assignments:${userType}:${userId}:list:${filterStr}`;
}

function getAssignmentDetailCacheKey(assignmentId: string): string {
  return `assignments:detail:${assignmentId}`;
}

// Invalidate all assignments cache for a parent (when child completes, reorders, etc.)
async function invalidateAssignmentsCache(parentId?: string, childId?: string, assignmentId?: string): Promise<void> {
  try {
    const patterns: string[] = [];

    if (parentId) {
      patterns.push(`assignments:parent:${parentId}:*`);
    }
    if (childId) {
      patterns.push(`assignments:child:${childId}:*`);
    }
    if (assignmentId) {
      patterns.push(`assignments:detail:${assignmentId}`);
    }

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.del(pattern);
      }
    }
  } catch (err) {
    // Log but don't fail the operation if cache invalidation fails
    console.error('Cache invalidation error:', err instanceof Error ? err.message : err);
  }
}

// Export for use by other modules that may need to invalidate assignments cache
export { invalidateAssignmentsCache };

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
function saveScratchPadImage(assignmentId: string, questionId: string, dataUrl: string, index: number = 0): string | null {
  try {
    // dataUrl format: "data:image/png;base64,<base64data>"
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = index > 0
      ? `${assignmentId}_${questionId}_${index}.${ext}`
      : `${assignmentId}_${questionId}.${ext}`;
    const filepath = path.join(SCRATCH_IMAGES_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    // Return relative path for database storage (without /api prefix since NEXT_PUBLIC_API_URL already includes /api)
    return `/scratch-images/${filename}`;
  } catch (error) {
    console.error('Failed to save scratch pad image:', error);
    return null;
  }
}

// Helper to save multiple scratch pad images
function saveScratchPadImages(assignmentId: string, questionId: string, dataUrls: string[]): string[] {
  const savedPaths: string[] = [];

  for (let i = 0; i < dataUrls.length; i++) {
    const path = saveScratchPadImage(assignmentId, questionId, dataUrls[i], i + 1);
    if (path) {
      savedPaths.push(path);
    }
  }

  return savedPaths;
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
router.get('/', authenticateAny, async (req, res) => {
  try {
    // Determine user ID and type for cache key
    const userId = req.user?.id || req.child?.id;
    const userType: 'parent' | 'child' = req.user ? 'parent' : 'child';
    const { status, type, childId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const cacheKey = getAssignmentsListCacheKey(
      userId,
      userType,
      { status: status as string, type: type as string, childId: childId as string }
    );

    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cacheHits.inc({ cache_type: 'assignments' });
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      // Log cache error but continue to database
      console.error('Cache read error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

    // Cache miss - fetch from database
    cacheMisses.inc({ cache_type: 'assignments' });

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

    // Store in cache
    try {
      await redis.setex(cacheKey, ASSIGNMENTS_CACHE_TTL, JSON.stringify(assignments));
    } catch (cacheErr) {
      // Log cache write error but don't fail the request
      console.error('Cache write error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

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
    let storyText: string | null = null;

    // Package-based assignments (both math and reading) load from package_problems
    if (assignment.package_id) {
      // Get package details (including story_text for reading assignments)
      const pkg = db.get<{ story_text: string | null }>(
        'SELECT story_text FROM math_packages WHERE id = ?',
        [assignment.package_id]
      );
      storyText = pkg?.story_text || null;

      const rawQuestions = db.all<PackageProblem & Partial<AssignmentAnswer>>(
        `SELECT pp.*, aa.child_answer, aa.is_correct, aa.answered_at, aa.attempts_count, aa.hint_purchased, aa.scratch_pad_image
         FROM package_problems pp
         LEFT JOIN assignment_answers aa ON pp.id = aa.problem_id AND aa.assignment_id = ?
         WHERE pp.package_id = ?
         ORDER BY pp.problem_number`,
        [req.params.id, assignment.package_id]
      );

      // Get curriculum codes for each problem
      const problemIds = rawQuestions.map(q => q.id);
      if (problemIds.length > 0) {
        const placeholders = problemIds.map(() => '?').join(',');
        const mappings = db.all<{ exercise_id: string; code: string }>(
          `SELECT ecm.exercise_id, co.code
           FROM exercise_curriculum_mapping ecm
           JOIN curriculum_objectives co ON ecm.objective_id = co.id
           WHERE ecm.exercise_type = 'package_problem' AND ecm.exercise_id IN (${placeholders})`,
          problemIds
        );

        // Group codes by problem id
        const codesByProblem = new Map<string, string[]>();
        for (const m of mappings) {
          if (!codesByProblem.has(m.exercise_id)) {
            codesByProblem.set(m.exercise_id, []);
          }
          codesByProblem.get(m.exercise_id)!.push(m.code);
        }

        // Add codes to questions
        questions = rawQuestions.map(q => ({
          ...q,
          lgr22_codes: codesByProblem.get(q.id) || []
        }));
      } else {
        questions = rawQuestions;
      }
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
      questions,
      story_text: storyText
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Failed to get assignment' });
  }
});

// Create assignment (parent only)
router.post('/', authenticateParent, async (req, res) => {
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

    // Invalidate cache for both parent and child (new assignment affects both views)
    await invalidateAssignmentsCache(req.user!.id, childId);

    res.status(201).json({ id: assignmentId });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Submit answer (child only) - with multi-attempt support for math
router.post('/:id/submit', authenticateChild, async (req, res) => {
  try {
    const { questionId, answer, scratchPadImages, scratchPadImage } = req.body;

    if (!questionId || answer === undefined) {
      return res.status(400).json({ error: 'questionId and answer are required' });
    }

    // Save scratch pad images if provided (math assignments only)
    // Support both new array format and legacy single image format
    let scratchPadData: string | null = null;
    if (scratchPadImages && Array.isArray(scratchPadImages) && scratchPadImages.length > 0) {
      // New format: array of images
      const savedPaths = saveScratchPadImages(req.params.id, questionId, scratchPadImages);
      if (savedPaths.length > 0) {
        scratchPadData = JSON.stringify(savedPaths);
      }
    } else if (scratchPadImage && typeof scratchPadImage === 'string') {
      // Legacy format: single image (backward compatibility)
      const savedPath = saveScratchPadImage(req.params.id, questionId, scratchPadImage, 0);
      if (savedPath) {
        scratchPadData = savedPath;
      }
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

        // Check answer
        if (problem.answer_type === 'multiple_choice') {
          // Validate question is answerable
          const options = problem.options ? JSON.parse(problem.options) : null;
          const validation = validateMultipleChoiceQuestion(problem.correct_answer, options);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          const normalizedCorrect = problem.correct_answer.trim().toUpperCase();
          const normalizedAnswer = (answer as string).trim().toUpperCase();
          isCorrect = normalizedAnswer === normalizedCorrect;
        } else if (problem.answer_type === 'number') {
          isCorrect = validateNumberAnswer(problem.correct_answer, answer as string);
        } else if (problem.answer_type === 'text') {
          isCorrect = (answer as string).trim().toLowerCase() === problem.correct_answer.trim().toLowerCase();
        }

        // Calculate coins earned
        if (isCorrect) {
          const multiplier = ATTEMPT_MULTIPLIERS[attemptNumber - 1] || ATTEMPT_MULTIPLIERS[ATTEMPT_MULTIPLIERS.length - 1];
          coinsEarned = Math.round(10 * multiplier);
        }

        if (existingAnswer) {
          // Update existing answer
          db.run(
            `UPDATE assignment_answers SET child_answer = ?, is_correct = ?, attempts_count = ?, answered_at = CURRENT_TIMESTAMP, scratch_pad_image = ?
             WHERE assignment_id = ? AND problem_id = ?`,
            [
              answer as string,
              isCorrect ? 1 : 0,
              attemptNumber,
              scratchPadData || existingAnswer.scratch_pad_image,
              req.params.id,
              questionId
            ]
          );
        } else {
          // Insert new answer
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, child_answer, is_correct, attempts_count, answered_at, scratch_pad_image)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [
              uuidv4(),
              req.params.id,
              questionId,
              answer as string,
              isCorrect ? 1 : 0,
              attemptNumber,
              scratchPadData
            ]
          );
        }

        // Check if assignment is complete (all problems answered)
        const totalProblems = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM package_problems WHERE package_id = ?',
          [assignment.package_id]
        );

        const answeredProblems = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM assignment_answers WHERE assignment_id = ? AND child_answer IS NOT NULL',
          [req.params.id]
        );

        if (answeredProblems && totalProblems && answeredProblems.count === totalProblems.count) {
          questionComplete = true;
          db.run(
            "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [req.params.id]
          );
        }
      } else if (isReadingAssignment) {
        // Legacy reading assignment (single attempt)
        const question = db.get<ReadingQuestion>(
          'SELECT * FROM reading_questions WHERE id = ? AND assignment_id = ?',
          [questionId, req.params.id]
        );

        if (!question) {
          throw new Error('Question not found');
        }

        correctAnswer = question.correct_answer;

        // Validate question is answerable
        const options = question.options ? JSON.parse(question.options) : null;
        const validation = validateMultipleChoiceQuestion(question.correct_answer, options);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const normalizedCorrect = question.correct_answer.trim().toUpperCase();
        const normalizedAnswer = (answer as string).trim().toUpperCase();
        isCorrect = normalizedCorrect === normalizedAnswer;

        // Single-attempt update for reading
        db.run(
          `UPDATE reading_questions SET child_answer = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
           WHERE id = ? AND assignment_id = ?`,
          [answer as string, isCorrect ? 1 : 0, questionId, req.params.id]
        );

        // Check if all questions answered
        const totalQuestions = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM reading_questions WHERE assignment_id = ?',
          [req.params.id]
        );

        const answeredQuestions = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM reading_questions WHERE assignment_id = ? AND child_answer IS NOT NULL',
          [req.params.id]
        );

        if (answeredQuestions && totalQuestions && answeredQuestions.count === totalQuestions.count) {
          questionComplete = true;
          db.run(
            "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [req.params.id]
          );
        }
      } else {
        // Legacy math assignment (multi-attempt)
        const problem = db.get<MathProblem>(
          'SELECT * FROM math_problems WHERE id = ? AND assignment_id = ?',
          [questionId, req.params.id]
        );

        if (!problem) {
          throw new Error('Problem not found');
        }

        correctAnswer = problem.correct_answer;
        explanation = problem.explanation;
        hint = problem.hint;

        // Get current attempts and hint status
        const existingProblem = db.get<{ attempts_count: number | null; hint_purchased: number }>(
          'SELECT attempts_count, hint_purchased FROM math_problems WHERE id = ?',
          [questionId]
        );

        if (existingProblem) {
          const currentAttempts = existingProblem.attempts_count || 0;
          if (currentAttempts >= MAX_ATTEMPTS) {
            throw new Error('Maximum attempts reached');
          }
          attemptNumber = currentAttempts + 1;
          hintPurchased = existingProblem.hint_purchased === 1;
        }

        // Check answer
        if (problem.answer_type === 'multiple_choice') {
          const options = problem.options ? JSON.parse(problem.options) : null;
          const validation = validateMultipleChoiceQuestion(problem.correct_answer, options);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          const normalizedCorrect = problem.correct_answer.trim().toUpperCase();
          const normalizedAnswer = (answer as string).trim().toUpperCase();
          isCorrect = normalizedCorrect === normalizedAnswer;
        } else if (problem.answer_type === 'number') {
          isCorrect = validateNumberAnswer(problem.correct_answer, answer as string);
        } else if (problem.answer_type === 'text') {
          isCorrect = (answer as string).trim().toLowerCase() === problem.correct_answer.trim().toLowerCase();
        }

        // Calculate coins
        if (isCorrect) {
          const multiplier = ATTEMPT_MULTIPLIERS[attemptNumber - 1] || ATTEMPT_MULTIPLIERS[ATTEMPT_MULTIPLIERS.length - 1];
          coinsEarned = Math.round(10 * multiplier);
        }

        // Update problem attempts and answer
        db.run(
          `UPDATE math_problems SET child_answer = ?, is_correct = ?, attempts_count = ?, answered_at = CURRENT_TIMESTAMP, scratch_pad_image = ?
           WHERE id = ? AND assignment_id = ?`,
          [
            answer as string,
            isCorrect ? 1 : 0,
            attemptNumber,
            scratchPadData || problem.scratch_pad_image || null,
            questionId,
            req.params.id
          ]
        );

        // Check if assignment complete
        const totalProblems = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM math_problems WHERE assignment_id = ?',
          [req.params.id]
        );

        const solvedProblems = db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM math_problems WHERE assignment_id = ? AND child_answer IS NOT NULL',
          [req.params.id]
        );

        if (solvedProblems && totalProblems && solvedProblems.count === totalProblems.count) {
          questionComplete = true;
          db.run(
            "UPDATE assignments SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [req.params.id]
          );
        }
      }

      // Award coins and update streak if correct
      if (coinsEarned > 0) {
        db.run(
          'UPDATE child_coins SET balance = balance + ?, total_earned = total_earned + ?, current_streak = current_streak + 1 WHERE child_id = ?',
          [coinsEarned, coinsEarned, req.child!.id]
        );
      }

      // Reset streak if question complete and wrong
      if (questionComplete && !isCorrect) {
        db.run(
          'UPDATE child_coins SET current_streak = 0 WHERE child_id = ?',
          [req.child!.id]
        );
      }
    });

    // Get updated child coins and streak
    const childCoins = db.get<{ balance: number; current_streak: number }>(
      'SELECT balance, current_streak FROM child_coins WHERE child_id = ?',
      [req.child!.id]
    );

    const totalCoins = childCoins?.balance || 0;
    const streak = childCoins?.current_streak || 0;

    // Calculate multi-attempt fields
    const maxAttempts = isReadingAssignment ? 1 : MAX_ATTEMPTS;
    const canRetry = !isCorrect && !questionComplete && attemptNumber < maxAttempts && !isReadingAssignment;

    // Calculate potential reward for next attempt (if applicable)
    let potentialReward = 0;
    if (canRetry && attemptNumber < MAX_ATTEMPTS) {
      const nextMultiplier = ATTEMPT_MULTIPLIERS[attemptNumber] || ATTEMPT_MULTIPLIERS[ATTEMPT_MULTIPLIERS.length - 1];
      potentialReward = Math.round(10 * nextMultiplier);
    }

    // Calculate hint availability and cost
    const hasHint = hint !== null && hint !== '';
    const hintsAllowed = assignment.hints_allowed === 1;
    const canBuyHint = !isCorrect && hasHint && !hintPurchased && hintsAllowed && canRetry && attemptNumber >= 2;
    const hintCost = canBuyHint ? Math.max(1, Math.floor(potentialReward / 2)) : 0;

    // Invalidate cache after submission
    await invalidateAssignmentsCache(assignment.parent_id, req.child!.id, req.params.id);

    res.json({
      isCorrect,
      correctAnswer,
      coinsEarned,
      totalCoins,
      streak,
      attemptNumber,
      canRetry,
      maxAttempts,
      potentialReward,
      canBuyHint,
      hintCost,
      explanation: questionComplete ? explanation : null,
      questionComplete
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    res.status(error instanceof Error && error.message === 'Question already completed' ? 400 : 500).json({ error: message });
  }
});

// Purchase hint (child only)
router.post('/:id/hint/:questionId', authenticateChild, async (req, res) => {
  try {
    const { id: assignmentId, questionId } = req.params;

    const db = getDb();

    // Get assignment
    const assignment = db.get<Assignment>(
      'SELECT * FROM assignments WHERE id = ? AND child_id = ?',
      [assignmentId, req.child!.id]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.package_id) {
      // Package-based assignment
      const problem = db.get<PackageProblem & { hint_cost?: number }>(
        'SELECT * FROM package_problems WHERE id = ? AND package_id = ?',
        [questionId, assignment.package_id]
      );

      if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      const hintCost = problem.hint_cost || 5;

      // Check coins
      const child = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [req.child!.id]
      );

      if (!child || child.balance < hintCost) {
        return res.status(400).json({ error: 'Insufficient coins' });
      }

      db.transaction(() => {
        // Deduct coins
        db.run(
          'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
          [hintCost, req.child!.id]
        );

        // Mark hint as purchased
        const existingAnswer = db.get<AssignmentAnswer>(
          'SELECT * FROM assignment_answers WHERE assignment_id = ? AND problem_id = ?',
          [assignmentId, questionId]
        );

        if (existingAnswer) {
          db.run(
            'UPDATE assignment_answers SET hint_purchased = 1 WHERE assignment_id = ? AND problem_id = ?',
            [assignmentId, questionId]
          );
        } else {
          db.run(
            `INSERT INTO assignment_answers (id, assignment_id, problem_id, hint_purchased)
             VALUES (?, ?, ?, 1)`,
            [uuidv4(), assignmentId, questionId]
          );
        }
      });

      // Get updated balance
      const updatedChild = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [req.child!.id]
      );

      // Invalidate cache
      await invalidateAssignmentsCache(assignment.parent_id, req.child!.id, assignmentId);

      res.json({ hint: problem.hint, coinsSpent: hintCost, newBalance: updatedChild?.balance || 0 });
    } else {
      // Legacy assignment
      const problem = db.get<MathProblem & { hint_cost?: number }>(
        'SELECT * FROM math_problems WHERE id = ? AND assignment_id = ?',
        [questionId, assignmentId]
      );

      if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      const hintCost = problem.hint_cost || 5;

      const child = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [req.child!.id]
      );

      if (!child || child.balance < hintCost) {
        return res.status(400).json({ error: 'Insufficient coins' });
      }

      db.transaction(() => {
        db.run(
          'UPDATE child_coins SET balance = balance - ? WHERE child_id = ?',
          [hintCost, req.child!.id]
        );

        db.run(
          'UPDATE math_problems SET hint_purchased = 1 WHERE id = ?',
          [questionId]
        );
      });

      // Get updated balance
      const updatedChild = db.get<{ balance: number }>(
        'SELECT balance FROM child_coins WHERE child_id = ?',
        [req.child!.id]
      );

      // Invalidate cache
      await invalidateAssignmentsCache(assignment.parent_id, req.child!.id, assignmentId);

      res.json({ hint: problem.hint, coinsSpent: hintCost, newBalance: updatedChild?.balance || 0 });
    }
  } catch (error) {
    console.error('Purchase hint error:', error);
    res.status(500).json({ error: 'Failed to purchase hint' });
  }
});

// Reorder assignments (parent only)
router.patch('/reorder', authenticateParent, async (req, res) => {
  try {
    const { assignmentIds, statusUpdates } = req.body;

    if (!Array.isArray(assignmentIds)) {
      return res.status(400).json({ error: 'assignmentIds must be an array' });
    }

    const db = getDb();

    db.transaction(() => {
      // Update display_order for all assignments
      for (let i = 0; i < assignmentIds.length; i++) {
        db.run(
          'UPDATE assignments SET display_order = ? WHERE id = ? AND parent_id = ?',
          [i, assignmentIds[i], req.user!.id]
        );
      }

      // Apply status updates if provided
      if (statusUpdates) {
        for (const [assignmentId, newStatus] of Object.entries(statusUpdates)) {
          db.run(
            "UPDATE assignments SET status = ? WHERE id = ? AND parent_id = ?",
            [newStatus, assignmentId, req.user!.id]
          );
        }
      }
    });

    // Invalidate cache for all children of this parent
    const children = db.all<{ id: string }>(
      'SELECT DISTINCT child_id as id FROM assignments WHERE parent_id = ?',
      [req.user!.id]
    );

    for (const child of children) {
      await invalidateAssignmentsCache(req.user!.id, child.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder assignments error:', error);
    res.status(500).json({ error: 'Failed to reorder assignments' });
  }
});

export default router;