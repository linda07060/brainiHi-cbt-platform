const fs = require('fs');
const path = require('path');

/**
 * Usage:
 *  node scripts/fix-migration-name.js <path-to-migration-file-or-dir>
 *
 * If the argument is a file, it fixes that file.
 * If the argument is a directory, it scans .ts and .js files in that directory and fixes any migration class
 * names that do not already end with digits. Backups (*.bak) are created for every original file.
 */

function fixFile(oldPath) {
  if (!fs.existsSync(oldPath) || !fs.statSync(oldPath).isFile()) {
    console.error('File not found or not a file:', oldPath);
    return false;
  }

  const content = fs.readFileSync(oldPath, 'utf8');

  // find the first export class declaration
  const classMatch = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  if (!classMatch) {
    console.warn('No "export class <Name>" found in:', oldPath);
    return false;
  }

  const oldClass = classMatch[1];
  if (/\d$/.test(oldClass)) {
    console.log(`Skipping ${path.basename(oldPath)} — class "${oldClass}" already ends with a digit.`);
    return false;
  }

  const uniqueSuffix = Date.now().toString() + Math.floor(Math.random() * 9000 + 1000).toString();
  const newClass = oldClass + uniqueSuffix;

  // Replace all word-boundary occurrences of the class name with the new one
  const newContent = content.replace(new RegExp('\\b' + oldClass + '\\b', 'g'), newClass);

  // produce new filename by appending the same unique suffix before extension
  const dir = path.dirname(oldPath);
  const ext = path.extname(oldPath);
  const base = path.basename(oldPath, ext);
  const newBase = base + uniqueSuffix;
  const newPath = path.join(dir, newBase + ext);

  // write backup of original then write new file
  const backupPath = oldPath + '.bak';
  fs.copyFileSync(oldPath, backupPath);
  fs.writeFileSync(newPath, newContent, 'utf8');

  console.log(`Fixed: ${path.basename(oldPath)} -> ${path.basename(newPath)} (class ${oldClass} -> ${newClass}); backup: ${path.basename(backupPath)}`);
  return true;
}

function fixDirectory(dirPath) {
  const absDir = path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error('Directory not found or not a directory:', absDir);
    process.exit(1);
  }

  const files = fs.readdirSync(absDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  if (files.length === 0) {
    console.log('No .ts or .js files found in', absDir);
    return 0;
  }

  let fixed = 0;
  for (const f of files) {
    const p = path.join(absDir, f);
    if (fixFile(p)) fixed++;
  }

  return fixed;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/fix-migration-name.js <path-to-migration-file-or-dir>');
    process.exit(1);
  }

  const target = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  if (!fs.existsSync(target)) {
    console.error('Path not found:', target);
    process.exit(1);
  }

  const stat = fs.statSync(target);
  if (stat.isFile()) {
    const ok = fixFile(target);
    if (!ok) process.exit(1);
    process.exit(0);
  } else if (stat.isDirectory()) {
    const count = fixDirectory(target);
    console.log(`Done. Files fixed: ${count}. Keep .bak files until you confirm migrations run successfully.`);
    process.exit(0);
  } else {
    console.error('Unsupported path type:', target);
    process.exit(1);
  }
}

main();