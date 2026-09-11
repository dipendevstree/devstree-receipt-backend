import { randomBytes } from 'crypto';
import { Money } from 'src/common/utils/money.util';
import { FinancialKeyProvider } from '../interfaces/key-provider.interface';
import { EncryptionContext, FinancialEncryptionService } from './financial-encryption.service';

class TestKeyProvider implements FinancialKeyProvider {
  private readonly keys = new Map<number, Buffer>([
    [1, randomBytes(32)],
    [2, randomBytes(32)],
  ]);
  private current = 1;

  getCurrentKeyVersion(): number {
    return this.current;
  }

  getKey(version: number): Buffer {
    const key = this.keys.get(version);
    if (!key) throw new Error(`No key for version ${version}`);
    return key;
  }

  getAvailableVersions(): number[] {
    return [...this.keys.keys()];
  }

  setCurrent(version: number): void {
    this.current = version;
  }
}

describe('FinancialEncryptionService', () => {
  let provider: TestKeyProvider;
  let service: FinancialEncryptionService;

  beforeEach(() => {
    provider = new TestKeyProvider();
    service = new FinancialEncryptionService(provider);
  });

  it('encrypts and decrypts an amount losslessly', () => {
    const amount = Money.fromDecimalString('125000.50');
    const encrypted = service.encryptAmount(amount, EncryptionContext.PROJECT_AMOUNT);
    const decrypted = service.decryptAmount(encrypted, EncryptionContext.PROJECT_AMOUNT);
    expect(decrypted.toDecimalString()).toBe('125000.50');
  });

  it('never stores the plaintext amount in the ciphertext field', () => {
    const amount = Money.fromDecimalString('999999.99');
    const encrypted = service.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);
    expect(encrypted.encryptedAmount).not.toContain('999999');
    expect(Buffer.from(encrypted.encryptedAmount, 'base64').toString('utf8')).not.toContain(
      '999999',
    );
  });

  it('produces a different ciphertext and IV for every encryption (random IV)', () => {
    const amount = Money.fromDecimalString('500.00');
    const first = service.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);
    const second = service.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);
    expect(first.amountIv).not.toBe(second.amountIv);
    expect(first.encryptedAmount).not.toBe(second.encryptedAmount);
  });

  it('rejects ciphertext that has been tampered with', () => {
    const amount = Money.fromDecimalString('1000.00');
    const encrypted = service.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);
    const tampered = {
      ...encrypted,
      encryptedAmount: Buffer.from('tampered-value').toString('base64'),
    };
    expect(() => service.decryptAmount(tampered, EncryptionContext.PAYMENT_AMOUNT)).toThrow();
  });

  it('rejects a payload encrypted under a different context (AAD binding)', () => {
    const amount = Money.fromDecimalString('1000.00');
    const encrypted = service.encryptAmount(amount, EncryptionContext.PROJECT_AMOUNT);
    // Pasting a project-amount ciphertext into a payment-amount field must fail.
    expect(() => service.decryptAmount(encrypted, EncryptionContext.PAYMENT_AMOUNT)).toThrow();
  });

  it('rejects an unknown encryption key version', () => {
    const amount = Money.fromDecimalString('1000.00');
    const encrypted = service.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);
    const withBadVersion = { ...encrypted, encryptionKeyVersion: 99 };
    expect(() => service.decryptAmount(withBadVersion, EncryptionContext.PAYMENT_AMOUNT)).toThrow();
  });

  it('rejects malformed encryption metadata', () => {
    expect(() =>
      service.decryptAmount(
        {
          encryptedAmount: 'x',
          amountIv: 'short',
          amountAuthTag: 'short',
          encryptionKeyVersion: 1,
        },
        EncryptionContext.PAYMENT_AMOUNT,
      ),
    ).toThrow();
  });

  it('supports key rotation — old ciphertext still decrypts after the current version changes', () => {
    const amount = Money.fromDecimalString('42.00');
    const encryptedUnderV1 = service.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);

    provider.setCurrent(2);
    const decrypted = service.decryptAmount(encryptedUnderV1, EncryptionContext.PAYMENT_AMOUNT);
    expect(decrypted.toDecimalString()).toBe('42.00');

    const rotated = service.rotate(encryptedUnderV1, EncryptionContext.PAYMENT_AMOUNT);
    expect(rotated.encryptionKeyVersion).toBe(2);
    expect(service.decryptAmount(rotated, EncryptionContext.PAYMENT_AMOUNT).toDecimalString()).toBe(
      '42.00',
    );
  });
});
