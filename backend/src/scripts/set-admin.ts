#!/usr/bin/env node
/**
 * Script to promote or demote parent accounts to/from admin status
 * Usage:
 *   npm run admin:set <email> promote
 *   npm run admin:set <email> demote
 */

import { getDb } from '../data/database.js';

const email = process.argv[2];
const action = process.argv[3] || 'promote';

if (!email) {
  console.error('Usage: npm run admin:set <email> [promote|demote]');
  process.exit(1);
}

if (action !== 'promote' && action !== 'demote') {
  console.error('Action must be "promote" or "demote"');
  process.exit(1);
}

try {
  const db = getDb();
  const is_admin = action === 'promote' ? 1 : 0;

  // Check if parent exists
  const parent = db.get<{ id: string; email: string; name: string; is_admin: number }>(
    'SELECT id, email, name, is_admin FROM parents WHERE email = ?',
    [email.toLowerCase()]
  );

  if (!parent) {
    console.error(`❌ Parent with email "${email}" not found`);
    process.exit(1);
  }

  // Check if already in desired state
  if (parent.is_admin === is_admin) {
    const status = is_admin === 1 ? 'already an admin' : 'not an admin';
    console.log(`ℹ️  ${parent.name} (${parent.email}) is ${status}`);
    process.exit(0);
  }

  // Update admin status
  db.run(
    'UPDATE parents SET is_admin = ? WHERE email = ?',
    [is_admin, email.toLowerCase()]
  );

  const newStatus = is_admin === 1 ? 'promoted to admin' : 'demoted from admin';
  console.log(`✅ ${parent.name} (${parent.email}) has been ${newStatus}`);
  console.log(`\nNote: The user must log in again to receive a new token with updated permissions.`);

} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
