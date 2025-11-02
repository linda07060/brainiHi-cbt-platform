/**
 * Seed script to create an initial admin user in the existing "user" table.
 *
 * Usage (dev):
 *   ADMIN_INIT_EMAIL=support@brainihi.com ADMIN_INIT_PASSWORD=2025support@control \
 *     npx ts-node src/scripts/seed-admin-user.ts
 *
 * After build (production):
 *   # set environment variables in your host (Render/Heroku/whatever)
 *   node dist/src/scripts/seed-admin-user.js
 *
 * Notes:
 * - This script expects your project's TypeORM DataSource to be exported from src/data-source.ts
 *   as the default export (same pattern as other scripts in your project).
 * - It will:
 *    - read ADMIN_INIT_EMAIL and ADMIN_INIT_PASSWORD from env
 *    - skip if a user with that email already exists
 *    - create a user with role = 'admin', a unique user_uid, hashed bcrypt password, active = true
 * - The script does NOT store plaintext passwords. It returns the created user's email and user_uid.
 * - After running, you can sign in via POST /auth/login with the given email/password (the frontend Admin login
 *   that reuses /auth/login will work).
 */

import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';

// Adjust this import if your DataSource is at a different path
let AppDataSource: DataSource;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppDataSource = require('../data-source').default;
} catch (err) {
  console.error('Unable to load data-source at src/data-source.ts. Update the import path if needed.');
  console.error(err);
  process.exit(1);
}

import { User } from '../user/user.entity';

async function run() {
  const email = (process.env.ADMIN_INIT_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_INIT_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_INIT_EMAIL and ADMIN_INIT_PASSWORD environment variables are required.');
    process.exit(1);
  }

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    console.log(`User with email ${email} already exists (id=${existing.id}). Skipping creation.`);
    await AppDataSource.destroy();
    process.exit(0);
  }

  // Generate a short unique user_uid
  let userUid = '';
  for (;;) {
    userUid = 'u' + crypto.randomBytes(6).toString('hex'); // ~12 hex chars
    const found = await userRepo.findOne({ where: { user_uid: userUid } });
    if (!found) break;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = userRepo.create({
    email,
    password: hashed,
    name: 'Administrator',
    role: 'admin',
    user_uid: userUid,
    active: true,
    plan: 'Free',
  } as any);

  await userRepo.save(user);
  console.log(`Admin user created: ${email} (user_uid=${userUid}, id=${(user as any).id})`);

  await AppDataSource.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('Admin seed failed:', err);
  process.exit(1);
});