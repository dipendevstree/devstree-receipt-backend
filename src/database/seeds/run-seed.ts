import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '../../common/enums/permission.enum';
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  RoleName,
} from '../../common/enums/role.enum';
import { ClientStatus } from '../../common/enums/client-status.enum';
import { ProjectStatus } from '../../common/enums/project-status.enum';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';
import { SequenceKey } from '../../common/entities/document-sequence.entity';
import { Money } from '../../common/utils/money.util';
import { PasswordService } from '../../modules/auth/services/password.service';
import {
  EncryptionContext,
  FinancialEncryptionService,
} from '../../modules/financial/services/financial-encryption.service';
import { PermissionEntity } from '../../modules/roles/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Client } from '../../modules/clients/entities/client.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { Receipt } from '../../modules/receipts/entities/receipt.entity';
import { CompanySetting } from '../../modules/settings/entities/company-setting.entity';
import { SequenceService } from '../../common/services/sequence.service';
import { MasterItem } from '../../modules/masters/entities/master-item.entity';
import { MasterStatus, MasterType, ReceiptStatus } from '../../common/enums/master-type.enum';
import { SeedAdminConfig } from '../../config/configuration';

const logger = new Logger('Seed');

/**
 * Idempotent development/staging seed.
 *
 * Financial amounts start as plaintext ONLY as local variables in this script —
 * they are encrypted via FinancialEncryptionService before any INSERT reaches
 * Postgres, exactly like the application's own write paths (§63).
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    const config = app.get(ConfigService);
    const passwordService = app.get(PasswordService);
    const encryption = app.get(FinancialEncryptionService);
    const sequences = app.get(SequenceService);

    await seedPermissionsAndRoles(dataSource);
    const admins = await seedAdminUsers(dataSource, config, passwordService);
    await seedMasters(dataSource, admins.primaryId);
    await seedCompanySettings(dataSource, admins.primaryId);
    await seedSampleData(dataSource, encryption, sequences, admins);

    logger.log('Seed completed successfully.');
  } finally {
    await app.close();
  }
}

async function seedPermissionsAndRoles(dataSource: DataSource): Promise<void> {
  const permissionRepo = dataSource.getRepository(PermissionEntity);
  const roleRepo = dataSource.getRepository(Role);

  for (const [group, permissions] of Object.entries(PERMISSION_GROUPS)) {
    for (const permission of permissions) {
      const existing = await permissionRepo.findOne({ where: { name: permission } });
      if (!existing) {
        await permissionRepo.insert({ name: permission, group });
      }
    }
  }
  // Defensive: catch any permission not covered by a group.
  for (const permission of ALL_PERMISSIONS) {
    const existing = await permissionRepo.findOne({ where: { name: permission } });
    if (!existing) {
      await permissionRepo.insert({ name: permission, group: 'Other' });
    }
  }

  const allPermissions = await permissionRepo.find();
  const permissionByName = new Map(allPermissions.map((p) => [p.name, p]));

  for (const roleName of Object.values(RoleName)) {
    let role = await roleRepo.findOne({
      where: { name: roleName },
      relations: { permissions: true },
    });
    const permissionEntities = DEFAULT_ROLE_PERMISSIONS[roleName]
      .map((name) => permissionByName.get(name))
      .filter((p): p is PermissionEntity => Boolean(p));

    if (!role) {
      role = roleRepo.create({
        name: roleName,
        displayName: toTitleCase(roleName),
        description: ROLE_DESCRIPTIONS[roleName],
        isSystem: true,
        permissions: permissionEntities,
      });
    } else {
      role.permissions = permissionEntities;
    }
    await roleRepo.save(role);
  }

  logger.log(
    `Seeded ${allPermissions.length} permissions and ${Object.values(RoleName).length} roles.`,
  );
}

export interface SeededAdmins {
  /** SUPER_ADMIN — creates clients, projects and settings. */
  primaryId: string;
  /** Second administrator — records payments, so attribution is visibly different. */
  financeId: string;
}

