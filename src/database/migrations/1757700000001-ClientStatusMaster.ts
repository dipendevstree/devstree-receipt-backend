import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the Client Statuses master collection, so the client form sources its
 * status options from master data like project and payment statuses already do.
 *
 * The codes mirror the `client_status_enum` column type, so both rows are system
 * records: an administrator may rename or reorder them, but not re-code or delete
 * them. Existing rows are left untouched, which keeps this safe to run on a
 * database where the seed has already created them.
 */
export class ClientStatusMaster1757700000001 implements MigrationInterface {
  name = 'ClientStatusMaster1757700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "master_items" ("type", "name", "code", "status", "sort_order", "is_system")
      VALUES
        ('CLIENT_STATUS', 'Active', 'ACTIVE', 'ACTIVE', 10, true),
        ('CLIENT_STATUS', 'Inactive', 'INACTIVE', 'ACTIVE', 20, true)
      ON CONFLICT ON CONSTRAINT "uq_master_items_type_code" DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "master_items" WHERE "type" = 'CLIENT_STATUS'`);
  }
}
