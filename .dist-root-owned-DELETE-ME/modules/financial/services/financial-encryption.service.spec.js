"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const money_util_1 = require("../../../common/utils/money.util");
const financial_encryption_service_1 = require("./financial-encryption.service");
class TestKeyProvider {
    keys = new Map([[1, (0, crypto_1.randomBytes)(32)], [2, (0, crypto_1.randomBytes)(32)]]);
    current = 1;
    getCurrentKeyVersion() {
        return this.current;
    }
    getKey(version) {
        const key = this.keys.get(version);
        if (!key)
            throw new Error(`No key for version ${version}`);
        return key;
    }
    getAvailableVersions() {
        return [...this.keys.keys()];
    }
    setCurrent(version) {
        this.current = version;
    }
}
describe('FinancialEncryptionService', () => {
    let provider;
    let service;
    beforeEach(() => {
        provider = new TestKeyProvider();
        service = new financial_encryption_service_1.FinancialEncryptionService(provider);
    });
    it('encrypts and decrypts an amount losslessly', () => {
        const amount = money_util_1.Money.fromDecimalString('125000.50');
        const encrypted = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT);
        const decrypted = service.decryptAmount(encrypted, financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT);
        expect(decrypted.toDecimalString()).toBe('125000.50');
    });
    it('never stores the plaintext amount in the ciphertext field', () => {
        const amount = money_util_1.Money.fromDecimalString('999999.99');
        const encrypted = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        expect(encrypted.encryptedAmount).not.toContain('999999');
        expect(Buffer.from(encrypted.encryptedAmount, 'base64').toString('utf8')).not.toContain('999999');
    });
    it('produces a different ciphertext and IV for every encryption (random IV)', () => {
        const amount = money_util_1.Money.fromDecimalString('500.00');
        const first = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        const second = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        expect(first.amountIv).not.toBe(second.amountIv);
        expect(first.encryptedAmount).not.toBe(second.encryptedAmount);
    });
    it('rejects ciphertext that has been tampered with', () => {
        const amount = money_util_1.Money.fromDecimalString('1000.00');
        const encrypted = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        const tampered = { ...encrypted, encryptedAmount: Buffer.from('tampered-value').toString('base64') };
        expect(() => service.decryptAmount(tampered, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT)).toThrow();
    });
    it('rejects a payload encrypted under a different context (AAD binding)', () => {
        const amount = money_util_1.Money.fromDecimalString('1000.00');
        const encrypted = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT);
        expect(() => service.decryptAmount(encrypted, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT)).toThrow();
    });
    it('rejects an unknown encryption key version', () => {
        const amount = money_util_1.Money.fromDecimalString('1000.00');
        const encrypted = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        const withBadVersion = { ...encrypted, encryptionKeyVersion: 99 };
        expect(() => service.decryptAmount(withBadVersion, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT)).toThrow();
    });
    it('rejects malformed encryption metadata', () => {
        expect(() => service.decryptAmount({ encryptedAmount: 'x', amountIv: 'short', amountAuthTag: 'short', encryptionKeyVersion: 1 }, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT)).toThrow();
    });
    it('supports key rotation — old ciphertext still decrypts after the current version changes', () => {
        const amount = money_util_1.Money.fromDecimalString('42.00');
        const encryptedUnderV1 = service.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        provider.setCurrent(2);
        const decrypted = service.decryptAmount(encryptedUnderV1, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        expect(decrypted.toDecimalString()).toBe('42.00');
        const rotated = service.rotate(encryptedUnderV1, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
        expect(rotated.encryptionKeyVersion).toBe(2);
        expect(service.decryptAmount(rotated, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT).toDecimalString()).toBe('42.00');
    });
});
//# sourceMappingURL=financial-encryption.service.spec.js.map