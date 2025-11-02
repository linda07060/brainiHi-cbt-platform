import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

// DB config from environment (or .env)
const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const username = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASS || 'pgdev10';
const database = process.env.DB_NAME || 'cbt_platform';

// Use env var to control synchronize (default false). Only enable temporarily for local dev.
const sync = process.env.TYPEORM_SYNCHRONIZE === 'true';

// Detect whether running TS (development) or JS (production build)
const isTs = process.env.NODE_ENV !== 'production';

// Create a single DataSource instance and export it as the default export
const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  synchronize: sync,
  logging: false,
  entities: [__dirname + '/**/*.entity' + (isTs ? '.ts' : '.js')],
  migrations: [__dirname + '/migration/*' + (isTs ? '.ts' : '.js')],
  subscribers: [],
});

export default AppDataSource;