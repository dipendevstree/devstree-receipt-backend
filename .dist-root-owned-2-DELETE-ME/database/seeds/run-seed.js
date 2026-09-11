"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_module_1 = require("../../app.module");
const permission_enum_1 = require("../../common/enums/permission.enum");
const role_enum_1 = require("../../common/enums/role.enum");
const client_status_enum_1 = require("../../common/enums/client-status.enum");
const project_status_enum_1 = require("../../common/enums/project-status.enum");
const payment_enum_1 = require("../../common/enums/payment.enum");
const document_sequence_entity_1 = require("../../common/entities/document-sequence.entity");
const money_util_1 = require("../../common/utils/money.util");
const password_service_1 = require("../../modules/auth/services/password.service");
const financial_encryption_service_1 = require("../../modules/financial/services/financial-encryption.service");
const permission_entity_1 = require("../../modules/roles/entities/permission.entity");
const role_entity_1 = require("../../modules/roles/entities/role.entity");
const user_entity_1 = require("../../modules/users/entities/user.entity");
const client_entity_1 = require("../../modules/clients/entities/client.entity");
const project_entity_1 = require("../../modules/projects/entities/project.entity");
const payment_entity_1 = require("../../modules/payments/entities/payment.entity");
const receipt_entity_1 = require("../../modules/receipts/entities/receipt.entity");
const company_setting_entity_1 = require("../../modules/settings/entities/company-setting.entity");
const sequence_service_1 = require("../../common/services/sequence.service");
const master_item_entity_1 = require("../../modules/masters/entities/master-item.entity");
const master_type_enum_1 = require("../../common/enums/master-type.enum");
const logger = new common_1.Logger('Seed');
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const dataSource = app.get((0, typeorm_1.getDataSourceToken)());
        const config = app.get(config_1.ConfigService);
        const passwordService = app.get(password_service_1.PasswordService);
        const encryption = app.get(financial_encryption_service_1.FinancialEncryptionService);
        const sequences = app.get(sequence_service_1.SequenceService);
        await seedPermissionsAndRoles(dataSource);
        const admins = await seedAdminUsers(dataSource, config, passwordService);
        await seedMasters(dataSource, admins.primaryId);
        await seedCompanySettings(dataSource, admins.primaryId);
        await seedSampleData(dataSource, encryption, sequences, admins);
        logger.log('Seed completed successfully.');
    }
    finally {
        await app.close();
    }
}
async function seedPermissionsAndRoles(dataSource) {
    const permissionRepo = dataSource.getRepository(permission_entity_1.PermissionEntity);
    const roleRepo = dataSource.getRepository(role_entity_1.Role);
    for (const [group, permissions] of Object.entries(permission_enum_1.PERMISSION_GROUPS)) {
        for (const permission of permissions) {
            const existing = await permissionRepo.findOne({ where: { name: permission } });
            if (!existing) {
                await permissionRepo.insert({ name: permission, group });
            }
        }
    }
    for (const permission of permission_enum_1.ALL_PERMISSIONS) {
        const existing = await permissionRepo.findOne({ where: { name: permission } });
        if (!existing) {
            await permissionRepo.insert({ name: permission, group: 'Other' });
        }
    }
    const allPermissions = await permissionRepo.find();
    const permissionByName = new Map(allPermissions.map((p) => [p.name, p]));
    for (const roleName of Object.values(role_enum_1.RoleName)) {
        let role = await roleRepo.findOne({
            where: { name: roleName },
            relations: { permissions: true },
        });
        const permissionEntities = role_enum_1.DEFAULT_ROLE_PERMISSIONS[roleName]
            .map((name) => permissionByName.get(name))
            .filter((p) => Boolean(p));
        if (!role) {
            role = roleRepo.create({
                name: roleName,
                displayName: toTitleCase(roleName),
                description: role_enum_1.ROLE_DESCRIPTIONS[roleName],
                isSystem: true,
                permissions: permissionEntities,
            });
        }
        else {
            role.permissions = permissionEntities;
        }
        await roleRepo.save(role);
    }
    logger.log(`Seeded ${allPermissions.length} permissions and ${Object.values(role_enum_1.RoleName).length} roles.`);
}
async function seedAdminUsers(dataSource, config, passwordService) {
    const userRepo = dataSource.getRepository(user_entity_1.User);
    const roleRepo = dataSource.getRepository(role_entity_1.Role);
    const configured = config.get('seed.admins', []);
    if (configured.length === 0) {
        throw new Error('No seed administrators are configured.');
    }
    const ids = [];
    const isProduction = config.get('app.isProduction', false);
    for (const admin of configured) {
        const existing = await userRepo.findOne({ where: { email: admin.email } });
        if (existing) {
            ids.push(existing.id);
            if (!isProduction && admin.password && admin.accountPassword) {
                existing.passwordHash = await passwordService.hash(admin.password);
                existing.accountPasswordHash = await passwordService.hash(admin.accountPassword);
                await userRepo.save(existing);
                logger.log(`Administrator ${admin.email} exists; development credentials re-synced.`);
            }
            else {
                logger.log(`Administrator already exists (${admin.email}); left untouched.`);
            }
            continue;
        }
        if (!admin.password || !admin.accountPassword) {
            throw new Error(`Seed passwords for ${admin.email} are not configured. Set the SEED_* login and account passwords in .env.`);
        }
        passwordService.assertStrength(admin.password, `Seed password for ${admin.email}`);
        passwordService.assertStrength(admin.accountPassword, `Seed account password for ${admin.email}`);
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
const MASTER_SEEDS = {
    [master_type_enum_1.MasterType.COUNTRY]: [
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
    [master_type_enum_1.MasterType.CURRENCY]: [
        { name: 'Indian Rupee', code: 'INR', sortOrder: 10, metadata: { symbol: '₹', precision: 2 } },
        { name: 'US Dollar', code: 'USD', sortOrder: 20, metadata: { symbol: '$', precision: 2 } },
        { name: 'Euro', code: 'EUR', sortOrder: 30, metadata: { symbol: '€', precision: 2 } },
        { name: 'British Pound', code: 'GBP', sortOrder: 40, metadata: { symbol: '£', precision: 2 } },
        { name: 'UAE Dirham', code: 'AED', sortOrder: 50, metadata: { symbol: 'د.إ', precision: 2 } },
    ],
    [master_type_enum_1.MasterType.PAYMENT_METHOD]: [
        { name: 'Bank Transfer', code: 'BANK_TRANSFER', sortOrder: 10, isSystem: true },
        { name: 'UPI', code: 'UPI', sortOrder: 20, isSystem: true },
        { name: 'Cheque', code: 'CHEQUE', sortOrder: 30, isSystem: true },
        { name: 'Cash', code: 'CASH', sortOrder: 40, isSystem: true },
        { name: 'Credit Card', code: 'CREDIT_CARD', sortOrder: 50, isSystem: true },
        { name: 'Other', code: 'OTHER', sortOrder: 60, isSystem: true },
    ],
    [master_type_enum_1.MasterType.PROJECT_STATUS]: [
        { name: 'Draft', code: 'DRAFT', sortOrder: 10, isSystem: true },
        { name: 'Active', code: 'ACTIVE', sortOrder: 20, isSystem: true },
        { name: 'On Hold', code: 'ON_HOLD', sortOrder: 30, isSystem: true },
        { name: 'Completed', code: 'COMPLETED', sortOrder: 40, isSystem: true },
        { name: 'Cancelled', code: 'CANCELLED', sortOrder: 50, isSystem: true },
    ],
    [master_type_enum_1.MasterType.PAYMENT_STATUS]: [
        { name: 'Valid', code: 'VALID', sortOrder: 10, isSystem: true },
        { name: 'Voided', code: 'VOIDED', sortOrder: 20, isSystem: true },
        { name: 'Cancelled', code: 'CANCELLED', sortOrder: 30, isSystem: true },
    ],
    [master_type_enum_1.MasterType.RECEIPT_STATUS]: [
        { name: 'Generated', code: master_type_enum_1.ReceiptStatus.GENERATED, sortOrder: 10, isSystem: true },
        { name: 'Printed', code: master_type_enum_1.ReceiptStatus.PRINTED, sortOrder: 20, isSystem: true },
        { name: 'Cancelled', code: master_type_enum_1.ReceiptStatus.CANCELLED, sortOrder: 30, isSystem: true },
    ],
};
async function seedMasters(dataSource, adminId) {
    const repo = dataSource.getRepository(master_item_entity_1.MasterItem);
    let created = 0;
    for (const [type, items] of Object.entries(MASTER_SEEDS)) {
        for (const item of items) {
            const existing = await repo.findOne({ where: { type, code: item.code } });
            if (existing)
                continue;
            const record = repo.create({
                type,
                name: item.name,
                code: item.code,
                sortOrder: item.sortOrder,
                isSystem: item.isSystem ?? false,
                metadata: item.metadata ?? null,
                status: master_type_enum_1.MasterStatus.ACTIVE,
                createdBy: adminId,
                updatedBy: adminId,
            });
            await repo.save(record);
            created += 1;
        }
    }
    logger.log(`Seeded ${created} master record(s) across ${Object.keys(MASTER_SEEDS).length} collections.`);
}
async function seedCompanySettings(dataSource, adminId) {
    const repo = dataSource.getRepository(company_setting_entity_1.CompanySetting);
    const existing = await repo.findOne({ where: { key: 'default' } });
    if (existing)
        return;
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
const SAMPLE_DATA = [
    {
        name: 'ABC Pvt Ltd',
        companyName: 'ABC Private Limited',
        email: 'accounts@abc-demo.example',
        phone: '9876500001',
        country: 'India',
        projects: [
            {
                name: 'Website Development',
                amount: '1000000.00',
                status: project_status_enum_1.ProjectStatus.ACTIVE,
                payments: [
                    {
                        daysAgo: 60,
                        amount: '200000.00',
                        method: payment_enum_1.PaymentMethod.BANK_TRANSFER,
                        reference: 'TXN-AB1001',
                    },
                    { daysAgo: 30, amount: '300000.00', method: payment_enum_1.PaymentMethod.UPI, reference: 'TXN-AB1002' },
                    { daysAgo: 5, amount: '100000.00', method: payment_enum_1.PaymentMethod.CHEQUE, reference: 'CHQ-88213' },
                ],
            },
            {
                name: 'SEO Monthly Retainer',
                amount: null,
                status: project_status_enum_1.ProjectStatus.ACTIVE,
                payments: [
                    {
                        daysAgo: 240,
                        amount: '50000.00',
                        method: payment_enum_1.PaymentMethod.BANK_TRANSFER,
                        reference: 'TXN-SEO-JAN',
                    },
                    { daysAgo: 210, amount: '55000.00', method: payment_enum_1.PaymentMethod.UPI, reference: 'TXN-SEO-FEB' },
                    {
                        daysAgo: 180,
                        amount: '48000.00',
                        method: payment_enum_1.PaymentMethod.BANK_TRANSFER,
                        reference: 'TXN-SEO-MAR',
                    },
                    { daysAgo: 150, amount: '62000.00', method: payment_enum_1.PaymentMethod.UPI, reference: 'TXN-SEO-APR' },
                ],
            },
            {
                name: 'Mobile App — Phase 1',
                amount: '500000.00',
                status: project_status_enum_1.ProjectStatus.COMPLETED,
                payments: [
                    {
                        daysAgo: 90,
                        amount: '500000.00',
                        method: payment_enum_1.PaymentMethod.BANK_TRANSFER,
                        reference: 'TXN-AB2001',
                    },
                ],
            },
        ],
    },
    {
        name: 'XYZ Solutions',
        companyName: 'XYZ Solutions LLP',
        email: 'finance@xyz-demo.example',
        phone: '9876500002',
        country: 'India',
        projects: [
            {
                name: 'ERP Implementation',
                amount: '2500000.00',
                status: project_status_enum_1.ProjectStatus.ACTIVE,
                payments: [
                    {
                        daysAgo: 45,
                        amount: '1000000.00',
                        method: payment_enum_1.PaymentMethod.BANK_TRANSFER,
                        reference: 'TXN-XY3001',
                    },
                ],
            },
        ],
    },
    {
        name: 'Demo Technologies',
        companyName: 'Demo Technologies Inc.',
        email: 'billing@demo-tech.example',
        phone: '9876500003',
        country: 'United States',
        projects: [
            {
                name: 'Cloud Migration',
                amount: '750000.00',
                status: project_status_enum_1.ProjectStatus.ON_HOLD,
                payments: [],
            },
            {
                name: 'Managed Support — Monthly',
                amount: null,
                status: project_status_enum_1.ProjectStatus.ACTIVE,
                payments: [
                    {
                        daysAgo: 35,
                        amount: '35000.00',
                        method: payment_enum_1.PaymentMethod.CHEQUE,
                        reference: 'CHQ-DT-1101',
                    },
                    {
                        daysAgo: 5,
                        amount: '41500.00',
                        method: payment_enum_1.PaymentMethod.BANK_TRANSFER,
                        reference: 'TXN-DT-1102',
                    },
                ],
            },
        ],
    },
];
async function seedSampleData(dataSource, encryption, sequences, admins) {
    let createdClients = 0;
    let createdProjects = 0;
    let createdPayments = 0;
    for (const clientData of SAMPLE_DATA) {
        await dataSource.transaction(async (manager) => {
            const clientRepo = manager.getRepository(client_entity_1.Client);
            const projectRepo = manager.getRepository(project_entity_1.Project);
            const paymentRepo = manager.getRepository(payment_entity_1.Payment);
            const receiptRepo = manager.getRepository(receipt_entity_1.Receipt);
            let client = await clientRepo.findOne({ where: { email: clientData.email } });
            if (!client) {
                const clientCode = await sequences.allocate(manager, document_sequence_entity_1.SequenceKey.CLIENT);
                client = await clientRepo.save(clientRepo.create({
                    clientCode,
                    name: clientData.name,
                    companyName: clientData.companyName,
                    email: clientData.email,
                    phone: clientData.phone,
                    country: clientData.country,
                    status: client_status_enum_1.ClientStatus.ACTIVE,
                    createdBy: admins.primaryId,
                    updatedBy: admins.primaryId,
                }));
                createdClients += 1;
            }
            for (const projectData of clientData.projects) {
                const existingProject = await projectRepo.findOne({
                    where: { clientId: client.id, projectName: projectData.name },
                });
                if (existingProject)
                    continue;
                const projectCode = await sequences.allocate(manager, document_sequence_entity_1.SequenceKey.PROJECT);
                const encryptedAmount = projectData.amount === null
                    ? {
                        encryptedAmount: null,
                        amountIv: null,
                        amountAuthTag: null,
                        encryptionKeyVersion: null,
                    }
                    : encryption.encryptAmount(money_util_1.Money.fromDecimalString(projectData.amount), financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT);
                const project = await projectRepo.save(projectRepo.create({
                    clientId: client.id,
                    projectCode,
                    projectName: projectData.name,
                    ...encryptedAmount,
                    status: projectData.status,
                    startDate: daysAgoIso(120),
                    createdBy: admins.primaryId,
                    updatedBy: admins.primaryId,
                }));
                createdProjects += 1;
                for (const paymentData of projectData.payments) {
                    const encryptedPayment = encryption.encryptAmount(money_util_1.Money.fromDecimalString(paymentData.amount), financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
                    const payment = await paymentRepo.save(paymentRepo.create({
                        clientId: client.id,
                        projectId: project.id,
                        paymentDate: daysAgoIso(paymentData.daysAgo),
                        ...encryptedPayment,
                        paymentMethod: paymentData.method,
                        transactionReference: paymentData.reference,
                        status: payment_enum_1.PaymentStatus.VALID,
                        createdBy: admins.financeId,
                    }));
                    createdPayments += 1;
                    const receiptNumber = await sequences.allocate(manager, document_sequence_entity_1.SequenceKey.RECEIPT);
                    await receiptRepo.save(receiptRepo.create({
                        paymentId: payment.id,
                        receiptNumber,
                        receiptDate: payment.paymentDate,
                        status: master_type_enum_1.ReceiptStatus.GENERATED,
                        generatedBy: admins.financeId,
                    }));
                }
            }
        });
    }
    logger.log(`Sample data: ${createdClients} client(s), ${createdProjects} project(s) and ${createdPayments} payment(s) created; existing rows untouched.`);
}
function daysAgoIso(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
}
function toTitleCase(value) {
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
//# sourceMappingURL=run-seed.js.map