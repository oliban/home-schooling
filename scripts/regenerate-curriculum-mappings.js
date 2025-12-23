#!/usr/bin/env node
/**
 * Regenerate curriculum mappings from JSON source files
 * Matches exercises by question_text and creates mappings with current exercise IDs
 */

const Database = require('../backend/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/final-production.db');
const JSON_DIR = path.join(__dirname, '../data/generated');

console.log('=== REGENERATING CURRICULUM MAPPINGS ===\n');
console.log('Database:', DB_PATH);
console.log('JSON source:', JSON_DIR, '\n');

const db = new Database(DB_PATH);

try {
  // Get all JSON files
  const jsonFiles = fs.readdirSync(JSON_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(JSON_DIR, f));

  console.log(`Found ${jsonFiles.length} JSON files\n`);

  // Collect all problems with lgr22_codes from JSON files
  const problemMappings = [];

  for (const file of jsonFiles) {
    const filename = path.basename(file);
    console.log(`Reading ${filename}...`);

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let problems = [];
    let packageName = null;
    let problemsWithCodes = 0;

    // Handle different JSON structures
    if (data.package) {
      packageName = data.package.name;
      problems = data.problems || [];
    } else if (data.packages) {
      // Array of packages at root level
      for (const pkg of data.packages) {
        if (pkg.package && pkg.problems) {
          for (const problem of pkg.problems) {
            if (problem.lgr22_codes && problem.lgr22_codes.length > 0) {
              problemMappings.push({
                question_text: problem.question_text,
                package_name: pkg.package.name,
                lgr22_codes: problem.lgr22_codes,
                source_file: filename
              });
              problemsWithCodes++;
            }
          }
        }
      }
      // Skip the rest of the loop since we already processed
      if (data.packages.length > 0) {
        console.log(`  Found ${problemsWithCodes} problems with LGR22 codes`);
        continue;
      }
    } else if (data.batch && data.batch.packages) {
      // Batch format
      for (const pkg of data.batch.packages) {
        packageName = pkg.package.name;
        problems = problems.concat(pkg.problems || []);
      }
    }

    for (const problem of problems) {
      if (problem.lgr22_codes && problem.lgr22_codes.length > 0) {
        problemMappings.push({
          question_text: problem.question_text,
          package_name: packageName,
          lgr22_codes: problem.lgr22_codes,
          source_file: filename
        });
        problemsWithCodes++;
      }
    }

    console.log(`  Found ${problemsWithCodes} problems with LGR22 codes`);
  }

  console.log(`\nTotal problems with codes: ${problemMappings.length}\n`);

  // Clear existing mappings
  console.log('Clearing existing mappings...');
  const deleted = db.prepare('DELETE FROM exercise_curriculum_mapping').run();
  console.log(`✓ Deleted ${deleted.changes} old mappings\n`);

  // Create new mappings
  console.log('Creating new mappings...');
  let created = 0;
  let matched = 0;
  let unmatched = [];

  const insertMapping = db.prepare(`
    INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
    SELECT 'package_problem', ?, id FROM curriculum_objectives WHERE code = ?
  `);

  for (const mapping of problemMappings) {
    // Find ALL problems in the database with this question_text (handles duplicates)
    const problems = db.prepare(`
      SELECT pp.id, mp.name as package_name
      FROM package_problems pp
      JOIN math_packages mp ON pp.package_id = mp.id
      WHERE pp.question_text = ?
    `).all(mapping.question_text);

    if (problems.length === 0) {
      unmatched.push({
        question: mapping.question_text.substring(0, 60),
        package: mapping.package_name,
        file: mapping.source_file
      });
      continue;
    }

    matched++;

    // Create mapping for each problem instance and each LGR22 code
    for (const problem of problems) {
      for (const code of mapping.lgr22_codes) {
        const result = insertMapping.run(problem.id, code);
        if (result.changes > 0) {
          created++;
        }
      }
    }
  }

  console.log(`✓ Matched ${matched}/${problemMappings.length} problems`);
  console.log(`✓ Created ${created} mappings\n`);

  if (unmatched.length > 0) {
    console.log(`⚠️  ${unmatched.length} problems not found in database:`);
    unmatched.slice(0, 5).forEach(u => {
      console.log(`  - "${u.question}..." (${u.file})`);
    });
    if (unmatched.length > 5) {
      console.log(`  ... and ${unmatched.length - 5} more`);
    }
    console.log();
  }

  // Verify mappings
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_mappings,
      COUNT(DISTINCT exercise_id) as unique_exercises,
      COUNT(DISTINCT objective_id) as unique_objectives
    FROM exercise_curriculum_mapping
  `).get();

  console.log('=== SUMMARY ===');
  console.log(`Total mappings: ${stats.total_mappings}`);
  console.log(`Unique exercises: ${stats.unique_exercises}`);
  console.log(`Unique objectives: ${stats.unique_objectives}\n`);

  // Show sample objectives covered
  const objectives = db.prepare(`
    SELECT DISTINCT co.code, co.description
    FROM exercise_curriculum_mapping ecm
    JOIN curriculum_objectives co ON ecm.objective_id = co.id
    ORDER BY co.code
    LIMIT 10
  `).all();

  console.log('Sample objectives covered:');
  objectives.forEach(obj => {
    console.log(`  - ${obj.code}: ${obj.description.substring(0, 60)}...`);
  });

  console.log('\n✅ Mappings regenerated successfully!');
  console.log('Next step: Upload to production');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
