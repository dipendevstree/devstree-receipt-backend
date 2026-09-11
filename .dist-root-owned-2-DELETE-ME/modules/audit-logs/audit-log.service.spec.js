"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_log_service_1 = require("./audit-log.service");
describe('redactSensitive', () => {
    it('redacts known financial and credential fields', () => {
        const input = {
            projectAmount: '100000.00',
            paymentAmount: '25000.00',
            encryptedAmount: 'abc123',
            accountPassword: 'super-secret',
            passwordHash: '$argon2id$...',
            refreshToken: 'opaque-token',
            clientName: 'ABC Pvt Ltd',
        };
        const result = (0, audit_log_service_1.redactSensitive)(input);
        expect(result.projectAmount).toBe('[REDACTED]');
        expect(result.paymentAmount).toBe('[REDACTED]');
        expect(result.encryptedAmount).toBe('[REDACTED]');
        expect(result.accountPassword).toBe('[REDACTED]');
        expect(result.passwordHash).toBe('[REDACTED]');
        expect(result.refreshToken).toBe('[REDACTED]');
        expect(result.clientName).toBe('ABC Pvt Ltd');
    });
    it('redacts recursively inside nested objects and arrays', () => {
        const input = {
            payment: { amount: '500.00', notes: 'advance' },
            history: [{ password: 'x' }, { note: 'ok' }],
        };
        const result = (0, audit_log_service_1.redactSensitive)(input);
        expect(result.payment.amount).toBe('[REDACTED]');
        expect(result.payment.notes).toBe('advance');
        expect(result.history[0].password).toBe('[REDACTED]');
        expect(result.history[1].note).toBe('ok');
    });
    it('returns null for null/undefined input', () => {
        expect((0, audit_log_service_1.redactSensitive)(null)).toBeNull();
        expect((0, audit_log_service_1.redactSensitive)(undefined)).toBeNull();
    });
    it('passes through primitive and non-sensitive values unchanged', () => {
        const input = { count: 5, active: true, label: 'PROJECT_CREATED' };
        expect((0, audit_log_service_1.redactSensitive)(input)).toEqual(input);
    });
});
//# sourceMappingURL=audit-log.service.spec.js.map