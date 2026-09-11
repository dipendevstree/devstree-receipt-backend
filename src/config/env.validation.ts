import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  development = 'development',
  test = 'test',
  production = 'production',
}

const AES_256_KEY_BYTES = 32;

/** Values that must never survive into a running instance. */
const FORBIDDEN_SECRET_FRAGMENTS = ['change_me', 'changeme', 'secret', 'password', 'example'];

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  @Min(1)
  @Max(65535)
  BACKEND_PORT = 5001;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = 'http://localhost:5000';

  // ── Database ───────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @IsInt()
  DATABASE_PORT = 5432;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD!: string;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL = false;

  @IsBoolean()
  @IsOptional()
  DATABASE_LOGGING = false;

  // ── JWT ────────────────────────────────────────────────────
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  /** Absolute login-session lifetime. Distinct from FINANCIAL_UNLOCK_MINUTES. */
  @IsInt()
  @Min(1)
  @IsOptional()
  AUTH_SESSION_TIMEOUT_MINUTES = 540;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '60m';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  // ── Financial encryption ───────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'FINANCIAL_ENCRYPTION_KEY is required' })
  FINANCIAL_ENCRYPTION_KEY!: string;

  @IsInt()
  @Min(1)
  FINANCIAL_ENCRYPTION_KEY_VERSION = 1;

  @IsString()
  @IsOptional()
  FINANCIAL_ENCRYPTION_PREVIOUS_KEYS = '';

  @IsInt()
  @Min(1)
  @Max(240)
  FINANCIAL_UNLOCK_MINUTES = 15;

  @IsInt()
  @Min(1)
  FINANCIAL_UNLOCK_MAX_ATTEMPTS = 5;

  @IsInt()
  @Min(1)
  FINANCIAL_UNLOCK_LOCKOUT_MINUTES = 15;

  // ── Throttling ─────────────────────────────────────────────
  @IsInt()
  THROTTLE_TTL = 60;

  @IsInt()
  THROTTLE_LIMIT = 100;

  @IsInt()
  LOGIN_THROTTLE_LIMIT = 5;

  @IsInt()
  LOGIN_THROTTLE_TTL = 300;

  // ── Business rules ─────────────────────────────────────────
  @IsBoolean()
  @IsOptional()
  ALLOW_OVERPAYMENT = false;

  @IsString()
  @IsOptional()
  DEFAULT_CURRENCY = 'INR';

  @IsInt()
  @Min(0)
  @Max(6)
  DEFAULT_CURRENCY_PRECISION = 2;

  // ── Seed (development convenience) ─────────────────────────
  @IsString()
  @IsOptional()
  SEED_ADMIN_NAME = 'System Administrator';

  @IsString()
  @IsOptional()
  SEED_ADMIN_EMAIL = 'admin@devstree.local';

  @IsString()
  @IsOptional()
  SEED_ADMIN_PHONE = '9000000001';

  @IsString()
  @IsOptional()
  SEED_ADMIN_PASSWORD?: string;

  @IsString()
  @IsOptional()
  SEED_ADMIN_ACCOUNT_PASSWORD?: string;

  @IsString()
  @IsOptional()
  SEED_FINANCE_ADMIN_NAME = 'Finance Administrator';

  @IsString()
  @IsOptional()
  SEED_FINANCE_ADMIN_EMAIL = 'finance@devstree.local';

  @IsString()
  @IsOptional()
  SEED_FINANCE_ADMIN_PHONE = '9000000002';

  @IsString()
  @IsOptional()
  SEED_FINANCE_ADMIN_PASSWORD?: string;

  @IsString()
  @IsOptional()
  SEED_FINANCE_ADMIN_ACCOUNT_PASSWORD?: string;
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