/**
 * Seeds every configured administrator. Multiple admins exist by design so that
 * createdBy/updatedBy and the audit trail can be verified end to end.
 */
async function seedAdminUsers(
  dataSource: DataSource,
  config: ConfigService,
  passwordService: PasswordService,
): Promise<SeededAdmins> {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const configured = config.get<SeedAdminConfig[]>('seed.admins', []);

  if (configured.length === 0) {
    throw new Error('No seed administrators are configured.');
  }

  const ids: string[] = [];
  const isProduction = config.get<boolean>('app.isProduction', false);

  for (const admin of configured) {
    const existing = await userRepo.findOne({ where: { email: admin.email } });
    if (existing) {
      ids.push(existing.id);

      // Outside production, re-align the stored hashes with the configured
      // credentials. Without this, changing a SEED_* value in .env leaves the
      // development database permanently unloginable.
      if (!isProduction && admin.password && admin.accountPassword) {
        existing.passwordHash = await passwordService.hash(admin.password);
        existing.accountPasswordHash = await passwordService.hash(admin.accountPassword);
        await userRepo.save(existing);
        logger.log(`Administrator ${admin.email} exists; development credentials re-synced.`);
      } else {
        logger.log(`Administrator already exists (${admin.email}); left untouched.`);
      }
      continue;
    }

    if (!admin.password || !admin.accountPassword) {
      throw new Error(
        `Seed passwords for ${admin.email} are not configured. Set the SEED_* login and account passwords in .env.`,
      );
    }
    passwordService.assertStrength(admin.password, `Seed password for ${admin.email}`);
    passwordService.assertStrength(
      admin.accountPassword,
      `Seed account password for ${admin.email}`,
    );

    const role = await roleRepo.findOneOrFail({ where: { name: admin.role } });

    const user = userRepo.create();
    user.name = admin.name;
    user.email = admin.email;
    user.phone = admin.phone ?? null;
    user.passwordHash = await passwordService.hash(admin.password);
    user.accountPasswordHash = await passwordService.hash(admin.accountPassword);
    user.roleId = role.id;

    const saved = await userRepo.save(user);
    ids.push(saved.id);
    logger.log(`Seeded administrator ${admin.email} (${admin.role}).`);
  }

  return { primaryId: ids[0], financeId: ids[1] ?? ids[0] };
}

interface MasterSeed {
  name: string;
  code: string;
  sortOrder: number;
  isSystem?: boolean;
  metadata?: Record<string, unknown>;
}

