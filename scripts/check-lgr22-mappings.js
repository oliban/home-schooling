#!/usr/bin/env node
/**
 * Check for packages and problems missing LGR22 curriculum mappings
 * Reports packages that need LGR22 codes added
 */

const Database = require('../backend/node_modules/better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/teacher.db');

console.log('=== CHECKING LGR22 CURRICULUM MAPPINGS ===\n');
console.log('Database:', DB_PATH, '\n');

const db = new Database(DB_PATH, { readonly: true });

try {
  // Find packages with problems but no LGR22 mappings
  const packagesWithoutMappings = db.prepare(`
    SELECT
      mp.id,
      mp.name,
      mp.grade_level,
      mp.assignment_type,
      mp.is_global,
      COUNT(DISTINCT pp.id) as total_problems,
      COUNT(DISTINCT ecm.exercise_id) as problems_with_lgr22
    FROM math_packages mp
    LEFT JOIN package_problems pp ON mp.id = pp.package_id
    LEFT JOIN exercise_curriculum_mapping ecm
      ON pp.id = ecm.exercise_id AND ecm.exercise_type = 'package_problem'
    WHERE mp.is_active = 1
    GROUP BY mp.id
    HAVING total_problems > 0 AND problems_with_lgr22 = 0
    ORDER BY mp.grade_level, mp.name
  `).all();

  if (packagesWithoutMappings.length === 0) {
    console.log('✅ All packages have LGR22 curriculum mappings!\n');
  } else {
    console.log(`⚠️  Found ${packagesWithoutMappings.length} package(s) without LGR22 mappings:\n`);

    packagesWithoutMappings.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   - Package ID: ${pkg.id}`);
      console.log(`   - Grade Level: ${pkg.grade_level}`);
      console.log(`   - Type: ${pkg.assignment_type}`);
      console.log(`   - Global: ${pkg.is_global ? 'Yes' : 'No'}`);
      console.log(`   - Problems: ${pkg.total_problems}`);

      // Check if package has any assignments
      const assignments = db.prepare(`
        SELECT a.id, a.title, c.name as child_name
        FROM assignments a
        JOIN children c ON a.child_id = c.id
        WHERE a.package_id = ?
        LIMIT 5
      `).all(pkg.id);

      if (assignments.length > 0) {
        console.log(`   - Assignments: ${assignments.length} active`);
        assignments.forEach(a => {
          console.log(`     • "${a.title}" for ${a.child_name}`);
        });
      }
      console.log();
    });
  }

  // Statistics
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT mp.id) as total_packages,
      COUNT(DISTINCT pp.id) as total_problems,
      COUNT(DISTINCT ecm.exercise_id) as problems_with_mappings
    FROM math_packages mp
    LEFT JOIN package_problems pp ON mp.id = pp.package_id
    LEFT JOIN exercise_curriculum_mapping ecm
      ON pp.id = ecm.exercise_id AND ecm.exercise_type = 'package_problem'
    WHERE mp.is_active = 1
  `).get();

  const coverage = stats.total_problems > 0
    ? ((stats.problems_with_mappings / stats.total_problems) * 100).toFixed(1)
    : '0.0';

  console.log('=== STATISTICS ===');
  console.log(`Total active packages: ${stats.total_packages}`);
  console.log(`Total problems: ${stats.total_problems}`);
  console.log(`Problems with LGR22 mappings: ${stats.problems_with_mappings}`);
  console.log(`Coverage: ${coverage}%\n`);

  // Sample LGR22 objectives in use
  const objectives = db.prepare(`
    SELECT DISTINCT co.code, co.description
    FROM exercise_curriculum_mapping ecm
    JOIN curriculum_objectives co ON ecm.objective_id = co.id
    WHERE ecm.exercise_type = 'package_problem'
    ORDER BY co.code
    LIMIT 10
  `).all();

  if (objectives.length > 0) {
    console.log('Sample LGR22 objectives in use:');
    objectives.forEach(obj => {
      console.log(`  - ${obj.code}: ${obj.description.substring(0, 60)}...`);
    });
    console.log();
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
