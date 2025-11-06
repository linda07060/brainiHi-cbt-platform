// fix-normalize-user-plans.js
// Usage: node src/migration/fix-normalize-user-plans.js
// Finds a migration file containing "NormalizeUserPlans", backs it up, renames it
// to <timestamp>-NormalizeUserPlans.ts and updates the class name and name property.

const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const migDir = path.join(__dirname);
    if (!fs.existsSync(migDir)) {
      console.error('Migration directory not found:', migDir);
      process.exit(1);
    }

    // Find candidate files by filename first
    let files = fs.readdirSync(migDir).filter(f => /NormalizeUserPlans.*\.ts$/i.test(f));
    // If none, search contents for a class declaration
    if (files.length === 0) {
      files = fs.readdirSync(migDir).filter(f => {
        if (!f.endsWith('.ts')) return false;
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return /class\s+NormalizeUserPlans/i.test(content);
      });
    }

    if (files.length === 0) {
      console.error('No migration file matching *NormalizeUserPlans*.ts or containing class NormalizeUserPlans found in', migDir);
      process.exit(1);
    }

    // Use the first match (inspect manually if there are multiple)
    const oldName = files[0];
    const oldPath = path.join(migDir, oldName);
    const ts = Date.now().toString();
    const newName = `${ts}-NormalizeUserPlans.ts`;
    const newPath = path.join(migDir, newName);
    const bakPath = oldPath + '.bak';

    // Backup original
    fs.copyFileSync(oldPath, bakPath);
    console.log('Backed up original to', bakPath);

    // Read and patch content
    let content = fs.readFileSync(oldPath, 'utf8');

    // Update class name (e.g. class NormalizeUserPlans20251103 -> class NormalizeUserPlans<ts>)
    content = content.replace(/class\s+NormalizeUserPlans[^\s{]*/g, `class NormalizeUserPlans${ts}`);

    // Update optional name = '...' property if present
    content = content.replace(/name\s*=\s*'[^']*'/g, `name = 'NormalizeUserPlans${ts}'`);

    // Write new file
    fs.writeFileSync(newPath, content, 'utf8');
    console.log('Wrote patched migration:', newName);

    // Remove original file (we have a .bak copy)
    fs.unlinkSync(oldPath);
    console.log('Removed old migration file:', oldName);

    console.log('Done. Please inspect the backup and new file before running migrations.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();