const MASTER_SEEDS: Record<MasterType, MasterSeed[]> = {
  [MasterType.COUNTRY]: [
    { name: 'India', code: 'IN', sortOrder: 10, metadata: { dialCode: '+91', currency: 'INR' } },
    {
      name: 'United States',
      code: 'US',
      sortOrder: 20,
      metadata: { dialCode: '+1', currency: 'USD' },
    },
    {
      name: 'United Kingdom',
      code: 'GB',
      sortOrder: 30,
      metadata: { dialCode: '+44', currency: 'GBP' },
    },
    {
      name: 'United Arab Emirates',
      code: 'AE',
      sortOrder: 40,
      metadata: { dialCode: '+971', currency: 'AED' },
    },
    {
      name: 'Australia',
      code: 'AU',
      sortOrder: 50,
      metadata: { dialCode: '+61', currency: 'AUD' },
    },
    { name: 'Canada', code: 'CA', sortOrder: 60, metadata: { dialCode: '+1', currency: 'CAD' } },
    {
      name: 'Singapore',
      code: 'SG',
      sortOrder: 70,
      metadata: { dialCode: '+65', currency: 'SGD' },
    },
    { name: 'Germany', code: 'DE', sortOrder: 80, metadata: { dialCode: '+49', currency: 'EUR' } },
  ],
  [MasterType.CURRENCY]: [
    { name: 'Indian Rupee', code: 'INR', sortOrder: 10, metadata: { symbol: '₹', precision: 2 } },
    { name: 'US Dollar', code: 'USD', sortOrder: 20, metadata: { symbol: '$', precision: 2 } },
    { name: 'Euro', code: 'EUR', sortOrder: 30, metadata: { symbol: '€', precision: 2 } },
    { name: 'British Pound', code: 'GBP', sortOrder: 40, metadata: { symbol: '£', precision: 2 } },
    { name: 'UAE Dirham', code: 'AED', sortOrder: 50, metadata: { symbol: 'د.إ', precision: 2 } },
  ],
  // isSystem: these codes are stored in payments.payment_method / *.status enums.
  [MasterType.PAYMENT_METHOD]: [
    { name: 'Bank Transfer', code: 'BANK_TRANSFER', sortOrder: 10, isSystem: true },
    { name: 'UPI', code: 'UPI', sortOrder: 20, isSystem: true },
    { name: 'Cheque', code: 'CHEQUE', sortOrder: 30, isSystem: true },
    { name: 'Cash', code: 'CASH', sortOrder: 40, isSystem: true },
    { name: 'Credit Card', code: 'CREDIT_CARD', sortOrder: 50, isSystem: true },
    { name: 'Other', code: 'OTHER', sortOrder: 60, isSystem: true },
  ],
  [MasterType.PROJECT_STATUS]: [
    { name: 'Draft', code: 'DRAFT', sortOrder: 10, isSystem: true },
    { name: 'Active', code: 'ACTIVE', sortOrder: 20, isSystem: true },
    { name: 'On Hold', code: 'ON_HOLD', sortOrder: 30, isSystem: true },
    { name: 'Completed', code: 'COMPLETED', sortOrder: 40, isSystem: true },
    { name: 'Cancelled', code: 'CANCELLED', sortOrder: 50, isSystem: true },
  ],
  [MasterType.PAYMENT_STATUS]: [
    { name: 'Valid', code: 'VALID', sortOrder: 10, isSystem: true },
    { name: 'Voided', code: 'VOIDED', sortOrder: 20, isSystem: true },
    { name: 'Cancelled', code: 'CANCELLED', sortOrder: 30, isSystem: true },
  ],
  [MasterType.RECEIPT_STATUS]: [
    { name: 'Generated', code: ReceiptStatus.GENERATED, sortOrder: 10, isSystem: true },
    { name: 'Printed', code: ReceiptStatus.PRINTED, sortOrder: 20, isSystem: true },
    { name: 'Cancelled', code: ReceiptStatus.CANCELLED, sortOrder: 30, isSystem: true },
  ],
  // Codes mirror the client_status enum, so they are system rows: renameable,
  // never re-coded or deleted.
  [MasterType.CLIENT_STATUS]: [
    { name: 'Active', code: ClientStatus.ACTIVE, sortOrder: 10, isSystem: true },
    { name: 'Inactive', code: ClientStatus.INACTIVE, sortOrder: 20, isSystem: true },
  ],
};

/** Idempotent: existing rows are left untouched so admin edits survive re-seeding. */
async function seedMasters(dataSource: DataSource, adminId: string): Promise<void> {
  const repo = dataSource.getRepository(MasterItem);
  let created = 0;

  for (const [type, items] of Object.entries(MASTER_SEEDS) as Array<[MasterType, MasterSeed[]]>) {
    for (const item of items) {
      const existing = await repo.findOne({ where: { type, code: item.code } });
      if (existing) continue;

      const record = repo.create({
        type,
        name: item.name,
        code: item.code,
        sortOrder: item.sortOrder,
        isSystem: item.isSystem ?? false,
        metadata: item.metadata ?? null,
        status: MasterStatus.ACTIVE,
        createdBy: adminId,
        updatedBy: adminId,
      });
      await repo.save(record);
      created += 1;
    }
  }

  logger.log(
    `Seeded ${created} master record(s) across ${Object.keys(MASTER_SEEDS).length} collections.`,
  );
}

