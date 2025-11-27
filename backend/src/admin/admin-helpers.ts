import { DataSource } from 'typeorm';

/**
 * Lightweight helpers used by admin endpoints.
 * Adapt revokeSessionsForUser / sendUserNotification / createAuditEntry to your storage and mailer.
 *
 * This file uses the TypeORM manager/query interface (a QueryRunner.manager or Connection.manager).
 * It is intentionally defensive — if tables or fields are absent the helpers won't throw (they will log).
 */

export async function revokeSessionsForUser(dataSource: DataSource, manager: any, userId: number) {
  try {
    // Try deleting sessions rows (if you store sessions in a DB table named user_sessions)
    await manager.query?.(`DELETE FROM user_sessions WHERE "userId" = $1`, [userId]);
  } catch (err) {
    // table may not exist — log and continue
    // eslint-disable-next-line no-console
    console.warn('revokeSessionsForUser: delete user_sessions failed (table may not exist)', err?.message ?? err);
  }

  try {
    // Try incrementing tokenVersion/token_version on users table to invalidate JWTs which check tokenVersion
    // NOTE: database table name in your project is "user" (not "users") — update accordingly
    await manager.query?.(`UPDATE "user" SET "tokenVersion" = COALESCE("tokenVersion", 0) + 1 WHERE id = $1`, [userId]);
  } catch (err) {
    // ignore if field/table not present
  }

  try {
    await manager.query?.(`UPDATE "user" SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1`, [userId]);
  } catch (err) {
    // ignore
  }

  // If you use Redis or another session store, integrate revocation there as well.
}

export async function createAuditEntry(dataSource: DataSource, manager: any, entry: { adminId: number | string; targetUserId: number | string; action: string; ip?: string; meta?: any }) {
  const now = new Date();
  const metaJson = entry.meta ? JSON.stringify(entry.meta) : null;
  try {
    await manager.query?.(
      `INSERT INTO admin_audit (admin_id, target_user_id, action, ip, meta, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.adminId ?? null, entry.targetUserId ?? null, entry.action, entry.ip ?? null, metaJson, now],
    );
  } catch (err) {
    // audit table may be missing; fallback to console logging
    // eslint-disable-next-line no-console
    console.warn('createAuditEntry: failed to write audit record (table may not exist). Falling back to console log.', err?.message ?? err);
    // eslint-disable-next-line no-console
    console.info('AUDIT FALLBACK', { adminId: entry.adminId, targetUserId: entry.targetUserId, action: entry.action, ip: entry.ip, meta: entry.meta, when: now.toISOString() });
  }
}

export async function sendUserNotification(options: { to: string; subject: string; body: string }) {
  try {
    // Replace this with your mailer/queue integration (Nodemailer, SES, SendGrid, etc.)
    // eslint-disable-next-line no-console
    console.info('sendUserNotification (placeholder) ->', { to: options.to, subject: options.subject });
    // Example: await mailer.sendMail({ to: options.to, subject: options.subject, html: options.body });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('sendUserNotification error', err?.message ?? err);
  }
}