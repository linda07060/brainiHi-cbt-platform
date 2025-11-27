import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { seedAdmin } from './admin/admin.seeder';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow both Vercel frontend and localhost for development
  const allowedOrigins = [
    'https://braini-hi-cbt-platform.vercel.app', // Vercel production frontend
    'http://localhost:3000',                     // Local development frontend
  ];

  // If you use FRONTEND_ORIGIN env variable, add it dynamically
  if (process.env.FRONTEND_ORIGIN && !allowedOrigins.includes(process.env.FRONTEND_ORIGIN)) {
    allowedOrigins.push(process.env.FRONTEND_ORIGIN);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[NestApplication] Server started on port ${port}`);

  // After the app has started and TypeORM DataSource is available from DI,
  // perform a safe, idempotent startup cleanup to fix NULL emails in the user table.
  // This avoids TypeORM's synchronize attempting to set NOT NULL when legacy rows have NULL.
  try {
    const ds = app.get<DataSource>(DataSource);
    if (ds && ds.isInitialized) {
      try {
        // Run an idempotent UPDATE: set a unique placeholder email for any users missing an email.
        // The placeholder includes the id so it will be unique and easily identifiable for later cleanup.
        const updated = await ds.query(`
          UPDATE "user"
          SET email = ('missing_email_' || id || '@local.invalid')
          WHERE email IS NULL
          RETURNING id;
        `);

        // `updated` is an array of rows returned by RETURNING; length indicates how many were fixed.
        const fixedCount = Array.isArray(updated) ? updated.length : 0;
        if (fixedCount > 0) {
          // eslint-disable-next-line no-console
          console.info(`[startup-cleanup] fixed ${fixedCount} user rows with NULL email`);
        } else {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('[startup-cleanup] no NULL user.email rows found');
          }
        }
      } catch (cleanupErr) {
        // Do not crash the server if the cleanup fails; just log the error for investigation.
        // eslint-disable-next-line no-console
        console.error('[startup-cleanup] failed to update NULL user emails', cleanupErr);
      }

      // Run the admin seeder after cleanup (idempotent). This will create an initial admin if none exists.
      try {
        await seedAdmin(ds);
      } catch (seedErr) {
        // Log seed errors but don't crash the process
        // eslint-disable-next-line no-console
        console.error('[startup-seed] admin seeder failed', seedErr);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('[startup-cleanup] DataSource not available or not initialized; skipping startup cleanup and seeding');
    }
  } catch (err) {
    // Catch any unexpected errors retrieving DataSource from DI
    // eslint-disable-next-line no-console
    console.error('[main] unexpected error during startup cleanup/seeding', err);
  }
}
bootstrap();