async function seedCompanySettings(dataSource: DataSource, adminId: string): Promise<void> {
  const repo = dataSource.getRepository(CompanySetting);
  const existing = await repo.findOne({ where: { key: 'default' } });
  if (existing) return;

  await repo.insert({
    key: 'default',
    companyName: 'Devstree',
    email: 'accounts@devstree.com',
    phone: '+91 90000 00000',
    website: 'https://devstree.com',
    address: 'Devstree Technologies',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    currencyPrecision: 2,
    dateFormat: 'dd MMM yyyy',
    authorizedSignatory: 'Devstree Accounts Team',
    updatedBy: adminId,
  });
  logger.log('Seeded company settings.');
}

interface SeedPayment {
  daysAgo: number;
  amount: string;
  method: PaymentMethod;
  reference: string;
}

interface SeedProject {
  name: string;
  /**
   * null models a monthly/retainer engagement with no predefined amount. It is
   * seeded deliberately so the "variable project" path — no project amount, no
   * due, unlimited payments — has real data behind it from the first run.
   */
  amount: string | null;
  status: ProjectStatus;
  payments: SeedPayment[];
}

interface SeedClient {
  name: string;
  email: string;
  phone: string;
  country: string;
  projects: SeedProject[];
}

const SAMPLE_DATA: SeedClient[] = [
  {
    name: 'ABC Pvt Ltd',
    email: 'accounts@abc-demo.example',
    phone: '9876500001',
    country: 'India',
    projects: [
      {
        name: 'Website Development',
        amount: '1000000.00',
        status: ProjectStatus.ACTIVE,
        payments: [
          {
            daysAgo: 60,
            amount: '200000.00',
            method: PaymentMethod.BANK_TRANSFER,
            reference: 'TXN-AB1001',
          },
          { daysAgo: 30, amount: '300000.00', method: PaymentMethod.UPI, reference: 'TXN-AB1002' },
          { daysAgo: 5, amount: '100000.00', method: PaymentMethod.CHEQUE, reference: 'CHQ-88213' },
        ],
      },
      {
        // Variable project: no fixed amount, a different sum received monthly.
        name: 'SEO Monthly Retainer',
        amount: null,
        status: ProjectStatus.ACTIVE,
        payments: [
          {
            daysAgo: 240,
            amount: '50000.00',
            method: PaymentMethod.BANK_TRANSFER,
            reference: 'TXN-SEO-JAN',
          },
          { daysAgo: 210, amount: '55000.00', method: PaymentMethod.UPI, reference: 'TXN-SEO-FEB' },
          {
            daysAgo: 180,
            amount: '48000.00',
            method: PaymentMethod.BANK_TRANSFER,
            reference: 'TXN-SEO-MAR',
          },
          { daysAgo: 150, amount: '62000.00', method: PaymentMethod.UPI, reference: 'TXN-SEO-APR' },
        ],
      },
      {
        name: 'Mobile App — Phase 1',
        amount: '500000.00',
        status: ProjectStatus.COMPLETED,
        payments: [
          {
            daysAgo: 90,
            amount: '500000.00',
            method: PaymentMethod.BANK_TRANSFER,
            reference: 'TXN-AB2001',
          },
        ],
      },
    ],
  },
  {
    name: 'XYZ Solutions',
    email: 'finance@xyz-demo.example',
    phone: '9876500002',
    country: 'India',
    projects: [
      {
        name: 'ERP Implementation',
        amount: '2500000.00',
        status: ProjectStatus.ACTIVE,
        payments: [
          {
            daysAgo: 45,
            amount: '1000000.00',
            method: PaymentMethod.BANK_TRANSFER,
            reference: 'TXN-XY3001',
          },
        ],
      },
    ],
  },
  {
    name: 'Demo Technologies',
    email: 'billing@demo-tech.example',
    phone: '9876500003',
    country: 'United States',
    projects: [
      {
        name: 'Cloud Migration',
        amount: '750000.00',
        status: ProjectStatus.ON_HOLD,
        payments: [],
      },
      {
        name: 'Managed Support — Monthly',
        amount: null,
        status: ProjectStatus.ACTIVE,
        payments: [
          {
            daysAgo: 35,
            amount: '35000.00',
            method: PaymentMethod.CHEQUE,
            reference: 'CHQ-DT-1101',
          },
          {
            daysAgo: 5,
            amount: '41500.00',
            method: PaymentMethod.BANK_TRANSFER,
            reference: 'TXN-DT-1102',
          },
        ],
      },
    ],
  },
];

