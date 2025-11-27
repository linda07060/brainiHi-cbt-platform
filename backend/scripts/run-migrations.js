const path = require('path');

function safeRequire(candidate) {
  try {
    return require(candidate);
  } catch (err) {
    // try with .js suffix if candidate is a path without extension
    try {
      return require(candidate + '.js');
    } catch (_) {
      return null;
    }
  }
}

async function loadAppDataSource() {
  const candidates = [
    path.join(process.cwd(), 'dist', 'src', 'data-source'),
    path.join(process.cwd(), 'dist', 'data-source'),
    path.join(process.cwd(), 'src', 'data-source'),
    path.join(process.cwd(), 'data-source'),
    path.join(process.cwd(), 'src', 'datasource'),
    path.join(process.cwd(), 'datasource'),
  ];

  for (const c of candidates) {
    try {
      const mod = safeRequire(c);
      if (mod && (mod.AppDataSource || mod.default)) {
        console.log('Using DataSource export from:', c);
        return mod.AppDataSource || mod.default;
      }
    } catch (err) {
      // ignore and continue
    }
  }
  return null;
}

function printDbInfo(databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    const host = u.hostname;
    const port = u.port || '(default)';
    const db = (u.pathname || '').replace(/^\//, '');
    console.log(`TypeORM target DB host: ${host}  port: ${port}  database: ${db}`);
  } catch (err) {
    // ignore parse errors
  }
}

(async function run(){
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in the environment. Aborting.');
    process.exit(1);
  }

  printDbInfo(DATABASE_URL);

  let AppDataSource = await loadAppDataSource();

  if (!AppDataSource) {
    console.warn('No exported AppDataSource found. Creating a temporary DataSource from DATABASE_URL.');
    const { DataSource } = require('typeorm');
    AppDataSource = new DataSource({
      type: 'postgres',
      url: DATABASE_URL,
      // look in both singular "migration" and plural "migrations", dist and src, ts and js
      migrations: [
        process.env.NODE_ENV === 'production' ? 'dist/migration/*.js' : 'src/migration/*.js',
        process.env.NODE_ENV === 'production' ? 'dist/migrations/*.js' : 'src/migrations/*.js',
        'src/migration/*.ts',
        'src/migrations/*.ts'
      ],
      synchronize: false,
      logging: false,
    });
  }

  try {
    console.log('Initializing DataSource...');
    await AppDataSource.initialize();
    console.log('Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();
    console.log(`Migrations applied: ${migrations.length}`);
    await AppDataSource.destroy();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    try { if (AppDataSource && AppDataSource.isInitialized) await AppDataSource.destroy(); } catch (_) {}
    process.exit(1);
  }
})();