import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Field names that must never reach the audit trail in readable form.
 * Redaction is applied recursively to every snapshot before it is persisted.
 */
const REDACTED_FIELDS = new Set([
  'amount',
  'projectamount',
  'paymentamount',
  'totalreceived',
  'dueamount',
  'receivedamount',
  'encryptedamount',
  'amountiv',
  'amountauthtag',
  'password',
  'passwordhash',
  'accountpassword',
  'accountpasswordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'sessiontokenhash',
  'tokenhash',
  'encryptionkey',
]);

const REDACTED_MARKER = '[REDACTED]';

export interface AuditEntryInput {
  action: AuditAction;
  module: AuditModule;
  recordId?: string | null;
  description?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  actor?: Pick<AuthenticatedUser, 'id' | 'name'> | null;
  context?: RequestContext | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  /**
   * Writes an audit entry. Pass a transactional manager when the entry must
   * commit atomically with the operation it describes (payments, receipts).
   */
  async record(entry: AuditEntryInput, manager?: EntityManager): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb columns
    // don't structurally satisfy QueryDeepPartialEntity; the shape is validated above.
    const log = this.build(entry) as any;
    try {
      if (manager) {
        await manager.getRepository(AuditLog).insert(log);
      } else {
        await this.repository.insert(log);
      }
    } catch (error) {
      // An audit write must never take down the business operation, but the
      // failure has to be visible in the application log.
      this.logger.error(
        `Failed to persist audit entry ${entry.action} for ${entry.module}/${entry.recordId ?? '-'}`,
        error instanceof Error ? error.stack : String(error),
      );
      if (manager) throw error;
    }
  }

  private build(entry: AuditEntryInput): Partial<AuditLog> {
    return {
      userId: entry.actor?.id ?? null,
      userName: entry.actor?.name ?? null,
      action: entry.action,
      module: entry.module,
      recordId: entry.recordId ?? null,
      description: entry.description?.slice(0, 255) ?? null,
      oldValue: redactSensitive(entry.oldValue),
      newValue: redactSensitive(entry.newValue),
      ipAddress: entry.context?.ipAddress ?? null,
      userAgent: entry.context?.userAgent ?? null,
    };
  }
}

/**
 * Recursively replaces monetary and credential values with a marker.
 * Exported for direct unit testing — this is a security control, not a helper.
 */
export function redactSensitive<T>(value: T, depth = 0): T | null {
  if (value === null || value === undefined) return null;
  if (depth > 6) return REDACTED_MARKER as unknown as T;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1)) as unknown as T;
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
      if (REDACTED_FIELDS.has(normalized)) {
        result[key] = REDACTED_MARKER;
        continue;
      }
      result[key] =
        typeof entryValue === 'object' && entryValue !== null
          ? redactSensitive(entryValue, depth + 1)
          : entryValue;
    }
    return result as unknown as T;
  }

  return value;
}
