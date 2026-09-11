import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { MasterStatus, MasterType } from 'src/common/enums/master-type.enum';
import { PaymentMethod } from 'src/common/enums/payment.enum';
import { Client } from 'src/modules/clients/entities/client.entity';
import { MasterItem } from 'src/modules/masters/entities/master-item.entity';
import { Project } from 'src/modules/projects/entities/project.entity';

/**
 * Either a resolved record or the reason it could not be resolved. The `ok`
 * flag is what lets a caller narrow to `value` without a non-null assertion —
 * an empty error string would defeat a truthiness check.
 */
export type Resolution<T> = { ok: true; value: T } | { ok: false; error: string };

const failed = <T>(error: string): Resolution<T> => ({ ok: false, error });
const resolved = <T>(value: T): Resolution<T> => ({ ok: true, value });

/**
 * Turns the human identifiers people actually type into a spreadsheet — a
 * client name, a project code, "Bank Transfer" — into database records.
 *
 * Two rules govern everything here:
 *
 *  1. Never require a UUID. Nobody has one to hand when filling in a sheet.
 *  2. Never guess. If a name matches two records the row fails with an explicit
 *     error naming the codes to disambiguate with, because silently picking the
 *     first match would file a payment against the wrong client.
 */
@Injectable()
export class ImportReferenceService {
  private paymentMethodAliases: Map<string, PaymentMethod> | null = null;

  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(MasterItem) private readonly masters: Repository<MasterItem>,
  ) {}

  /** Accepts a client code (CLI-0001), an email address, or an exact client name. */
  async resolveClient(raw: string): Promise<Resolution<Client>> {
    const text = raw.trim();
    if (text === '') return failed('Client is required.');

    const matches = await this.clients
      .createQueryBuilder('client')
      .where('client.deleted_at IS NULL')
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('LOWER(client.client_code) = :term', { term: text.toLowerCase() })
            .orWhere('LOWER(client.email) = :term', { term: text.toLowerCase() })
            .orWhere('LOWER(client.name) = :term', { term: text.toLowerCase() }),
        ),
      )
      .limit(5)
      .getMany();

    if (matches.length === 0) {
      return failed(`Client "${text}" was not found. Use the client name, email or client code.`);
    }
    if (matches.length > 1) {
      const codes = matches.map((match) => match.clientCode).join(', ');
      return failed(
        `"${text}" matches more than one client (${codes}). Use the client code instead.`,
      );
    }

    return resolved(matches[0]);
  }

  /** Accepts a project code (PRJ-0001) or an exact project name belonging to `clientId`. */
  async resolveProject(raw: string, clientId: string): Promise<Resolution<Project>> {
    const text = raw.trim();
    if (text === '') return failed('Project is required.');

    const matches = await this.projects
      .createQueryBuilder('project')
      .where('project.deleted_at IS NULL')
      .andWhere('project.client_id = :clientId', { clientId })
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('LOWER(project.project_code) = :term', { term: text.toLowerCase() })
            .orWhere('LOWER(project.project_name) = :term', { term: text.toLowerCase() }),
        ),
      )
      .limit(5)
      .getMany();

    if (matches.length === 0) {
      return failed(
        `Project "${text}" was not found for this client. Use the project name or project code.`,
      );
    }
    if (matches.length > 1) {
      const codes = matches.map((match) => match.projectCode).join(', ');
      return failed(
        `"${text}" matches more than one project for this client (${codes}). Use the project code instead.`,
      );
    }

    return resolved(matches[0]);
  }

  /**
   * Accepts the stored code (BANK_TRANSFER) or the label configured under
   * Masters → Payment Methods ("Bank Transfer"). Only methods that exist as
   * both an active master row and a payment_method enum value are accepted —
   * a master whose code the column cannot store would fail at insert time.
   */
  async resolvePaymentMethod(raw: string): Promise<Resolution<PaymentMethod>> {
    const text = raw.trim();
    if (text === '') return failed('Payment Method is required.');

    const aliases = await this.loadPaymentMethodAliases();
    const match = aliases.get(text.toLowerCase().replace(/[\s-]+/g, '_'));

    if (!match) {
      return failed(
        `Payment Method "${text}" is not recognised. Allowed values: ${Object.values(PaymentMethod).join(', ')}.`,
      );
    }
    return resolved(match);
  }

  /** Reset between files so a master edited mid-session is picked up. */
  resetCaches(): void {
    this.paymentMethodAliases = null;
  }

  private async loadPaymentMethodAliases(): Promise<Map<string, PaymentMethod>> {
    if (this.paymentMethodAliases) return this.paymentMethodAliases;

    const aliases = new Map<string, PaymentMethod>();
    const enumValues = new Set<string>(Object.values(PaymentMethod));

    for (const value of Object.values(PaymentMethod)) {
      // Lookup keys are lower-cased with spaces/hyphens folded to underscores,
      // so "Bank Transfer", "bank-transfer" and "BANK_TRANSFER" share a key.
      aliases.set(value.toLowerCase(), value);
    }

    const masterRows = await this.masters.find({
      where: { type: MasterType.PAYMENT_METHOD, status: MasterStatus.ACTIVE, deletedAt: IsNull() },
    });

    for (const row of masterRows) {
      if (!enumValues.has(row.code)) continue;
      aliases.set(row.name.toLowerCase().replace(/[\s-]+/g, '_'), row.code as PaymentMethod);
      aliases.set(row.code.toLowerCase(), row.code as PaymentMethod);
    }

    this.paymentMethodAliases = aliases;
    return aliases;
  }
}
