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
const logger = new common_1.Logger('Seed');
async function run() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['error', 'warn'] });
    try {
        const dataSource = app.get((0, typeorm_1.getDataSourceToken)());
        const config = app.get(config_1.ConfigService);
        const passwordService = app.get(password_service_1.PasswordService);
        const encryption = app.get(financial_encryption_service_1.FinancialEncryptionService);
        const sequences = app.get(sequence_service_1.SequenceService);
        await seedPermissionsAndRoles(dataSource);
        const adminId = await seedAdminUser(dataSource, config, passwordService);
        await seedCompanySettings(dataSource, adminId);
        await seedSampleData(dataSource, encryption, sequences, adminId);
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
async function seedAdminUser(dataSource, config, passwordService) {
    const userRepo = dataSource.getRepository(user_entity_1.User);
    const roleRepo = dataSource.getRepository(role_entity_1.Role);
    const email = config.get('seed.adminEmail', 'admin@devstree.local');
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
        logger.log(`Admin user already exists (${email}); skipping creation.`);
        return existing.id;
    }
    const superAdminRole = await roleRepo.findOneOrFail({ where: { name: role_enum_1.RoleName.SUPER_ADMIN } });
    const loginPassword = config.get('seed.adminPassword');
    const accountPassword = config.get('seed.adminAccountPassword');
    if (!loginPassword || !accountPassword) {
        throw new Error('SEED_ADMIN_PASSWORD and SEED_ADMIN_ACCOUNT_PASSWORD must be set in the environment to seed the admin user.');
    }
    passwordService.assertStrength(loginPassword, 'Seed admin login password');
    passwordService.assertStrength(accountPassword, 'Seed admin account password');
    const user = userRepo.create();
    user.name = config.get('seed.adminName', 'System Administrator');
    user.email = email;
    user.phone = config.get('seed.adminPhone') ?? null;
    user.passwordHash = await passwordService.hash(loginPassword);
    user.accountPasswordHash = await passwordService.hash(accountPassword);
    user.roleId = superAdminRole.id;
    const saved = await userRepo.save(user);
    logger.log(`Seeded admin user ${email}.`);
    return saved.id;
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
        ],
    },
];
async function seedSampleData(dataSource, encryption, sequences, adminId) {
    const clientRepo = dataSource.getRepository(client_entity_1.Client);
    const existingCount = await clientRepo.count();
    if (existingCount > 0) {
        logger.log('Sample clients already present; skipping sample data seed.');
        return;
    }
    for (const clientData of SAMPLE_DATA) {
        await dataSource.transaction(async (manager) => {
            const clientCode = await sequences.allocate(manager, document_sequence_entity_1.SequenceKey.CLIENT);
            const client = await manager.getRepository(client_entity_1.Client).save(manager.getRepository(client_entity_1.Client).create({
                clientCode,
                name: clientData.name,
                companyName: clientData.companyName,
                email: clientData.email,
                phone: clientData.phone,
                country: clientData.country,
                status: client_status_enum_1.ClientStatus.ACTIVE,
            }));
            for (const projectData of clientData.projects) {
                const projectCode = await sequences.allocate(manager, document_sequence_entity_1.SequenceKey.PROJECT);
                const encryptedAmount = encryption.encryptAmount(money_util_1.Money.fromDecimalString(projectData.amount), financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT);
                const project = await manager.getRepository(project_entity_1.Project).save(manager.getRepository(project_entity_1.Project).create({
                    clientId: client.id,
                    projectCode,
                    projectName: projectData.name,
                    ...encryptedAmount,
                    status: projectData.status,
                    startDate: daysAgoIso(120),
                    createdBy: adminId,
                }));
                for (const paymentData of projectData.payments) {
                    const encryptedPayment = encryption.encryptAmount(money_util_1.Money.fromDecimalString(paymentData.amount), financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
                    const payment = await manager.getRepository(payment_entity_1.Payment).save(manager.getRepository(payment_entity_1.Payment).create({
                        clientId: client.id,
                        projectId: project.id,
                        paymentDate: daysAgoIso(paymentData.daysAgo),
                        ...encryptedPayment,
                        paymentMethod: paymentData.method,
                        transactionReference: paymentData.reference,
                        status: payment_enum_1.PaymentStatus.VALID,
                        createdBy: adminId,
                    }));
                    const receiptNumber = await sequences.allocate(manager, document_sequence_entity_1.SequenceKey.RECEIPT);
                    await manager.getRepository(receipt_entity_1.Receipt).save(manager.getRepository(receipt_entity_1.Receipt).create({
                        paymentId: payment.id,
                        receiptNumber,
                        receiptDate: payment.paymentDate,
                        generatedBy: adminId,
                    }));
                }
            }
        });
    }
    logger.log(`Seeded ${SAMPLE_DATA.length} sample clients with projects, payments and receipts.`);
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