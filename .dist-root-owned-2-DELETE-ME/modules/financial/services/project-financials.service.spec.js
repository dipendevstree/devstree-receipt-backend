"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const payment_enum_1 = require("../../../common/enums/payment.enum");
const project_status_enum_1 = require("../../../common/enums/project-status.enum");
const money_util_1 = require("../../../common/utils/money.util");
const payment_entity_1 = require("../../payments/entities/payment.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
const financial_encryption_service_1 = require("./financial-encryption.service");
const project_financials_service_1 = require("./project-financials.service");
const key_provider_interface_1 = require("../interfaces/key-provider.interface");
const KEY = Buffer.alloc(32, 7);
describe('ProjectFinancialsService — projects with and without a defined amount', () => {
    let service;
    let encryption;
    let paymentRows = [];
    let projectRows = [];
    const paymentRepo = {
        find: jest.fn(async () => paymentRows),
    };
    const projectRepo = {
        find: jest.fn(async () => projectRows),
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [
                project_financials_service_1.ProjectFinancialsService,
                financial_encryption_service_1.FinancialEncryptionService,
                {
                    provide: key_provider_interface_1.FINANCIAL_KEY_PROVIDER,
                    useValue: { getCurrentKeyVersion: () => 1, getKey: () => KEY },
                },
                { provide: (0, typeorm_1.getRepositoryToken)(project_entity_1.Project), useValue: projectRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(payment_entity_1.Payment), useValue: paymentRepo },
            ],
        }).compile();
        service = moduleRef.get(project_financials_service_1.ProjectFinancialsService);
        encryption = moduleRef.get(financial_encryption_service_1.FinancialEncryptionService);
    });
    beforeEach(() => {
        paymentRows = [];
        projectRows = [];
        jest.clearAllMocks();
    });
    function fixedProject(id, amount) {
        const project = new project_entity_1.Project();
        project.id = id;
        project.clientId = 'client-1';
        Object.assign(project, encryption.encryptAmount(money_util_1.Money.fromDecimalString(amount), financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT));
        return project;
    }
    function variableProject(id) {
        const project = new project_entity_1.Project();
        project.id = id;
        project.clientId = 'client-1';
        project.encryptedAmount = null;
        project.amountIv = null;
        project.amountAuthTag = null;
        project.encryptionKeyVersion = null;
        return project;
    }
    function payment(projectId, amount, date = '2026-03-01') {
        const row = new payment_entity_1.Payment();
        row.id = `pay-${projectId}-${amount}`;
        row.projectId = projectId;
        row.clientId = 'client-1';
        row.paymentDate = date;
        row.status = payment_enum_1.PaymentStatus.VALID;
        Object.assign(row, encryption.encryptAmount(money_util_1.Money.fromDecimalString(amount), financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT));
        return row;
    }
    describe('fixed-amount project', () => {
        it('computes due as amount minus payments', async () => {
            const project = fixedProject('p1', '500000.00');
            paymentRows = [payment('p1', '100000.00'), payment('p1', '150000.00')];
            const totals = await service.totalsForProject(project);
            expect(totals.hasProjectAmount).toBe(true);
            expect(totals.projectAmount?.toDecimalString()).toBe('500000.00');
            expect(totals.totalReceived.toDecimalString()).toBe('250000.00');
            expect(totals.dueAmount?.toDecimalString()).toBe('250000.00');
            expect(totals.paymentStatus).toBe(project_status_enum_1.ProjectPaymentStatus.PARTIALLY_PAID);
        });
        it('reports FULLY_PAID and a zero due when settled', async () => {
            const project = fixedProject('p1', '500000.00');
            paymentRows = [payment('p1', '500000.00')];
            const totals = await service.totalsForProject(project);
            expect(totals.dueAmount?.toDecimalString()).toBe('0.00');
            expect(totals.paymentStatus).toBe(project_status_enum_1.ProjectPaymentStatus.FULLY_PAID);
        });
        it('clamps due to zero rather than reporting a negative on overpayment', async () => {
            const project = fixedProject('p1', '100000.00');
            paymentRows = [payment('p1', '150000.00')];
            const totals = await service.totalsForProject(project);
            expect(totals.dueAmount?.toDecimalString()).toBe('0.00');
            expect(totals.paymentStatus).toBe(project_status_enum_1.ProjectPaymentStatus.OVERPAID);
        });
        it('distinguishes an actual zero amount from an undefined one', async () => {
            const project = fixedProject('p1', '0.00');
            const totals = await service.totalsForProject(project);
            expect(totals.hasProjectAmount).toBe(true);
            expect(totals.projectAmount?.toDecimalString()).toBe('0.00');
            expect(totals.dueAmount?.toDecimalString()).toBe('0.00');
        });
    });
    describe('project with no defined amount', () => {
        it('returns a null amount and a null due — never zero', async () => {
            const project = variableProject('p2');
            paymentRows = [
                payment('p2', '50000.00'),
                payment('p2', '55000.00'),
                payment('p2', '48000.00'),
                payment('p2', '62000.00'),
            ];
            const totals = await service.totalsForProject(project);
            expect(totals.hasProjectAmount).toBe(false);
            expect(totals.projectAmount).toBeNull();
            expect(totals.dueAmount).toBeNull();
            expect(totals.totalReceived.toDecimalString()).toBe('215000.00');
            expect(totals.paymentStatus).toBe(project_status_enum_1.ProjectPaymentStatus.VARIABLE);
        });
        it('is VARIABLE even with no payments at all — not UNPAID', async () => {
            const totals = await service.totalsForProject(variableProject('p2'));
            expect(totals.totalReceived.toDecimalString()).toBe('0.00');
            expect(totals.dueAmount).toBeNull();
            expect(totals.paymentStatus).toBe(project_status_enum_1.ProjectPaymentStatus.VARIABLE);
        });
        it('treats a partially-written ciphertext row as undefined rather than decrypting it', async () => {
            const project = fixedProject('p3', '1000.00');
            project.amountAuthTag = null;
            const totals = await service.totalsForProject(project);
            expect(totals.hasProjectAmount).toBe(false);
            expect(totals.projectAmount).toBeNull();
        });
    });
    describe('client roll-up across a mixed portfolio', () => {
        it('keeps fixed and variable projects apart', async () => {
            projectRows = [fixedProject('p1', '500000.00'), variableProject('p2')];
            paymentRows = [
                payment('p1', '300000.00'),
                payment('p2', '50000.00'),
                payment('p2', '55000.00'),
                payment('p2', '48000.00'),
                payment('p2', '62000.00'),
            ];
            const totals = await service.totalsForClient('client-1');
            expect(totals.projectCount).toBe(2);
            expect(totals.fixedProjectCount).toBe(1);
            expect(totals.variableProjectCount).toBe(1);
            expect(totals.totalProjectValue.toDecimalString()).toBe('500000.00');
            expect(totals.fixedReceived.toDecimalString()).toBe('300000.00');
            expect(totals.totalDue.toDecimalString()).toBe('200000.00');
            expect(totals.variableReceived.toDecimalString()).toBe('215000.00');
            expect(totals.totalReceived.toDecimalString()).toBe('515000.00');
        });
        it('never lets variable collections reduce the fixed due', async () => {
            projectRows = [fixedProject('p1', '500000.00'), variableProject('p2')];
            paymentRows = [payment('p1', '300000.00'), payment('p2', '215000.00')];
            const totals = await service.totalsForClient('client-1');
            expect(totals.totalDue.toDecimalString()).toBe('200000.00');
        });
        it('reports no due at all for a client with only variable projects', async () => {
            projectRows = [variableProject('p2')];
            paymentRows = [payment('p2', '215000.00')];
            const totals = await service.totalsForClient('client-1');
            expect(totals.totalProjectValue.toDecimalString()).toBe('0.00');
            expect(totals.totalDue.toDecimalString()).toBe('0.00');
            expect(totals.totalReceived.toDecimalString()).toBe('215000.00');
        });
    });
});
//# sourceMappingURL=project-financials.service.spec.js.map