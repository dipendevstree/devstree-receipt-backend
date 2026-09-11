"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_service_1 = require("./password.service");
describe('PasswordService', () => {
    const service = new password_service_1.PasswordService();
    it('hashes and verifies a password', async () => {
        const hash = await service.hash('Str0ng!Passw0rd');
        expect(hash).not.toContain('Str0ng!Passw0rd');
        await expect(service.verify(hash, 'Str0ng!Passw0rd')).resolves.toBe(true);
        await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
    });
    it('treats a missing hash as a failed verification without throwing', async () => {
        await expect(service.verify(null, 'anything')).resolves.toBe(false);
        await expect(service.verify(undefined, 'anything')).resolves.toBe(false);
    });
    it('rejects passwords that are too short', () => {
        expect(() => service.assertStrength('Sh0rt!')).toThrow();
    });
    it('rejects passwords missing a required character class', () => {
        expect(() => service.assertStrength('alllowercase123')).toThrow();
        expect(() => service.assertStrength('ALLUPPERCASE123')).toThrow();
        expect(() => service.assertStrength('NoDigitsHere!!')).toThrow();
        expect(() => service.assertStrength('NoSymbols1234')).toThrow();
    });
    it('rejects a commonly used password', () => {
        expect(() => service.assertStrength('password123')).toThrow();
    });
    it('accepts a strong password', () => {
        expect(() => service.assertStrength('C0rrect!Horse#Battery')).not.toThrow();
    });
    it('produces stable, comparable token hashes', () => {
        const token = service.generateToken();
        const hashA = service.hashToken(token);
        const hashB = service.hashToken(token);
        expect(hashA).toBe(hashB);
        expect(service.compareTokenHash(hashA, hashB)).toBe(true);
        expect(service.compareTokenHash(hashA, service.hashToken('different'))).toBe(false);
    });
    it('generates unique tokens', () => {
        const a = service.generateToken();
        const b = service.generateToken();
        expect(a).not.toBe(b);
    });
});
//# sourceMappingURL=password.service.spec.js.map