"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bool = (value, fallback = false) => {
    if (value === undefined || value === '')
        return fallback;
    return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};
const int = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
exports.default = () => ({
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
        host: process.env.DATABASE_HOST,
        port: int(process.env.DATABASE_PORT, 5432),
        name: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        ssl: bool(process.env.DATABASE_SSL),
        logging: bool(process.env.DATABASE_LOGGING),
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    financial: {
        encryptionKey: process.env.FINANCIAL_ENCRYPTION_KEY,
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
//# sourceMappingURL=configuration.js.map