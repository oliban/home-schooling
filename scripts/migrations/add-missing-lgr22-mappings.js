#!/usr/bin/env node
/**
 * ONE-TIME MIGRATION: Add missing LGR22 curriculum mappings
 *
 * Adds LGR22 codes to 2 packages that were created before validation was added:
 * 1. Addition & Subtraktion - Årskurs 3, Super Mario (10 problems)
 * 2. Ekvationer & Sannolikhet - Årskurs 6, Minecraft & One Piece (20 problems)
 *
 * This script is idempotent - safe to run multiple times.
 */

const Database = require('../../backend/node_modules/better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/teacher.db');

console.log('=== ADDING MISSING LGR22 CURRICULUM MAPPINGS ===\n');
console.log('Database:', DB_PATH);
console.log('Date:', new Date().toISOString(), '\n');

const db = new Database(DB_PATH);

try {
  // Package 1: Addition & Subtraktion - Årskurs 3, Super Mario
  const package1Id = '0109712e-b3d2-44f3-853b-a7e7c56d3d32';
  const package1Name = 'Addition & Subtraktion - Årskurs 3, Super Mario';

  // Package 2: Ekvationer & Sannolikhet - Årskurs 6, Minecraft & One Piece
  const package2Id = 'bb645fa8-f3f1-48f7-bbe1-65d97eebe985';
  const package2Name = 'Ekvationer & Sannolikhet - Årskurs 6, Minecraft & One Piece';

  // Check if packages exist
  const pkg1 = db.prepare('SELECT id, name FROM math_packages WHERE id = ?').get(package1Id);
  const pkg2 = db.prepare('SELECT id, name FROM math_packages WHERE id = ?').get(package2Id);

  if (!pkg1 && !pkg2) {
    console.log('✓ Neither package found - migration may have already run or packages were deleted');
    console.log('  Nothing to do.\n');
    process.exit(0);
  }

  let totalMappingsAdded = 0;

  db.transaction(() => {
    // Helper to add mapping (INSERT OR IGNORE for idempotency)
    const addMapping = db.prepare(`
      INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
      SELECT 'package_problem', ?, id FROM curriculum_objectives WHERE code = ?
    `);

    // Package 1: Addition & Subtraktion (Grade 3)
    if (pkg1) {
      console.log(`Processing: ${pkg1.name}`);

      const problems1 = db.prepare(
        'SELECT id, problem_number FROM package_problems WHERE package_id = ? ORDER BY problem_number'
      ).all(package1Id);

      console.log(`  Found ${problems1.length} problems`);

      // All problems are addition/subtraction word problems for grade 3
      // Codes: MA-TAL-01 (Natural numbers), MA-PRO-03 (Problem solving with +/-)
      const codes1 = ['MA-TAL-01', 'MA-PRO-03'];

      problems1.forEach(p => {
        codes1.forEach(code => {
          const result = addMapping.run(p.id, code);
          if (result.changes > 0) {
            totalMappingsAdded++;
          }
        });
      });

      console.log(`  ✓ Added mappings with codes: ${codes1.join(', ')}\n`);
    }

    // Package 2: Ekvationer & Sannolikhet (Grade 6)
    if (pkg2) {
      console.log(`Processing: ${pkg2.name}`);

      const problems2 = db.prepare(
        'SELECT id, problem_number FROM package_problems WHERE package_id = ? ORDER BY problem_number'
      ).all(package2Id);

      console.log(`  Found ${problems2.length} problems`);

      problems2.forEach(p => {
        let codes = [];

        if (p.problem_number <= 10) {
          // Problems 1-10: Equation solving
          codes = ['MA-ALG-04', 'MA-PRO-04'];
        } else {
          // Problems 11-20: Probability
          codes = ['MA-SAN-03', 'MA-PRO-04'];
        }

        codes.forEach(code => {
          const result = addMapping.run(p.id, code);
          if (result.changes > 0) {
            totalMappingsAdded++;
          }
        });
      });

      console.log(`  ✓ Problems 1-10 mapped to: MA-ALG-04, MA-PRO-04`);
      console.log(`  ✓ Problems 11-20 mapped to: MA-SAN-03, MA-PRO-04\n`);
    }
  })();

  // Verify results
  console.log('=== VERIFICATION ===');

  if (pkg1) {
    const count1 = db.prepare(`
      SELECT COUNT(DISTINCT pp.id) as mapped_problems
      FROM package_problems pp
      JOIN exercise_curriculum_mapping ecm ON pp.id = ecm.exercise_id AND ecm.exercise_type = 'package_problem'
      WHERE pp.package_id = ?
    `).get(package1Id);

    console.log(`${package1Name}:`);
    console.log(`  ${count1.mapped_problems}/10 problems now have LGR22 mappings`);
  }

  if (pkg2) {
    const count2 = db.prepare(`
      SELECT COUNT(DISTINCT pp.id) as mapped_problems
      FROM package_problems pp
      JOIN exercise_curriculum_mapping ecm ON pp.id = ecm.exercise_id AND ecm.exercise_type = 'package_problem'
      WHERE pp.package_id = ?
    `).get(package2Id);

    console.log(`${package2Name}:`);
    console.log(`  ${count2.mapped_problems}/20 problems now have LGR22 mappings`);
  }

  console.log(`\n✅ Migration complete! Added ${totalMappingsAdded} new curriculum mappings.`);

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
