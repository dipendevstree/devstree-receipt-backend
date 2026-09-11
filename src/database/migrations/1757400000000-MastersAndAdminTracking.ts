import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds master reference data and completes admin action tracking.
 *
 *  - `master_items`: all dropdown/reference data, discriminated by `type`.
 *  - `clients.created_by` / `updated_by`: previously missing, so client records
 *    could not be traced to the administrator who touched them.
 *  - Foreign keys for `projects` and `company_settings` attribution columns,
 *    which were plain uuids without referential integrity.
 *  - `receipts.status`, backed by the RECEIPT_STATUS master.
 *
 * Purely additive — no existing data is dropped or rewritten.
 */
export class MastersAndAdminTracking1757400000000 implements MigrationInterface {
  name = 'MastersAndAdminTracking1757400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Master reference data ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "master_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" varchar(32) NOT NULL,
        "name" varchar(120) NOT NULL,
        "code" varchar(64) NOT NULL,
        "description" varchar(255),
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "sort_order" int NOT NULL DEFAULT 0,
        "is_system" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_master_items_type_code" UNIQUE ("type", "code")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_master_items_type" ON "master_items" ("type")`);
    await queryRunner.query(
      `CREATE INDEX "idx_master_items_type_status" ON "master_items" ("type", "status")`,
    );

    // ── Client attribution ─────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN "created_by" uuid`);
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN "updated_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "fk_clients_created_by"
         FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "fk_clients_updated_by"
         FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_clients_created_by" ON "clients" ("created_by")`);

    // ── Project attribution integrity ──────────────────────────
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "fk_projects_created_by"
         FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "fk_projects_updated_by"
         FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_projects_created_by" ON "projects" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_created_by" ON "payments" ("created_by")`);

    await queryRunner.query(
      `ALTER TABLE "company_settings" ADD CONSTRAINT "fk_company_settings_updated_by"
         FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    // ── Receipt status ─────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD COLUMN "status" varchar(16) NOT NULL DEFAULT 'GENERATED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN IF EXISTS "status"`);

    await queryRunner.query(
      `ALTER TABLE "company_settings" DROP CONSTRAINT IF EXISTS "fk_company_settings_updated_by"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "fk_projects_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "fk_projects_created_by"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_clients_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "fk_clients_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "fk_clients_created_by"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "updated_by"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "created_by"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "master_items"`);
  }
}
