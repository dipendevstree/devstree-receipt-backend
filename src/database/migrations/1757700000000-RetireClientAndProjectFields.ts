import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires client and project fields that the admin panel no longer maintains.
 *
 *   clients:  company_name, alternate_phone, address, city, state, postal_code,
 *             tax_number, notes
 *   projects: expected_end_date, notes
 *
 * None of these columns is referenced by a constraint, index, foreign key,
 * report aggregate or financial calculation. The only readers outside their own
 * module were display-only (client company name on receipts and payment
 * details) and free-text search, all of which were updated in the same change.
 *
 * Dropping a column destroys its values, and some of these hold information an
 * administrator typed in by hand (tax numbers, addresses). So before anything is
 * dropped, every non-empty value is copied into `archived_field_values`, one row
 * per client/project, keyed by the record's id. Nothing is lost: the client and
 * project rows themselves are untouched, and `down()` restores the columns and
 * their values from the archive.
 *
 * Soft-deleted rows are archived too — their history is still history.
 */
export class RetireClientAndProjectFields1757700000000 implements MigrationInterface {
  name = 'RetireClientAndProjectFields1757700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "archived_field_values" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" varchar(32) NOT NULL,
        "entity_id" uuid NOT NULL,
        "field_values" jsonb NOT NULL,
        "reason" varchar(255),
        "archived_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_archived_field_values_entity" ON "archived_field_values" ("entity_type", "entity_id")`,
    );

    // jsonb_strip_nulls drops the keys that were empty, and the WHERE clause
    // skips records that had nothing to preserve at all.
    await queryRunner.query(`
      INSERT INTO "archived_field_values" ("entity_type", "entity_id", "field_values", "reason")
      SELECT 'client', "id",
             jsonb_strip_nulls(jsonb_build_object(
               'company_name', "company_name",
               'alternate_phone', "alternate_phone",
               'address', "address",
               'city', "city",
               'state', "state",
               'postal_code', "postal_code",
               'tax_number', "tax_number",
               'notes', "notes"
             )),
             'Client fields retired by migration 1757700000000'
        FROM "clients"
       WHERE COALESCE("company_name", "alternate_phone", "address", "city", "state",
                      "postal_code", "tax_number", "notes") IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "archived_field_values" ("entity_type", "entity_id", "field_values", "reason")
      SELECT 'project', "id",
             jsonb_strip_nulls(jsonb_build_object(
               'expected_end_date', "expected_end_date",
               'notes', "notes"
             )),
             'Project fields retired by migration 1757700000000'
        FROM "projects"
       WHERE "expected_end_date" IS NOT NULL OR "notes" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "clients"
        DROP COLUMN IF EXISTS "company_name",
        DROP COLUMN IF EXISTS "alternate_phone",
        DROP COLUMN IF EXISTS "address",
        DROP COLUMN IF EXISTS "city",
        DROP COLUMN IF EXISTS "state",
        DROP COLUMN IF EXISTS "postal_code",
        DROP COLUMN IF EXISTS "tax_number",
        DROP COLUMN IF EXISTS "notes"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "expected_end_date",
        DROP COLUMN IF EXISTS "notes"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Same types as InitialSchema, so the restored columns are indistinguishable
    // from the originals.
    await queryRunner.query(`
      ALTER TABLE "clients"
        ADD COLUMN IF NOT EXISTS "company_name" varchar(160),
        ADD COLUMN IF NOT EXISTS "alternate_phone" varchar(24),
        ADD COLUMN IF NOT EXISTS "address" varchar(255),
        ADD COLUMN IF NOT EXISTS "city" varchar(80),
        ADD COLUMN IF NOT EXISTS "state" varchar(80),
        ADD COLUMN IF NOT EXISTS "postal_code" varchar(20),
        ADD COLUMN IF NOT EXISTS "tax_number" varchar(40),
        ADD COLUMN IF NOT EXISTS "notes" text
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "expected_end_date" date,
        ADD COLUMN IF NOT EXISTS "notes" text
    `);

    await queryRunner.query(`
      UPDATE "clients" c
         SET "company_name"    = a."field_values"->>'company_name',
             "alternate_phone" = a."field_values"->>'alternate_phone',
             "address"         = a."field_values"->>'address',
             "city"            = a."field_values"->>'city',
             "state"           = a."field_values"->>'state',
             "postal_code"     = a."field_values"->>'postal_code',
             "tax_number"      = a."field_values"->>'tax_number',
             "notes"           = a."field_values"->>'notes'
        FROM "archived_field_values" a
       WHERE a."entity_type" = 'client' AND a."entity_id" = c."id"
    `);
    await queryRunner.query(`
      UPDATE "projects" p
         SET "expected_end_date" = (a."field_values"->>'expected_end_date')::date,
             "notes"             = a."field_values"->>'notes'
        FROM "archived_field_values" a
       WHERE a."entity_type" = 'project' AND a."entity_id" = p."id"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "archived_field_values"`);
  }
}
