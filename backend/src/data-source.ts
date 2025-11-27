import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as url from 'url';

dotenv.config();

const isProdUrl = !!process.env.DATABASE_URL;

// defaults for local development
let host = process.env.DB_HOST || 'localhost';
let port = parseInt(process.env.DB_PORT || '5432', 10);
let username = process.env.DB_USER || 'postgres';
let password = process.env.DB_PASS || 'pgdev10';
let database = process.env.DB_NAME || 'cbt_platform';
let connectionUrl: string | undefined = undefined;

// Prefer a full DATABASE_URL when present (production)
if (isProdUrl && process.env.DATABASE_URL) {
  connectionUrl = process.env.DATABASE_URL;
  try {
    const parsed = new url.URL(process.env.DATABASE_URL);
    host = parsed.hostname;
    port = parseInt(parsed.port || '5432', 10);
    username = parsed.username;
    database = (parsed.pathname || '').replace('/', '') || database;
    // do NOT log or assign parsed.password here for security
  } catch (err) {
    // parsing error is non-fatal — DataSource will still use the url property
  }
} else {
  // use individual DB_* env vars for local development
  host = process.env.DB_HOST || host;
  port = parseInt(process.env.DB_PORT || String(port), 10);
  username = process.env.DB_USER || username;
  password = process.env.DB_PASS || password;
  database = process.env.DB_NAME || database;
}

// Use env var to control synchronize (default false). Only enable temporarily for local dev.
const sync = process.env.TYPEORM_SYNCHRONIZE === 'true';

// Detect whether running TS (development) or JS (production build)
const isTs = process.env.NODE_ENV !== 'production';

// Create DataSource for application runtime.
// Note: This file exports a named AppDataSource (used by the app) and a default export for compatibility.
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(connectionUrl
    ? { url: connectionUrl }
    : {
        host,
        port,
        username,
        password,
        database,
      }),
  synchronize: sync,
  logging: false,
  entities: [__dirname + '/**/*.entity' + (isTs ? '.ts' : '.js')],
  migrations: [__dirname + '/migration/*' + (isTs ? '.ts' : '.js')],
  subscribers: [],
});

// Lightweight log so you can confirm where the app is targeting (no secrets printed)
console.log('TypeORM target DB host:', host, ' database:', database);

export default AppDataSource;