/**
 * One-time helper to create or update an Admin row in the "admin" table.
 *
 * Usage:
 *   # ensure DATABASE_URL env var is set in this PowerShell session
 *   node .\admin_upsert.js support@brainihi.com 'NewStrongAdminP@ssw0rd!'
 *
 * This script:
 * - Creates the admin row if missing (email unique)
 * - Updates password if admin exists (bcrypt hashed)
 *
 * WARNING: run locally only. Do not commit with plaintext passwords.
 */
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node admin_upsert.js <email> <newPassword>');
    process.exit(2);
  }
  const [email, newPassword] = args;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set.');
    process.exit(3);
  }

  const pool = new Pool({ connectionString });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    // Try update first
    const upd = await pool.query(
      'UPDATE admin SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashed, email]
    );

    if (upd.rowCount > 0) {
      console.log(`Admin updated: ${upd.rows[0].email} (id=${upd.rows[0].id})`);
      process.exit(0);
    }

    // Insert if not exists
    const ins = await pool.query(
      'INSERT INTO admin (email, password, role) VALUES ($1, $2, $3) RETURNING id, email',
      [email, hashed, 'admin']
    );

    console.log(`Admin created: ${ins.rows[0].email} (id=${ins.rows[0].id})`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();