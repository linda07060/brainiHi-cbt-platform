const fs = require('fs');
const path = require('path');

if (!process.argv[2]) {
  console.error('Usage: node auto-fix-migrations.js <path-to-migration-directory>');
  process.exit(1);
}

const migrationsDir = process.argv[2];

// normalize and validate
const absDir = path.isAbsolute(migrationsDir) ? migrationsDir : path.join(process.cwd(), migrationsDir);
if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
  console.error('Directory not found or not a directory:', absDir);
  process.exit(1);
}

const files = fs.readdirSync(absDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
if (files.length === 0) {
  console.log('No .ts or .js files found in', absDir);
  process.exit(0);
}

let fixedCount = 0;
const tsNow = Date.now().toString();

for (const file of files) {
  const filePath = path.join(absDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // find export class NAME
  const match = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  if (!match) {
    // no class found — skip
    continue;
  }

  const className = match[1];
  if (/\d$/.test(className)) {
    // already ends with digit — skip
    continue;
  }

  // create new unique suffix per file using timestamp + counter to avoid collisions
  const uniqueSuffix = tsNow + Math.floor(Math.random() * 9000 + 1000).toString();
  const newClass = className + uniqueSuffix;

  // replace all word-boundary occurrences of the class name
  const newContent = content.replace(new RegExp('\\b' + className + '\\b', 'g'), newClass);

  // create new filename with suffix before extension
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const newBase = base + uniqueSuffix;
  const newFileName = newBase + ext;
  const newFilePath = path.join(absDir, newFileName);

  // backup original
  const backupPath = filePath + '.bak';
  fs.copyFileSync(filePath, backupPath);

  // write new file
  fs.writeFileSync(newFilePath, newContent, 'utf8');

  console.log(`Fixed: ${file} -> ${newFileName} (class ${className} -> ${newClass}); backup:${path.basename(backupPath)}`);
  fixedCount++;
}

console.log(`Done. Files fixed: ${fixedCount}. Keep .bak files until you confirm migrations run successfully.`);
process.exit(0);