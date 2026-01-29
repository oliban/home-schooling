/**
 * Database and core functionality tests
 * Converted from test-all.ts to Vitest
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Database', () => {
  it('should initialize connection', () => {
    const db = getDb();
    expect(db.connection).toBeDefined();
  });

  it('should have math categories seeded', () => {
    const db = getDb();
    const categories = db.all<{ id: string }>('SELECT id FROM math_categories');
    expect(categories.length).toBe(11); // 6 math + 1 reading + 4 english
  });

  it('should have collectibles seeded', () => {
    const db = getDb();
    const collectibles = db.all<{ id: string }>('SELECT id FROM collectibles');
    expect(collectibles.length).toBeGreaterThan(0);
  });

  it('should have curriculum objectives seeded', () => {
    const db = getDb();
    const objectives = db.all<{ id: number; category_id: string; code: string }>(
      'SELECT id, category_id, code FROM curriculum_objectives'
    );
    expect(objectives.length).toBeGreaterThan(0);
    // Should have objectives for all 11 categories (6 math + 1 reading + 4 english)
    const categories = new Set(objectives.map(o => o.category_id));
    expect(categories.size).toBe(11);
  });

  it('should have curriculum objectives with valid structure', () => {
    const db = getDb();
    const objective = db.get<{
      id: number;
      category_id: string;
      code: string;
      description: string;
      grade_levels: string
    }>(
      'SELECT id, category_id, code, description, grade_levels FROM curriculum_objectives LIMIT 1'
    );
    expect(objective).toBeDefined();
    expect(objective?.code).toMatch(/^MA-[A-Z]{3}-\d+$/);
    expect(objective?.description).toBeDefined();
    // grade_levels should be valid JSON array
    const gradeLevels = JSON.parse(objective!.grade_levels);
    expect(Array.isArray(gradeLevels)).toBe(true);
    expect(gradeLevels.length).toBeGreaterThan(0);
  });
});

describe('User and Assignment Flow', () => {
  // Test data IDs - scoped to this describe block
  let parentId: string;
  let childId: string;
  let assignmentId: string;
  const testEmail = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    parentId = uuidv4();
    childId = uuidv4();
    assignmentId = uuidv4();

    const db = getDb();

    // Create parent
    const passwordHash = await bcrypt.hash('test1234', 10);
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );

    // Create child
    const pinHash = await bcrypt.hash('1234', 10);
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);
  });

  afterAll(() => {
    // Cleanup test data - cascade deletes children, assignments, etc.
    const db = getDb();
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
  });

  it('should create parent account', () => {
    const db = getDb();
    const parent = db.get<{ id: string }>('SELECT id FROM parents WHERE id = ?', [parentId]);
    expect(parent).toBeDefined();
    expect(parent?.id).toBe(parentId);
  });

  it('should create child profile', () => {
    const db = getDb();
    const child = db.get<{ id: string }>('SELECT id FROM children WHERE id = ?', [childId]);
    expect(child).toBeDefined();
    expect(child?.id).toBe(childId);
  });

  it('should verify child PIN', async () => {
    const db = getDb();
    const child = db.get<{ pin_hash: string }>('SELECT pin_hash FROM children WHERE id = ?', [childId]);
    expect(child).toBeDefined();
    const valid = await bcrypt.compare('1234', child!.pin_hash);
    expect(valid).toBe(true);
  });

  it('should create math assignment', () => {
    const db = getDb();
    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status)
       VALUES (?, ?, ?, 'math', 'Test Matte', 4, 'pending')`,
      [assignmentId, parentId, childId]
    );

    // Add a problem
    db.run(
      `INSERT INTO math_problems (id, assignment_id, problem_number, question_text, correct_answer, answer_type)
       VALUES (?, ?, 1, 'Vad är 5 + 3?', '8', 'number')`,
      [uuidv4(), assignmentId]
    );

    const assignment = db.get<{ id: string }>('SELECT id FROM assignments WHERE id = ?', [assignmentId]);
    expect(assignment).toBeDefined();
    expect(assignment?.id).toBe(assignmentId);
  });

  it('should submit answer and earn coins', () => {
    const db = getDb();
    const problem = db.get<{ id: string; correct_answer: string }>(
      'SELECT id, correct_answer FROM math_problems WHERE assignment_id = ?',
      [assignmentId]
    );
    expect(problem).toBeDefined();

    // Submit correct answer
    db.run(
      'UPDATE math_problems SET child_answer = ?, is_correct = 1 WHERE id = ?',
      ['8', problem!.id]
    );

    // Award coins
    db.run('UPDATE child_coins SET balance = balance + 10 WHERE child_id = ?', [childId]);

    const coins = db.get<{ balance: number }>('SELECT balance FROM child_coins WHERE child_id = ?', [childId]);
    expect(coins).toBeDefined();
    expect(coins?.balance).toBe(10);
  });

  it('should purchase collectible', () => {
    const db = getDb();

    // Give enough coins
    db.run('UPDATE child_coins SET balance = 200 WHERE child_id = ?', [childId]);

    // Find a collectible to buy
    const collectible = db.get<{ id: string; price: number }>('SELECT id, price FROM collectibles LIMIT 1');
    expect(collectible).toBeDefined();

    // Purchase
    db.run('UPDATE child_coins SET balance = balance - ? WHERE child_id = ?', [collectible!.price, childId]);
    db.run('INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)', [childId, collectible!.id]);

    const owned = db.get<{ collectible_id: string }>(
      'SELECT collectible_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
      [childId, collectible!.id]
    );
    expect(owned).toBeDefined();
    expect(owned?.collectible_id).toBe(collectible!.id);
  });
});
