/**
 * Comprehensive test script for the Home Schooling backend
 * Run with: npx tsx src/test-all.ts
 */

import { getDb } from './data/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Home Schooling - Backend Tests');
  console.log('='.repeat(50));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: Database connection
  if (await test('Database initialization', () => {
    const db = getDb();
    if (!db.connection) throw new Error('No connection');
  })) passed++; else failed++;

  // Test 2: Math categories seeded
  if (await test('Math categories are seeded', () => {
    const db = getDb();
    const categories = db.all<{ id: string }>('SELECT id FROM math_categories');
    if (categories.length !== 6) throw new Error(`Expected 6, got ${categories.length}`);
  })) passed++; else failed++;

  // Test 3: Collectibles seeded
  if (await test('Collectibles are seeded', () => {
    const db = getDb();
    const collectibles = db.all<{ id: string }>('SELECT id FROM collectibles');
    if (collectibles.length !== 8) throw new Error(`Expected 8, got ${collectibles.length}`);
  })) passed++; else failed++;

  // Test 4: Create parent
  const parentId = uuidv4();
  const testEmail = `test-${Date.now()}@example.com`;
  if (await test('Create parent account', async () => {
    const db = getDb();
    const passwordHash = await bcrypt.hash('test1234', 10);
    db.run(
      'INSERT INTO parents (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [parentId, testEmail, passwordHash, 'Test Parent']
    );
    const parent = db.get<{ id: string }>('SELECT id FROM parents WHERE id = ?', [parentId]);
    if (!parent) throw new Error('Parent not created');
  })) passed++; else failed++;

  // Test 5: Create child
  const childId = uuidv4();
  if (await test('Create child profile', async () => {
    const db = getDb();
    const pinHash = await bcrypt.hash('1234', 10);
    db.run(
      'INSERT INTO children (id, parent_id, name, grade_level, pin_hash) VALUES (?, ?, ?, ?, ?)',
      [childId, parentId, 'Test Child', 4, pinHash]
    );
    db.run('INSERT INTO child_coins (child_id) VALUES (?)', [childId]);
    const child = db.get<{ id: string }>('SELECT id FROM children WHERE id = ?', [childId]);
    if (!child) throw new Error('Child not created');
  })) passed++; else failed++;

  // Test 6: Verify PIN
  if (await test('Verify child PIN', async () => {
    const db = getDb();
    const child = db.get<{ pin_hash: string }>('SELECT pin_hash FROM children WHERE id = ?', [childId]);
    if (!child) throw new Error('Child not found');
    const valid = await bcrypt.compare('1234', child.pin_hash);
    if (!valid) throw new Error('PIN verification failed');
  })) passed++; else failed++;

  // Test 7: Create math assignment
  const assignmentId = uuidv4();
  if (await test('Create math assignment', () => {
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
    if (!assignment) throw new Error('Assignment not created');
  })) passed++; else failed++;

  // Test 8: Answer problem and earn coins
  if (await test('Submit answer and earn coins', () => {
    const db = getDb();
    const problem = db.get<{ id: string; correct_answer: string }>(
      'SELECT id, correct_answer FROM math_problems WHERE assignment_id = ?',
      [assignmentId]
    );
    if (!problem) throw new Error('Problem not found');

    // Submit correct answer
    db.run(
      'UPDATE math_problems SET child_answer = ?, is_correct = 1 WHERE id = ?',
      ['8', problem.id]
    );

    // Award coins
    db.run('UPDATE child_coins SET balance = balance + 10 WHERE child_id = ?', [childId]);

    const coins = db.get<{ balance: number }>('SELECT balance FROM child_coins WHERE child_id = ?', [childId]);
    if (!coins || coins.balance !== 10) throw new Error(`Expected 10 coins, got ${coins?.balance}`);
  })) passed++; else failed++;

  // Test 9: Purchase collectible
  if (await test('Purchase collectible', () => {
    const db = getDb();

    // Give enough coins
    db.run('UPDATE child_coins SET balance = 100 WHERE child_id = ?', [childId]);

    // Buy meatballo (costs 100)
    const collectible = db.get<{ id: string; price: number }>('SELECT id, price FROM collectibles WHERE id = ?', ['meatballo']);
    if (!collectible) throw new Error('Collectible not found');

    db.run('UPDATE child_coins SET balance = balance - ? WHERE child_id = ?', [collectible.price, childId]);
    db.run('INSERT INTO child_collectibles (child_id, collectible_id) VALUES (?, ?)', [childId, 'meatballo']);

    const owned = db.get<{ collectible_id: string }>(
      'SELECT collectible_id FROM child_collectibles WHERE child_id = ? AND collectible_id = ?',
      [childId, 'meatballo']
    );
    if (!owned) throw new Error('Purchase not recorded');
  })) passed++; else failed++;

  // Cleanup
  if (await test('Cleanup test data', () => {
    const db = getDb();
    db.run('DELETE FROM parents WHERE id = ?', [parentId]);
    // Cascades to children, assignments, etc.
  })) passed++; else failed++;

  console.log('');
  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
