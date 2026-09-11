import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { ProjectPaymentStatus } from 'src/common/enums/project-status.enum';
import { Money } from 'src/common/utils/money.util';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { EncryptionContext, FinancialEncryptionService } from './financial-encryption.service';
import { ProjectFinancialsService } from './project-financials.service';
import { FINANCIAL_KEY_PROVIDER } from '../interfaces/key-provider.interface';

const KEY = Buffer.alloc(32, 7);

/**
 * These tests pin the single most consequential rule in the system: a project
 * with no defined amount has NO due, and its (absent) value must never be
 * treated as zero. Treating NULL as 0 would report a retainer that collected
 * ₹2,15,000 as ₹2,15,000 overpaid, and would silently inflate every
 * client-level "due" figure.
 */
describe('ProjectFinancialsService — projects with and without a defined amount', () => {
  let service: ProjectFinancialsService;
  let encryption: FinancialEncryptionService;
  let paymentRows: Payment[] = [];
  let projectRows: Project[] = [];

  const paymentRepo = {
    find: jest.fn(async () => paymentRows),
  };
  const projectRepo = {
    find: jest.fn(async () => projectRows),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectFinancialsService,
        FinancialEncryptionService,
        {
          provide: FINANCIAL_KEY_PROVIDER,
          useValue: { getCurrentKeyVersion: () => 1, getKey: () => KEY },
        },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
      ],
    }).compile();

    service = moduleRef.get(ProjectFinancialsService);
    encryption = moduleRef.get(FinancialEncryptionService);
  });

  beforeEach(() => {
    paymentRows = [];
    projectRows = [];
    jest.clearAllMocks();
  });

  /** A project whose amount is stored as ciphertext. */
  function fixedProject(id: string, amount: string): Project {
    const project = new Project();
    project.id = id;
    project.clientId = 'client-1';
    Object.assign(
      project,
      encryption.encryptAmount(Money.fromDecimalString(amount), EncryptionContext.PROJECT_AMOUNT),
    );
    return project;
  }

  /** A monthly/retainer project — all four ciphertext columns NULL. */
  function variableProject(id: string): Project {
    const project = new Project();
    project.id = id;
    project.clientId = 'client-1';
    project.encryptedAmount = null;
    project.amountIv = null;
    project.amountAuthTag = null;
    project.encryptionKeyVersion = null;
    return project;
  }

  function payment(projectId: string, amount: string, date = '2026-03-01'): Payment {
    const row = new Payment();
    row.id = `pay-${projectId}-${amount}`;
    row.projectId = projectId;
    row.clientId = 'client-1';
    row.paymentDate = date;
    row.status = PaymentStatus.VALID;
    Object.assign(
      row,
      encryption.encryptAmount(Money.fromDecimalString(amount), EncryptionContext.PAYMENT_AMOUNT),
    );
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
      expect(totals.paymentStatus).toBe(ProjectPaymentStatus.PARTIALLY_PAID);
    });

    it('reports FULLY_PAID and a zero due when settled', async () => {
      const project = fixedProject('p1', '500000.00');
      paymentRows = [payment('p1', '500000.00')];

      const totals = await service.totalsForProject(project);

      expect(totals.dueAmount?.toDecimalString()).toBe('0.00');
      expect(totals.paymentStatus).toBe(ProjectPaymentStatus.FULLY_PAID);
    });

    it('clamps due to zero rather than reporting a negative on overpayment', async () => {
      const project = fixedProject('p1', '100000.00');
      paymentRows = [payment('p1', '150000.00')];

      const totals = await service.totalsForProject(project);

      expect(totals.dueAmount?.toDecimalString()).toBe('0.00');
      expect(totals.paymentStatus).toBe(ProjectPaymentStatus.OVERPAID);
    });

    it('distinguishes an actual zero amount from an undefined one', async () => {
      // An encrypted 0 is a real, deliberate amount: due is 0, not N/A.
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
      expect(totals.paymentStatus).toBe(ProjectPaymentStatus.VARIABLE);
    });

    it('is VARIABLE even with no payments at all — not UNPAID', async () => {
      const totals = await service.totalsForProject(variableProject('p2'));

      expect(totals.totalReceived.toDecimalString()).toBe('0.00');
      expect(totals.dueAmount).toBeNull();
      expect(totals.paymentStatus).toBe(ProjectPaymentStatus.VARIABLE);
    });

    it('treats a partially-written ciphertext row as undefined rather than decrypting it', async () => {
      const project = fixedProject('p3', '1000.00');
      project.amountAuthTag = null; // simulates a half-written row

      const totals = await service.totalsForProject(project);

      expect(totals.hasProjectAmount).toBe(false);
      expect(totals.projectAmount).toBeNull();
    });
  });

  describe('client roll-up across a mixed portfolio', () => {
    it('keeps fixed and variable projects apart', async () => {
      // ABC Pvt Ltd: one ₹5,00,000 website project (₹3,00,000 received) and one
      // open-ended SEO retainer (₹2,15,000 received).
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

      // Only the fixed project contributes a value…
      expect(totals.totalProjectValue.toDecimalString()).toBe('500000.00');
      // …and only its own receipts count against that value.
      expect(totals.fixedReceived.toDecimalString()).toBe('300000.00');
      expect(totals.totalDue.toDecimalString()).toBe('200000.00');

      // The retainer's collections are reported, but separately.
      expect(totals.variableReceived.toDecimalString()).toBe('215000.00');
      expect(totals.totalReceived.toDecimalString()).toBe('515000.00');
    });

    it('never lets variable collections reduce the fixed due', async () => {
      // The bug this guards against: netting ₹2,15,000 of retainer income
      // against the website project would report ₹0 due instead of ₹2,00,000.
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
