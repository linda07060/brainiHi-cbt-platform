/**
 * Seed script to create an initial admin user from environment variables.
 *
 * Usage (dev):
 *  npx ts-node src/scripts/seed-admin.ts
 *
 * Production:
 *  - Build project (npm run build) and run with node:
 *    node dist/src/scripts/seed-admin.js
 *
 * Environment variables used:
 *  ADMIN_INIT_EMAIL
 *  ADMIN_INIT_PASSWORD
 *
 * Note: Adjust path to your data source if different (this script expects TypeORM DataSource at src/data-source.ts).
 */

import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Admin } from '../admin/admin.entity';
import { User } from '../user/user.entity';

// Try to import your project's data source file.
// If your project keeps data source at a different path, update the import accordingly.
let AppDataSource: DataSource;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppDataSource = require('../data-source').default;
} catch (err) {
  console.error('Unable to load data-source at src/data-source.ts. Please run this script with the correct data-source import path.');
  process.exit(1);
}

async function run() {
  const email = process.env.ADMIN_INIT_EMAIL;
  const password = process.env.ADMIN_INIT_PASSWORD;

  if (!email || !password) {
    console.log('ADMIN_INIT_EMAIL and ADMIN_INIT_PASSWORD are not set. Skipping admin seed.');
    process.exit(0);
  }

  await AppDataSource.initialize();

  const adminRepo = AppDataSource.getRepository(Admin);
  const existing = await adminRepo.findOne({ where: { email } });
  if (existing) {
    console.log('Admin already exists. Skipping creation.');
    await AppDataSource.destroy();
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = adminRepo.create({ email, password: hashed, role: 'admin' } as any);
  await adminRepo.save(admin);

  console.log(`Admin created: ${email}`);
  await AppDataSource.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});