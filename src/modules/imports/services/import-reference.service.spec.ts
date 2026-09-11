import { MasterStatus, MasterType } from 'src/common/enums/master-type.enum';
import { PaymentMethod } from 'src/common/enums/payment.enum';
import { ImportReferenceService } from './import-reference.service';

/** Query builder stub that just hands back whatever the test queued up. */
function repositoryReturning(matches: unknown[]) {
  const builder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(matches),
  };
  return { createQueryBuilder: jest.fn(() => builder), find: jest.fn() };
}

describe('ImportReferenceService', () => {
  describe('resolveClient', () => {
    it('resolves a unique match', async () => {
      const client = { id: 'c1', clientCode: 'CLI-0001', name: 'John Doe' };
      const service = new ImportReferenceService(
        repositoryReturning([client]) as never,
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
      );

      await expect(service.resolveClient('John Doe')).resolves.toEqual({ ok: true, value: client });
    });

    it('fails with guidance when nothing matches', async () => {
      const service = new ImportReferenceService(
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
      );

      const result = await service.resolveClient('Ghost Ltd');
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/was not found/);
    });

    it('refuses to guess when a name matches more than one client', async () => {
      const service = new ImportReferenceService(
        repositoryReturning([
          { id: 'c1', clientCode: 'CLI-0001', name: 'Acme' },
          { id: 'c2', clientCode: 'CLI-0007', name: 'Acme' },
        ]) as never,
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
      );

      const result = await service.resolveClient('Acme');
      expect(result.ok).toBe(false);
      // Naming the codes is what makes the error actionable.
      expect(result.ok === false && result.error).toMatch(/CLI-0001, CLI-0007/);
      expect(result.ok === false && result.error).toMatch(/client code/);
    });

    it('treats a blank cell as a missing required reference', async () => {
      const service = new ImportReferenceService(
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
      );
      await expect(service.resolveClient('   ')).resolves.toMatchObject({ ok: false });
    });
  });

  describe('resolveProject', () => {
    it('refuses to guess between two projects of the same name for one client', async () => {
      const service = new ImportReferenceService(
        repositoryReturning([]) as never,
        repositoryReturning([
          { id: 'p1', projectCode: 'PRJ-0001' },
          { id: 'p2', projectCode: 'PRJ-0009' },
        ]) as never,
        repositoryReturning([]) as never,
      );

      const result = await service.resolveProject('Website', 'c1');
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/PRJ-0001, PRJ-0009/);
    });

    it('reports a project that does not belong to the client', async () => {
      const service = new ImportReferenceService(
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
      );

      const result = await service.resolveProject('Website', 'c1');
      expect(result.ok === false && result.error).toMatch(/not found for this client/);
    });
  });

  describe('resolvePaymentMethod', () => {
    const masters = {
      createQueryBuilder: jest.fn(),
      find: jest.fn().mockResolvedValue([
        {
          name: 'Bank Transfer',
          code: 'BANK_TRANSFER',
          type: MasterType.PAYMENT_METHOD,
          status: MasterStatus.ACTIVE,
        },
        // A master row whose code no payment can store must not become usable.
        {
          name: 'Crypto',
          code: 'CRYPTO',
          type: MasterType.PAYMENT_METHOD,
          status: MasterStatus.ACTIVE,
        },
      ]),
    };

    let service: ImportReferenceService;

    beforeEach(() => {
      service = new ImportReferenceService(
        repositoryReturning([]) as never,
        repositoryReturning([]) as never,
        masters as never,
      );
    });

    it('accepts the stored code', async () => {
      await expect(service.resolvePaymentMethod('BANK_TRANSFER')).resolves.toEqual({
        ok: true,
        value: PaymentMethod.BANK_TRANSFER,
      });
    });

    it('accepts the configured label in any casing or spacing', async () => {
      for (const input of ['Bank Transfer', 'bank transfer', 'bank-transfer']) {
        await expect(service.resolvePaymentMethod(input)).resolves.toEqual({
          ok: true,
          value: PaymentMethod.BANK_TRANSFER,
        });
      }
    });

    it('rejects a master whose code is not a storable payment method', async () => {
      const result = await service.resolvePaymentMethod('Crypto');
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/BANK_TRANSFER, UPI/);
    });

    it('rejects an unknown method and lists what is allowed', async () => {
      const result = await service.resolvePaymentMethod('Carrier Pigeon');
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/not recognised/);
    });
  });
});
