"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const env_validation_1 = require("./env.validation");
function baseEnv(overrides = {}) {
    return {
        NODE_ENV: 'development',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'devstree_receipt',
        DATABASE_USER: 'devstree',
        DATABASE_PASSWORD: 'local-dev-password',
        JWT_SECRET: (0, crypto_1.randomBytes)(32).toString('hex'),
        JWT_REFRESH_SECRET: (0, crypto_1.randomBytes)(32).toString('hex'),
        FINANCIAL_ENCRYPTION_KEY: (0, crypto_1.randomBytes)(32).toString('base64'),
        ...overrides,
    };
}
describe('decodeEncryptionKey', () => {
    it('accepts a valid base64-encoded 32-byte key', () => {
        const key = (0, crypto_1.randomBytes)(32).toString('base64');
        expect((0, env_validation_1.decodeEncryptionKey)(key)).toHaveLength(32);
    });
    it('accepts a valid 64-character hex key', () => {
        const key = (0, crypto_1.randomBytes)(32).toString('hex');
        expect((0, env_validation_1.decodeEncryptionKey)(key)).toHaveLength(32);
    });
    it('rejects a key that is too short', () => {
        expect(() => (0, env_validation_1.decodeEncryptionKey)((0, crypto_1.randomBytes)(16).toString('base64'))).toThrow();
    });
    it('rejects an empty key', () => {
        expect(() => (0, env_validation_1.decodeEncryptionKey)('')).toThrow();
    });
    it('rejects an obvious placeholder value', () => {
        expect(() => (0, env_validation_1.decodeEncryptionKey)('change_me_base64_encoded_32_byte_key')).toThrow();
    });
    it('rejects a low-entropy key (repeated byte)', () => {
        expect(() => (0, env_validation_1.decodeEncryptionKey)(Buffer.alloc(32, 0).toString('base64'))).toThrow();
    });
});
describe('validateEnv', () => {
    it('accepts a well-formed configuration', () => {
        expect(() => (0, env_validation_1.validateEnv)(baseEnv())).not.toThrow();
    });
    it('fails startup when FINANCIAL_ENCRYPTION_KEY is missing', () => {
        const env = baseEnv();
        delete env.FINANCIAL_ENCRYPTION_KEY;
        expect(() => (0, env_validation_1.validateEnv)(env)).toThrow();
    });
    it('fails startup when FINANCIAL_ENCRYPTION_KEY is the wrong length', () => {
        expect(() => (0, env_validation_1.validateEnv)(baseEnv({ FINANCIAL_ENCRYPTION_KEY: (0, crypto_1.randomBytes)(16).toString('base64') }))).toThrow();
    });
    it('fails startup when JWT secrets are too short', () => {
        expect(() => (0, env_validation_1.validateEnv)(baseEnv({ JWT_SECRET: 'too-short' }))).toThrow();
    });
    it('fails startup when JWT secrets are identical', () => {
        const secret = (0, crypto_1.randomBytes)(32).toString('hex');
        expect(() => (0, env_validation_1.validateEnv)(baseEnv({ JWT_SECRET: secret, JWT_REFRESH_SECRET: secret }))).toThrow();
    });
    it('fails startup when a required database field is missing', () => {
        const env = baseEnv();
        delete env.DATABASE_PASSWORD;
        expect(() => (0, env_validation_1.validateEnv)(env)).toThrow();
    });
});
//# sourceMappingURL=env.validation.spec.js.map