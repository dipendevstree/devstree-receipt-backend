export interface AppConfig {
  env: string;
  isProduction: boolean;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
  logging: boolean;
}

export interface AuthConfig {
  /** Absolute maximum lifetime of a login session, from the original sign-in. */
  sessionTimeoutMinutes: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface FinancialConfig {
  encryptionKey: string;
  keyVersion: number;
  previousKeys: string;
  unlockMinutes: number;
  maxUnlockAttempts: number;
  lockoutMinutes: number;
}

export interface BusinessConfig {
  allowOverpayment: boolean;
  currency: string;
  currencyPrecision: number;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
  loginLimit: number;
  loginTtl: number;
}

export interface SeedAdminConfig {
  name: string;
  email: string;
  phone: string;
  password?: string;
  accountPassword?: string;
  role: string;
}

export interface SeedConfig {
  admins: SeedAdminConfig[];
}

export interface RootConfig {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  financial: FinancialConfig;
  business: BusinessConfig;
  throttle: ThrottleConfig;
  seed: SeedConfig;
}

const bool = (value: unknown, fallback = false): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const int = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default (): RootConfig => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    isProduction: process.env.NODE_ENV === 'production',
    port: int(process.env.BACKEND_PORT, 5001),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    host: process.env.DATABASE_HOST as string,
    port: int(process.env.DATABASE_PORT, 5432),
    name: process.env.DATABASE_NAME as string,
    user: process.env.DATABASE_USER as string,
    password: process.env.DATABASE_PASSWORD as string,
    ssl: bool(process.env.DATABASE_SSL),
    logging: bool(process.env.DATABASE_LOGGING),
  },
  auth: {
    sessionTimeoutMinutes: int(process.env.AUTH_SESSION_TIMEOUT_MINUTES, 540),
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
    // Short-lived by design; the interceptor refreshes it silently. The session
    // boundary is AUTH_SESSION_TIMEOUT_MINUTES, not this value.
    expiresIn: process.env.JWT_EXPIRES_IN ?? '60m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  financial: {
    encryptionKey: process.env.FINANCIAL_ENCRYPTION_KEY as string,
    keyVersion: int(process.env.FINANCIAL_ENCRYPTION_KEY_VERSION, 1),
    previousKeys: process.env.FINANCIAL_ENCRYPTION_PREVIOUS_KEYS ?? '',
    unlockMinutes: int(process.env.FINANCIAL_UNLOCK_MINUTES, 15),
    maxUnlockAttempts: int(process.env.FINANCIAL_UNLOCK_MAX_ATTEMPTS, 5),
    lockoutMinutes: int(process.env.FINANCIAL_UNLOCK_LOCKOUT_MINUTES, 15),
  },
  business: {
    allowOverpayment: bool(process.env.ALLOW_OVERPAYMENT),
    currency: process.env.DEFAULT_CURRENCY ?? 'INR',
    currencyPrecision: int(process.env.DEFAULT_CURRENCY_PRECISION, 2),
  },
  throttle: {
    ttl: int(process.env.THROTTLE_TTL, 60),
    limit: int(process.env.THROTTLE_LIMIT, 100),
    loginLimit: int(process.env.LOGIN_THROTTLE_LIMIT, 5),
    loginTtl: int(process.env.LOGIN_THROTTLE_TTL, 300),
  },
  seed: {
    // Two administrators are seeded so multi-admin action tracking is exercisable.
    admins: [
      {
        name: process.env.SEED_ADMIN_NAME ?? 'System Administrator',
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@devstree.local',
        phone: process.env.SEED_ADMIN_PHONE ?? '9000000001',
        password: process.env.SEED_ADMIN_PASSWORD,
        accountPassword: process.env.SEED_ADMIN_ACCOUNT_PASSWORD,
        role: 'SUPER_ADMIN',
      },
      {
        name: process.env.SEED_FINANCE_ADMIN_NAME ?? 'Finance Administrator',
        email: process.env.SEED_FINANCE_ADMIN_EMAIL ?? 'finance@devstree.local',
        phone: process.env.SEED_FINANCE_ADMIN_PHONE ?? '9000000002',
        password: process.env.SEED_FINANCE_ADMIN_PASSWORD,
        accountPassword: process.env.SEED_FINANCE_ADMIN_ACCOUNT_PASSWORD,
        role: 'ADMIN',
      },
    ],
  },
});
