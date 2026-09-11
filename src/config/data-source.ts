import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load the repository-root .env when running the TypeORM CLI outside Nest.
loadEnv({ path: join(__dirname, '..', '..', '..', '.env') });
loadEnv();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  database: process.env.DATABASE_NAME ?? 'devstree_receipt',
  username: process.env.DATABASE_USER ?? 'devstree',
  password: process.env.DATABASE_PASSWORD ?? '',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Migrations are the only way schema changes reach any environment.
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
};

export default new DataSource(dataSourceOptions);
