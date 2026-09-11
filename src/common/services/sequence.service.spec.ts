import { EntityManager } from 'typeorm';
import { SequenceKey } from '../entities/document-sequence.entity';
import { SequenceService } from './sequence.service';

function managerReturning(raw: unknown): EntityManager {
  return { query: jest.fn().mockResolvedValue(raw) } as unknown as EntityManager;
}

describe('SequenceService', () => {
  const service = new SequenceService();

  it('handles the [rows, rowCount] shape TypeORM returns for UPDATE ... RETURNING', async () => {
    // This is the exact shape PostgresQueryRunner produces for an UPDATE.
    const manager = managerReturning([[{ current_value: '1', prefix: 'REC-', padding: 6 }], 1]);
    await expect(service.allocate(manager, SequenceKey.RECEIPT)).resolves.toBe('REC-000001');
  });

  it('also handles a bare rows array (SELECT-style result)', async () => {
    const manager = managerReturning([{ current_value: '2', prefix: 'REC-', padding: 6 }]);
    await expect(service.allocate(manager, SequenceKey.RECEIPT)).resolves.toBe('REC-000002');
  });

  it('pads consistently as the counter grows', async () => {
    const cases: Array<[string, string]> = [
      ['1', 'REC-000001'],
      ['2', 'REC-000002'],
      ['10', 'REC-000010'],
      ['100', 'REC-000100'],
      ['1000000', 'REC-1000000'],
    ];

    for (const [value, expected] of cases) {
      const manager = managerReturning([[{ current_value: value, prefix: 'REC-', padding: 6 }], 1]);
      await expect(service.allocate(manager, SequenceKey.RECEIPT)).resolves.toBe(expected);
    }
  });

  it('supports other sequence prefixes and paddings', async () => {
    const manager = managerReturning([[{ current_value: '7', prefix: 'CLI-', padding: 4 }], 1]);
    await expect(service.allocate(manager, SequenceKey.CLIENT)).resolves.toBe('CLI-0007');
  });

  it('throws a descriptive error when the sequence row is missing', async () => {
    await expect(service.allocate(managerReturning([[], 0]), SequenceKey.RECEIPT)).rejects.toThrow(
      /not initialised/,
    );
    await expect(service.allocate(managerReturning([]), SequenceKey.RECEIPT)).rejects.toThrow(
      /not initialised/,
    );
  });

  it('throws a descriptive error rather than a TypeError on a malformed row', async () => {
    const manager = managerReturning([[{ prefix: 'REC-', padding: 6 }], 1]);
    await expect(service.allocate(manager, SequenceKey.RECEIPT)).rejects.toThrow(/not initialised/);
  });
});
