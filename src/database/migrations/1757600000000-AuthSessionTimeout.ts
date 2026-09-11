import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every refresh token an absolute session deadline.
 *
 * Rotation previously issued a fresh 7-day refresh token each time, so an
 * actively used session never actually ended. `session_expires_at` is fixed at
 * sign-in and inherited unchanged by every rotation, capping a login session at
 * AUTH_SESSION_TIMEOUT_MINUTES (540 by default).
 *
 * Existing rows are backfilled from their own creation time, so sessions opened
 * before this migration are capped from when they actually started rather than
 * being granted a fresh nine hours.
 */
export class AuthSessionTimeout1757600000000 implements MigrationInterface {
  name = 'AuthSessionTimeout1757600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD COLUMN "session_expires_at" timestamptz`);

    await queryRunner.query(`
      UPDATE "refresh_tokens"
         SET "session_expires_at" = LEAST("expires_at", "created_at" + interval '540 minutes')
       WHERE "session_expires_at" IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "session_expires_at" SET NOT NULL`,
    );

    // Supports the expiry sweep and keeps lookups on live sessions cheap.
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_session_expires_at" ON "refresh_tokens" ("session_expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_session_expires_at"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "session_expires_at"`,
    );
  }
}