/**
 * Idempotent at row level rather than all-or-nothing.
 *
 * The previous version bailed out entirely if any client existed, which meant
 * a database seeded once could never receive new sample rows — re-running the
 * seed after adding a sample project silently did nothing. Each client,
 * project and payment is now matched on a natural key and created only if
 * absent, so re-seeding is safe and additive: nothing existing is modified or
 * deleted.
 */
async function seedSampleData(
  dataSource: DataSource,
  encryption: FinancialEncryptionService,
  sequences: SequenceService,
  admins: SeededAdmins,
): Promise<void> {
  let createdClients = 0;
  let createdProjects = 0;
  let createdPayments = 0;

  for (const clientData of SAMPLE_DATA) {
    await dataSource.transaction(async (manager) => {
      const clientRepo = manager.getRepository(Client);
      const projectRepo = manager.getRepository(Project);
      const paymentRepo = manager.getRepository(Payment);
      const receiptRepo = manager.getRepository(Receipt);

      let client = await clientRepo.findOne({ where: { email: clientData.email } });
      if (!client) {
        const clientCode = await sequences.allocate(manager, SequenceKey.CLIENT);
        client = await clientRepo.save(
          clientRepo.create({
            clientCode,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            country: clientData.country,
            status: ClientStatus.ACTIVE,
            createdBy: admins.primaryId,
            updatedBy: admins.primaryId,
          }),
        );
        createdClients += 1;
      }

      for (const projectData of clientData.projects) {
        const existingProject = await projectRepo.findOne({
          where: { clientId: client.id, projectName: projectData.name },
        });
        if (existingProject) continue;

        const projectCode = await sequences.allocate(manager, SequenceKey.PROJECT);
        // A null amount leaves all four ciphertext columns NULL — the stored
        // encoding of "no predefined project amount". An encrypted zero would
        // be a different, and wrong, business state.
        const encryptedAmount =
          projectData.amount === null
            ? {
                encryptedAmount: null,
                amountIv: null,
                amountAuthTag: null,
                encryptionKeyVersion: null,
              }
            : encryption.encryptAmount(
                Money.fromDecimalString(projectData.amount),
                EncryptionContext.PROJECT_AMOUNT,
              );

        const project = await projectRepo.save(
          projectRepo.create({
            clientId: client.id,
            projectCode,
            projectName: projectData.name,
            ...encryptedAmount,
            status: projectData.status,
            startDate: daysAgoIso(120),
            createdBy: admins.primaryId,
            updatedBy: admins.primaryId,
          }),
        );
        createdProjects += 1;

        for (const paymentData of projectData.payments) {
          const encryptedPayment = encryption.encryptAmount(
            Money.fromDecimalString(paymentData.amount),
            EncryptionContext.PAYMENT_AMOUNT,
          );

          const payment = await paymentRepo.save(
            paymentRepo.create({
              clientId: client.id,
              projectId: project.id,
              paymentDate: daysAgoIso(paymentData.daysAgo),
              ...encryptedPayment,
              paymentMethod: paymentData.method,
              transactionReference: paymentData.reference,
              status: PaymentStatus.VALID,
              // Recorded by the second administrator so createdBy attribution
              // is visibly different from who created the client/project.
              createdBy: admins.financeId,
            }),
          );
          createdPayments += 1;

          const receiptNumber = await sequences.allocate(manager, SequenceKey.RECEIPT);
          await receiptRepo.save(
            receiptRepo.create({
              paymentId: payment.id,
              receiptNumber,
              receiptDate: payment.paymentDate,
              status: ReceiptStatus.GENERATED,
              generatedBy: admins.financeId,
            }),
          );
        }
      }
    });
  }

  logger.log(
    `Sample data: ${createdClients} client(s), ${createdProjects} project(s) and ${createdPayments} payment(s) created; existing rows untouched.`,
  );
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

run().catch((error) => {
  logger.error('Seed failed', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
