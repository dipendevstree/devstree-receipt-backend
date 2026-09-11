import { randomBytes } from 'crypto';
import { decodeEncryptionKey, validateEnv } from './env.validation';

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    NODE_ENV: 'development',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'devstree_receipt',
    DATABASE_USER: 'devstree',
    DATABASE_PASSWORD: 'local-dev-password',
    JWT_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    FINANCIAL_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    ...overrides,
  };
}

describe('decodeEncryptionKey', () => {
  it('accepts a valid base64-encoded 32-byte key', () => {
    const key = randomBytes(32).toString('base64');
    expect(decodeEncryptionKey(key)).toHaveLength(32);
  });

  it('accepts a valid 64-character hex key', () => {
    const key = randomBytes(32).toString('hex');
    expect(decodeEncryptionKey(key)).toHaveLength(32);
  });

  it('rejects a key that is too short', () => {
    expect(() => decodeEncryptionKey(randomBytes(16).toString('base64'))).toThrow();
  });

  it('rejects an empty key', () => {
    expect(() => decodeEncryptionKey('')).toThrow();
  });

  it('rejects an obvious placeholder value', () => {
    expect(() => decodeEncryptionKey('change_me_base64_encoded_32_byte_key')).toThrow();
  });

  it('rejects a low-entropy key (repeated byte)', () => {
    expect(() => decodeEncryptionKey(Buffer.alloc(32, 0).toString('base64'))).toThrow();
  });
});

describe('validateEnv', () => {
  it('accepts a well-formed configuration', () => {
    expect(() => validateEnv(baseEnv())).not.toThrow();
  });

  it('fails startup when FINANCIAL_ENCRYPTION_KEY is missing', () => {
    const env = baseEnv();
    delete (env as Record<string, unknown>).FINANCIAL_ENCRYPTION_KEY;
    expect(() => validateEnv(env)).toThrow();
  });

  it('fails startup when FINANCIAL_ENCRYPTION_KEY is the wrong length', () => {
    expect(() =>
      validateEnv(baseEnv({ FINANCIAL_ENCRYPTION_KEY: randomBytes(16).toString('base64') })),
    ).toThrow();
  });

  it('fails startup when JWT secrets are too short', () => {
    expect(() => validateEnv(baseEnv({ JWT_SECRET: 'too-short' }))).toThrow();
  });

  it('fails startup when JWT secrets are identical', () => {
    const secret = randomBytes(32).toString('hex');
    expect(() =>
      validateEnv(baseEnv({ JWT_SECRET: secret, JWT_REFRESH_SECRET: secret })),
    ).toThrow();
  });

  it('fails startup when a required database field is missing', () => {
    const env = baseEnv();
    delete (env as Record<string, unknown>).DATABASE_PASSWORD;
    expect(() => validateEnv(env)).toThrow();
  });
});
