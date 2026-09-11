import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DocumentSequence, SequenceKey } from '../entities/document-sequence.entity';

interface SequenceRow {
  current_value: string;
  prefix: string;
  padding: number;
}

/**
 * Allocates the next value for a document sequence.
 *
 * The UPDATE ... RETURNING is atomic and takes a row lock for the remainder of
 * the caller's transaction, so concurrent payment creation can never produce two
 * identical receipt numbers. The caller MUST pass a transactional EntityManager.
 */
@Injectable()
export class SequenceService {
  async allocate(manager: EntityManager, key: SequenceKey): Promise<string> {
    const raw = await manager.query(
      `UPDATE document_sequences
          SET current_value = current_value + 1,
              updated_at = now()
        WHERE key = $1
    RETURNING current_value, prefix, padding`,
      [key],
    );

    const row = this.firstRow(raw);
    if (!row) {
      throw new Error(`Document sequence "${key}" is not initialised. Run the migrations.`);
    }

    return this.format(row.prefix, row.current_value, row.padding);
  }

  /** Peeks at the next value without consuming it — for previews only. */
  async peek(manager: EntityManager, key: SequenceKey): Promise<string> {
    const sequence = await manager.findOne(DocumentSequence, { where: { key } });
    if (!sequence) {
      throw new Error(`Document sequence "${key}" is not initialised. Run the migrations.`);
    }
    return this.format(
      sequence.prefix,
      (BigInt(sequence.currentValue) + 1n).toString(),
      sequence.padding,
    );
  }

  /**
   * TypeORM's Postgres driver returns `[rows, rowCount]` for UPDATE/DELETE but a
   * bare `rows` array for SELECT (see PostgresQueryRunner.query). Normalising
   * both shapes here is what keeps RETURNING usable from `manager.query`.
   */
  private firstRow(raw: unknown): SequenceRow | null {
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const rows = Array.isArray(raw[0]) ? (raw[0] as unknown[]) : (raw as unknown[]);
    const candidate = rows[0] as Partial<SequenceRow> | undefined;

    if (
      !candidate ||
      candidate.current_value === undefined ||
      candidate.prefix === undefined ||
      candidate.padding === undefined
    ) {
      return null;
    }

    return candidate as SequenceRow;
  }

  private format(prefix: string, value: string | number, padding: number): string {
    // `current_value` is a bigint column, which the pg driver returns as a string.
    return `${prefix}${String(value).padStart(padding, '0')}`;
  }
}
