"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionalProjectAmount1757500000000 = void 0;
class OptionalProjectAmount1757500000000 {
    name = 'OptionalProjectAmount1757500000000';
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encrypted_amount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_iv" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_auth_tag" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" DROP DEFAULT`);
        await queryRunner.query(`
      ALTER TABLE "projects"
        ADD CONSTRAINT "chk_projects_amount_complete"
        CHECK (
          (encrypted_amount IS NULL AND amount_iv IS NULL AND amount_auth_tag IS NULL AND encryption_key_version IS NULL)
          OR
          (encrypted_amount IS NOT NULL AND amount_iv IS NOT NULL AND amount_auth_tag IS NOT NULL AND encryption_key_version IS NOT NULL)
        )
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_projects_has_amount" ON "projects" (("encrypted_amount" IS NOT NULL)) WHERE "deleted_at" IS NULL`);
    }
    async down(queryRunner) {
        const [{ count }] = (await queryRunner.query(`SELECT count(*)::int AS count FROM "projects" WHERE "encrypted_amount" IS NULL`));
        if (count > 0) {
            throw new Error(`Cannot revert: ${count} project(s) have no defined amount. Assign an amount to them first — this migration will not fabricate ciphertext.`);
        }
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_has_amount"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_projects_amount_complete"`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" SET DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encryption_key_version" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_auth_tag" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "amount_iv" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "encrypted_amount" SET NOT NULL`);
    }
}
exports.OptionalProjectAmount1757500000000 = OptionalProjectAmount1757500000000;
//# sourceMappingURL=1757500000000-OptionalProjectAmount.js.map