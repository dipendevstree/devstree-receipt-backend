import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Project Amount becomes optional.
 *
 * Monthly/retainer engagements ("SEO Monthly Retainer") have no predefined
 * project value — they simply receive a different amount each month. Storing
 * an encrypted 0 for those would be wrong: 0 is a real, meaningful amount and
 * would make every such project look 100% overpaid. NULL is therefore the
 * encoding of "not defined".
 *
 * This migration only relaxes NOT NULL constraints. No existing row is
 * touched, so every project that already has an encrypted amount keeps working
 * exactly as before — `up` is purely additive in effect.
 *
 * `down` restores the constraints, but can only do so if no NULL-amount
 * project exists yet; it fails loudly rather than inventing ciphertext.
 */
export class OptionalProjectAmount1757500000000 implements MigrationInterface {
  name = 'OptionalProjectAmount1757500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encrypted_amount" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_iv" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_auth_tag" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" DROP DEFAULT`,
    );

    // All four columns must be NULL together or all present together. Without
    // this a partially-written row would look "defined" but fail to decrypt.
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD CONSTRAINT "chk_projects_amount_complete"
        CHECK (
          (encrypted_amount IS NULL AND amount_iv IS NULL AND amount_auth_tag IS NULL AND encryption_key_version IS NULL)
          OR
          (encrypted_amount IS NOT NULL AND amount_iv IS NOT NULL AND amount_auth_tag IS NOT NULL AND encryption_key_version IS NOT NULL)
        )
    `);

    // Lets the dashboard count fixed vs. variable projects without a seq scan.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_projects_has_amount" ON "projects" (("encrypted_amount" IS NOT NULL)) WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      `SELECT count(*)::int AS count FROM "projects" WHERE "encrypted_amount" IS NULL`,
    )) as Array<{ count: number }>;

    if (count > 0) {
      throw new Error(
        `Cannot revert: ${count} project(s) have no defined amount. Assign an amount to them first — this migration will not fabricate ciphertext.`,
      );
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_has_amount"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_projects_amount_complete"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" SET DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_auth_tag" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_iv" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encrypted_amount" SET NOT NULL`);
  }
}
