import { DataSource } from 'typeorm';
import { Admin } from './admin.entity';
import * as bcrypt from 'bcrypt';

/**
 * Seed an initial admin account if none exists.
 * - Uses ADMIN_INIT_EMAIL and ADMIN_INIT_PASSWORD env vars.
 * - Optional: set ADMIN_SEED='false' to disable seeding.
 * - Idempotent: only inserts when admin table is empty.
 */
export async function seedAdmin(dataSource: DataSource) {
  try {
    const allowSeed = (process.env.ADMIN_SEED ?? 'true').toLowerCase() !== 'false';
    if (!allowSeed) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[admin.seeder] seeding disabled via ADMIN_SEED=false');
      }
      return;
    }

    const email = (process.env.ADMIN_INIT_EMAIL || '').toString().trim().toLowerCase();
    const password = (process.env.ADMIN_INIT_PASSWORD || '').toString();

    if (!email || !password) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[admin.seeder] ADMIN_INIT_EMAIL or ADMIN_INIT_PASSWORD not set; skipping admin seed');
      }
      return;
    }

    const adminRepo = dataSource.getRepository(Admin);

    // If any admin exists, do nothing
    const existing = await adminRepo.findOne({ where: {} });
    if (existing) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[admin.seeder] admin already exists; skipping seed');
      }
      return;
    }

    // Hash password and insert admin
    const hashed = await bcrypt.hash(password, 10);
    const admin = adminRepo.create({ email, password: hashed, role: 'admin' });
    await adminRepo.save(admin);

    // Non-sensitive log (do not print password)
    // eslint-disable-next-line no-console
    console.info(`[admin.seeder] created initial admin account for email=${email}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[admin.seeder] seeding failed', err);
  }
}