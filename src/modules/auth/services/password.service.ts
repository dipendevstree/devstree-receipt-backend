import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PASSWORD_MIN_LENGTH } from 'src/common/constants/app.constants';
import { AppException } from 'src/common/exceptions/app.exception';

/**
 * Argon2id parameters. Tuned for interactive login on modest hardware while
 * staying well above the OWASP minimum (19 MiB memory, t=2).
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'admin123456',
  '1234567890',
  'qwertyuiop',
  'letmein123',
  'welcome123',
  'changeme123',
]);

@Injectable()
export class PasswordService {
  async hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, ARGON2_OPTIONS);
  }

  /**
   * Verifies a password. Returns false rather than throwing on malformed hashes
   * so callers cannot distinguish "no hash stored" from "wrong password".
   */
  async verify(hash: string | null | undefined, plaintext: string): Promise<boolean> {
    if (!hash) {
      // Spend comparable time so a missing hash is not detectable by timing.
      await this.burnTime();
      return false;
    }
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      return false;
    }
  }

  /** Rejects weak passwords before they are ever hashed. */
  assertStrength(plaintext: string, label = 'Password'): void {
    const failures: string[] = [];

    if (plaintext.length < PASSWORD_MIN_LENGTH) {
      failures.push(`be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[a-z]/.test(plaintext)) failures.push('include a lowercase letter');
    if (!/[A-Z]/.test(plaintext)) failures.push('include an uppercase letter');
    if (!/\d/.test(plaintext)) failures.push('include a number');
    if (!/[^A-Za-z0-9]/.test(plaintext)) failures.push('include a symbol');
    if (COMMON_PASSWORDS.has(plaintext.toLowerCase())) {
      failures.push('not be a commonly used password');
    }

    if (failures.length > 0) {
      throw AppException.badRequest(
        ErrorCode.WEAK_PASSWORD,
        `${label} must ${failures.join(', ')}.`,
      );
    }
  }

  /** Opaque, high-entropy token for refresh and financial-unlock grants. */
  generateToken(bytes = 48): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** Tokens are persisted only as digests — a database dump yields nothing usable. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  compareTokenHash(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  }

  private async burnTime(): Promise<void> {
    await argon2.hash(randomBytes(16).toString('hex'), ARGON2_OPTIONS);
  }
}
