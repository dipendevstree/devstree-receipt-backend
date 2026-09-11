"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceOptions = void 0;
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const typeorm_1 = require("typeorm");
(0, dotenv_1.config)({ path: (0, path_1.join)(__dirname, '..', '..', '..', '.env') });
(0, dotenv_1.config)();
exports.dataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    database: process.env.DATABASE_NAME ?? 'devstree_receipt',
    username: process.env.DATABASE_USER ?? 'devstree',
    password: process.env.DATABASE_PASSWORD ?? '',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: process.env.DATABASE_LOGGING === 'true',
    entities: [(0, path_1.join)(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [(0, path_1.join)(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
};
exports.default = new typeorm_1.DataSource(exports.dataSourceOptions);
//# sourceMappingURL=data-source.js.map