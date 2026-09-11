"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1757325726000 = void 0;
class InitialSchema1757325726000 {
    name = 'InitialSchema1757325726000';
    async up(queryRunner) {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
        await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE','INACTIVE','SUSPENDED')`);
        await queryRunner.query(`CREATE TYPE "client_status_enum" AS ENUM ('ACTIVE','INACTIVE')`);
        await queryRunner.query(`CREATE TYPE "project_status_enum" AS ENUM ('DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "payment_method_enum" AS ENUM ('BANK_TRANSFER','UPI','CHEQUE','CASH','CREDIT_CARD','OTHER')`);
        await queryRunner.query(`CREATE TYPE "payment_status_enum" AS ENUM ('VALID','VOIDED','CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "password_type_enum" AS ENUM ('LOGIN','ACCOUNT')`);
        await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(64) NOT NULL,
        "display_name" varchar(96) NOT NULL,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_roles_name" ON "roles" ("name")`);
        await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(64) NOT NULL,
        "group" varchar(64) NOT NULL,
        "description" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_permissions_name" ON "permissions" ("name")`);
        await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        PRIMARY KEY ("role_id", "permission_id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "email" varchar(180) NOT NULL,
        "phone" varchar(20),
        "password_hash" varchar(255) NOT NULL,
        "account_password_hash" varchar(255),
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
        "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "last_login_at" timestamptz,
        "token_version" int NOT NULL DEFAULT 0,
        "failed_login_attempts" int NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "idx_users_phone" ON "users" ("phone")`);
        await queryRunner.query(`
      CREATE TABLE "password_histories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "password_type" "password_type_enum" NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE INDEX "idx_password_histories_user_type" ON "password_histories" ("user_id", "password_type")`);
        await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "ip_address" varchar(45),
        "user_agent" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" ("token_hash")`);
        await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);
        await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "ip_address" varchar(45),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_password_reset_hash" ON "password_reset_tokens" ("token_hash")`);
        await queryRunner.query(`CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens" ("user_id")`);
        await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_code" varchar(32) NOT NULL,
        "name" varchar(160) NOT NULL,
        "company_name" varchar(160),
        "email" varchar(180),
        "phone" varchar(24),
        "alternate_phone" varchar(24),
        "country" varchar(80),
        "address" varchar(255),
        "city" varchar(80),
        "state" varchar(80),
        "postal_code" varchar(20),
        "tax_number" varchar(40),
        "notes" text,
        "status" "client_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_clients_client_code" ON "clients" ("client_code")`);
        await queryRunner.query(`CREATE INDEX "idx_clients_email" ON "clients" ("email")`);
        await queryRunner.query(`CREATE INDEX "idx_clients_name" ON "clients" ("name")`);
        await queryRunner.query(`CREATE INDEX "idx_clients_status" ON "clients" ("status")`);
        await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
        "project_code" varchar(32) NOT NULL,
        "project_name" varchar(180) NOT NULL,
        "description" text,
        "encrypted_amount" text NOT NULL,
        "amount_iv" varchar(32) NOT NULL,
        "amount_auth_tag" varchar(32) NOT NULL,
        "encryption_key_version" int NOT NULL DEFAULT 1,
        "start_date" date,
        "expected_end_date" date,
        "status" "project_status_enum" NOT NULL DEFAULT 'DRAFT',
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_projects_project_code" ON "projects" ("project_code")`);
        await queryRunner.query(`CREATE INDEX "idx_projects_client_id" ON "projects" ("client_id")`);
        await queryRunner.query(`CREATE INDEX "idx_projects_status" ON "projects" ("status")`);
        await queryRunner.query(`CREATE INDEX "idx_projects_name" ON "projects" ("project_name")`);
        await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
        "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
        "payment_date" date NOT NULL,
        "encrypted_amount" text NOT NULL,
        "amount_iv" varchar(32) NOT NULL,
        "amount_auth_tag" varchar(32) NOT NULL,
        "encryption_key_version" int NOT NULL DEFAULT 1,
        "payment_method" "payment_method_enum" NOT NULL,
        "transaction_reference" varchar(120),
        "bank_account" varchar(120),
        "notes" text,
        "attachment_path" varchar(255),
        "status" "payment_status_enum" NOT NULL DEFAULT 'VALID',
        "void_reason" varchar(255),
        "voided_at" timestamptz,
        "voided_by" uuid,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
        await queryRunner.query(`CREATE INDEX "idx_payments_project_id" ON "payments" ("project_id")`);
        await queryRunner.query(`CREATE INDEX "idx_payments_client_id" ON "payments" ("client_id")`);
        await queryRunner.query(`CREATE INDEX "idx_payments_payment_date" ON "payments" ("payment_date")`);
        await queryRunner.query(`CREATE INDEX "idx_payments_status" ON "payments" ("status")`);
        await queryRunner.query(`CREATE INDEX "idx_payments_project_status" ON "payments" ("project_id", "status")`);
        await queryRunner.query(`
      CREATE TABLE "receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL REFERENCES "payments"("id") ON DELETE RESTRICT,
        "receipt_number" varchar(32) NOT NULL,
        "receipt_date" date NOT NULL,
        "generated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "pdf_path" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_receipts_receipt_number" ON "receipts" ("receipt_number")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_receipts_payment_id" ON "receipts" ("payment_id")`);
        await queryRunner.query(`CREATE INDEX "idx_receipts_receipt_date" ON "receipts" ("receipt_date")`);
        await queryRunner.query(`
      CREATE TABLE "company_settings" (
        "key" varchar(32) PRIMARY KEY,
        "company_name" varchar(160) NOT NULL DEFAULT 'Devstree',
        "logo_path" varchar(255),
        "email" varchar(180),
        "phone" varchar(24),
        "website" varchar(180),
        "address" varchar(255),
        "city" varchar(80),
        "state" varchar(80),
        "postal_code" varchar(20),
        "country" varchar(80),
        "tax_number" varchar(40),
        "currency" varchar(8) NOT NULL DEFAULT 'INR',
        "currency_symbol" varchar(8) NOT NULL DEFAULT '₹',
        "currency_precision" int NOT NULL DEFAULT 2,
        "date_format" varchar(32) NOT NULL DEFAULT 'dd MMM yyyy',
        "receipt_footer_note" varchar(255),
        "authorized_signatory" varchar(120),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "updated_by" uuid
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "financial_unlock_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "session_token_hash" varchar(128) NOT NULL,
        "auth_token_id" varchar(64),
        "unlocked_at" timestamptz NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "locked_at" timestamptz,
        "ip_address" varchar(45),
        "user_agent" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE INDEX "idx_financial_sessions_user" ON "financial_unlock_sessions" ("user_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_financial_sessions_token_hash" ON "financial_unlock_sessions" ("session_token_hash")`);
        await queryRunner.query(`CREATE INDEX "idx_financial_sessions_expires" ON "financial_unlock_sessions" ("expires_at")`);
        await queryRunner.query(`
      CREATE TABLE "financial_unlock_attempts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "successful" boolean NOT NULL DEFAULT false,
        "ip_address" varchar(45),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE INDEX "idx_financial_attempts_user_created" ON "financial_unlock_attempts" ("user_id", "created_at")`);
        await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "user_name" varchar(120),
        "action" varchar(48) NOT NULL,
        "module" varchar(32) NOT NULL,
        "record_id" varchar(64),
        "description" varchar(255),
        "old_value" jsonb,
        "new_value" jsonb,
        "ip_address" varchar(45),
        "user_agent" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_module_record" ON "audit_logs" ("module", "record_id")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_action" ON "audit_logs" ("action")`);
        await queryRunner.query(`
      CREATE TABLE "document_sequences" (
        "key" varchar(48) PRIMARY KEY,
        "current_value" bigint NOT NULL DEFAULT 0,
        "prefix" varchar(16) NOT NULL DEFAULT '',
        "padding" int NOT NULL DEFAULT 6,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      INSERT INTO "document_sequences" ("key", "current_value", "prefix", "padding") VALUES
        ('receipt_number', 0, 'REC-', 6),
        ('client_code', 0, 'CLI-', 4),
        ('project_code', 0, 'PRJ-', 4)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "document_sequences"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "financial_unlock_attempts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "financial_unlock_sessions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "company_settings"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "receipts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "password_histories"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "password_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "project_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "client_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    }
}
exports.InitialSchema1757325726000 = InitialSchema1757325726000;
//# sourceMappingURL=1757325726000-InitialSchema.js.map