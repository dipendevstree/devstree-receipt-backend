import { Inject, Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';
import { ErrorCode } from 'src/common/constants/error-codes';
import { AppException } from 'src/common/exceptions/app.exception';
import { Money } from 'src/common/utils/money.util';
import { FINANCIAL_KEY_PROVIDER, FinancialKeyProvider } from '../interfaces/key-provider.interface';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const AUTH_TAG_BYTES = 16;

/**
 * Additional authenticated data. Binding ciphertext to the field it belongs to
 * means a `payments.encrypted_amount` value cannot be pasted into
 * `projects.encrypted_amount` — authentication fails on decrypt.
 */
export enum EncryptionContext {
  PROJECT_AMOUNT = 'project.amount',
  PAYMENT_AMOUNT = 'payment.amount',
}

export interface EncryptedAmount {
  encryptedAmount: string;
  amountIv: string;
  amountAuthTag: string;
  encryptionKeyVersion: number;
}

/**
 * AES-256-GCM encryption for every monetary value in the system.
 *
 * Contract:
 *  - Plaintext is the canonical minor-unit integer string ("125050"), never a float.
 *  - A fresh random IV is generated for every encryption.
 *  - Key material is supplied by an injected provider and never leaves this class.
 *  - Neither keys nor plaintext amounts are ever logged.
 */
@Injectable()
export class FinancialEncryptionService {
  private readonly logger = new Logger(FinancialEncryptionService.name);

  constructor(@Inject(FINANCIAL_KEY_PROVIDER) private readonly keyProvider: FinancialKeyProvider) {}

  encryptAmount(amount: Money, context: EncryptionContext): EncryptedAmount {
    if (!(amount instanceof Money)) {
      throw new Error('encryptAmount requires a Money instance.');
    }

    const version = this.keyProvider.getCurrentKeyVersion();
    const key = this.keyProvider.getKey(version);
    const iv = randomBytes(IV_BYTES);

    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
    cipher.setAAD(this.aad(context, version));

    const ciphertext = Buffer.concat([
      cipher.update(amount.toMinorUnits(), 'utf8'),
      cipher.final(),
    ]);

    return {
      encryptedAmount: ciphertext.toString('base64'),
      amountIv: iv.toString('base64'),
      amountAuthTag: cipher.getAuthTag().toString('base64'),
      encryptionKeyVersion: version,
    };
  }

  decryptAmount(
    payload: EncryptedAmount,
    context: EncryptionContext,
    precision = Money.DEFAULT_PRECISION,
  ): Money {
    this.assertWellFormed(payload);

    let key: Buffer;
    try {
      key = this.keyProvider.getKey(payload.encryptionKeyVersion);
    } catch {
      // The version is real data; the message stays generic for the client.
      this.logger.error(
        `Decryption requested for unavailable key version ${payload.encryptionKeyVersion}.`,
      );
      throw new AppException(
        ErrorCode.ENCRYPTION_KEY_UNAVAILABLE,
        'Financial data cannot be read with the currently configured encryption keys.',
        500,
      );
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.amountIv, 'base64'), {
        authTagLength: AUTH_TAG_BYTES,
      });
      decipher.setAAD(this.aad(context, payload.encryptionKeyVersion));
      decipher.setAuthTag(Buffer.from(payload.amountAuthTag, 'base64'));

      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.encryptedAmount, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      if (!/^-?\d{1,25}$/.test(plaintext)) {
        throw new Error('Decrypted payload is not a minor-unit integer.');
      }

      return Money.fromMinorUnits(plaintext, precision);
    } catch {
      // Authentication failure means tampering, a wrong key, or a swapped field.
      this.logger.error(
        `Financial decryption failed for context ${context} (key v${payload.encryptionKeyVersion}).`,
      );
      throw new AppException(
        ErrorCode.DECRYPTION_FAILED,
        'Stored financial data failed its integrity check.',
        500,
      );
    }
  }

  /** True when the ciphertext round-trips — used by integrity checks and tests. */
  verify(payload: EncryptedAmount, context: EncryptionContext): boolean {
    try {
      this.decryptAmount(payload, context);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Re-encrypts a value under the current key. Supports key rotation without
   * exposing plaintext to the caller.
   */
  rotate(payload: EncryptedAmount, context: EncryptionContext): EncryptedAmount {
    if (payload.encryptionKeyVersion === this.keyProvider.getCurrentKeyVersion()) {
      return payload;
    }
    return this.encryptAmount(this.decryptAmount(payload, context), context);
  }

  private aad(context: EncryptionContext, version: number): Buffer {
    return Buffer.from(`${context}|v${version}`, 'utf8');
  }

  private assertWellFormed(payload: EncryptedAmount): void {
    const missing =
      !payload ||
      typeof payload.encryptedAmount !== 'string' ||
      typeof payload.amountIv !== 'string' ||
      typeof payload.amountAuthTag !== 'string' ||
      !Number.isInteger(payload.encryptionKeyVersion);

    if (missing) {
      throw new AppException(
        ErrorCode.DECRYPTION_FAILED,
        'Stored financial data is incomplete.',
        500,
      );
    }

    const iv = Buffer.from(payload.amountIv, 'base64');
    const tag = Buffer.from(payload.amountAuthTag, 'base64');
    if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES) {
      throw new AppException(
        ErrorCode.DECRYPTION_FAILED,
        'Stored financial data has invalid encryption metadata.',
        500,
      );
    }
  }

  /** Constant-time comparison helper for opaque token verification. */
  static safeEquals(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  }
}