function coerce(raw: Record<string, unknown>): Record<string, unknown> {
  const numericKeys = [
    'BACKEND_PORT',
    'AUTH_SESSION_TIMEOUT_MINUTES',
    'DATABASE_PORT',
    'FINANCIAL_ENCRYPTION_KEY_VERSION',
    'FINANCIAL_UNLOCK_MINUTES',
    'FINANCIAL_UNLOCK_MAX_ATTEMPTS',
    'FINANCIAL_UNLOCK_LOCKOUT_MINUTES',
    'THROTTLE_TTL',
    'THROTTLE_LIMIT',
    'LOGIN_THROTTLE_LIMIT',
    'LOGIN_THROTTLE_TTL',
    'DEFAULT_CURRENCY_PRECISION',
  ];
  const booleanKeys = ['DATABASE_SSL', 'DATABASE_LOGGING', 'ALLOW_OVERPAYMENT'];

  const out: Record<string, unknown> = { ...raw };
  for (const key of numericKeys) {
    if (out[key] !== undefined && out[key] !== '') out[key] = Number(out[key]);
    else delete out[key];
  }
  for (const key of booleanKeys) {
    const value = String(out[key] ?? '').toLowerCase();
    if (TRUE_VALUES.has(value)) out[key] = true;
    else if (FALSE_VALUES.has(value)) out[key] = false;
    else delete out[key];
  }
  for (const key of Object.keys(out)) {
    if (out[key] === '') delete out[key];
  }
  return out;
}

/**
 * Decodes an AES key from base64 or hex and asserts it is exactly 32 bytes.
 * Throws with a message that never contains the key material itself.
 */
export function decodeEncryptionKey(raw: string, label = 'FINANCIAL_ENCRYPTION_KEY'): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error(`${label} is not set.`);

  const lowered = trimmed.toLowerCase();
  if (FORBIDDEN_SECRET_FRAGMENTS.some((fragment) => lowered.includes(fragment))) {
    throw new Error(
      `${label} still contains a placeholder value. Generate one with: openssl rand -base64 32`,
    );
  }

  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    key = Buffer.from(trimmed, 'hex');
  } else {
    key = Buffer.from(trimmed, 'base64');
    // Buffer.from silently drops invalid base64 characters; re-encoding detects that.
    if (key.toString('base64').replace(/=+$/, '') !== trimmed.replace(/=+$/, '')) {
      throw new Error(`${label} is not valid base64 or 64-character hex.`);
    }
  }

  if (key.length !== AES_256_KEY_BYTES) {
    throw new Error(
      `${label} must decode to exactly ${AES_256_KEY_BYTES} bytes for AES-256-GCM (got ${key.length}).`,
    );
  }

  const distinctBytes = new Set(key).size;
  if (distinctBytes < 8) {
    throw new Error(`${label} has insufficient entropy and was rejected.`);
  }

  return key;
}

function assertSecretStrength(name: string, value: string, nodeEnv: NodeEnv): void {
  const lowered = value.toLowerCase();
  if (
    nodeEnv === NodeEnv.production &&
    FORBIDDEN_SECRET_FRAGMENTS.some((f) => lowered.includes(f))
  ) {
    throw new Error(`${name} contains a placeholder value and cannot be used in production.`);
  }
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, coerce(config), {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false, whitelist: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  // Fail fast on an unusable encryption key — never start with a silently generated one.
  decodeEncryptionKey(validated.FINANCIAL_ENCRYPTION_KEY);

  assertSecretStrength('JWT_SECRET', validated.JWT_SECRET, validated.NODE_ENV);
  assertSecretStrength('JWT_REFRESH_SECRET', validated.JWT_REFRESH_SECRET, validated.NODE_ENV);
  if (validated.JWT_SECRET === validated.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
  }

  if (validated.NODE_ENV === NodeEnv.production && validated.SEED_ADMIN_PASSWORD) {
    // Seeds must not carry production credentials in the environment.
    assertSecretStrength('SEED_ADMIN_PASSWORD', validated.SEED_ADMIN_PASSWORD, validated.NODE_ENV);
  }

  return validated;
}

export type { EnvironmentVariables };
