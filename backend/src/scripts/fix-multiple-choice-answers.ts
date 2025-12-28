#!/usr/bin/env tsx
/**
 * Fix multiple choice questions where correct_answer contains full text instead of letter
 *
 * Example issue: correct_answer = "en fjärdedel" when it should be "A"
 *
 * Run with: npx tsx backend/src/scripts/fix-multiple-choice-answers.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/homeschooling.db');

interface Problem {
  id: string;
  question_text: string;
  correct_answer: string;
  options: string | null;
  problem_number?: number;
  package_id?: string;
}

function fixMultipleChoiceAnswers() {
  const db = new Database(DB_PATH);

  console.log('🔍 Scanning for misconfigured multiple choice questions...\n');

  let totalFixed = 0;
  let totalErrors = 0;

  // Fix package_problems
  const packageProblems = db.prepare(`
    SELECT id, package_id, problem_number, question_text, correct_answer, options
    FROM package_problems
    WHERE answer_type = 'multiple_choice'
      AND correct_answer NOT IN ('A', 'B', 'C', 'D')
  `).all() as Problem[];

  console.log(`Found ${packageProblems.length} misconfigured problems in package_problems`);

  for (const problem of packageProblems) {
    try {
      const fixed = fixProblem(db, 'package_problems', problem);
      if (fixed) totalFixed++;
    } catch (err) {
      console.error(`❌ Error fixing package_problem ${problem.id}:`, err);
      totalErrors++;
    }
  }

  // Fix math_problems
  const mathProblems = db.prepare(`
    SELECT id, problem_number, question_text, correct_answer, options
    FROM math_problems
    WHERE answer_type = 'multiple_choice'
      AND correct_answer NOT IN ('A', 'B', 'C', 'D')
  `).all() as Problem[];

  console.log(`\nFound ${mathProblems.length} misconfigured problems in math_problems`);

  for (const problem of mathProblems) {
    try {
      const fixed = fixProblem(db, 'math_problems', problem);
      if (fixed) totalFixed++;
    } catch (err) {
      console.error(`❌ Error fixing math_problem ${problem.id}:`, err);
      totalErrors++;
    }
  }

  db.close();

  console.log(`\n✅ Fixed ${totalFixed} problems`);
  if (totalErrors > 0) {
    console.log(`❌ ${totalErrors} errors encountered`);
  }
}

function fixProblem(db: Database.Database, tableName: string, problem: Problem): boolean {
  if (!problem.options) {
    console.log(`⚠️  Skipping ${problem.id}: No options available`);
    return false;
  }

  let options: string[];
  try {
    options = JSON.parse(problem.options);
  } catch (err) {
    console.log(`⚠️  Skipping ${problem.id}: Invalid JSON in options`);
    return false;
  }

  // Find which option contains the correct answer text
  let correctLetter: string | null = null;
  const normalizedAnswer = problem.correct_answer.toLowerCase().trim();

  for (const option of options) {
    // Options are formatted like "A: answer text" or "A) answer text"
    const match = option.match(/^([A-D])[:\)]?\s*(.+)$/i);
    if (!match) continue;

    const [, letter, text] = match;
    const normalizedText = text.toLowerCase().trim();

    // Check if the option text contains or matches the correct answer
    if (normalizedText === normalizedAnswer || normalizedText.includes(normalizedAnswer)) {
      correctLetter = letter.toUpperCase();
      break;
    }
  }

  if (!correctLetter) {
    console.log(`⚠️  Could not find matching option for "${problem.correct_answer}" in problem ${problem.id}`);
    console.log(`   Options: ${options.join(', ')}`);
    return false;
  }

  // Update the database
  const updateStmt = db.prepare(`
    UPDATE ${tableName}
    SET correct_answer = ?
    WHERE id = ?
  `);

  updateStmt.run(correctLetter, problem.id);

  const display = problem.package_id
    ? `pkg:${problem.package_id} #${problem.problem_number}`
    : `#${problem.problem_number}`;

  console.log(`✓ Fixed ${display}: "${problem.correct_answer}" → "${correctLetter}"`);

  return true;
}

// Run the script
fixMultipleChoiceAnswers();
