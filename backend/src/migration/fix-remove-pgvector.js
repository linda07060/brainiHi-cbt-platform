// fix-remove-pgvector.js
// Run: node src/migration/fix-remove-pgvector.js
// - Makes .bak backups for any modified file.
// - Removes CREATE EXTENSION ... vector; lines.
// - Replaces vector(...) column types with jsonb (embedding jsonb fallback).
// - Removes ivfflat/usages and vector operator index bits when found.
// Review backups before running migrations.

const fs = require('fs');
const path = require('path');

const migDir = path.join(__dirname);
if (!fs.existsSync(migDir)) {
  console.error('Migration directory not found:', migDir);
  process.exit(1);
}

const files = fs.readdirSync(migDir).filter(f => f.endsWith('.ts'));
if (files.length === 0) {
  console.log('No .ts migration files found in', migDir);
  process.exit(0);
}

let changed = 0;
for (const f of files) {
  const full = path.join(migDir, f);
  let content = fs.readFileSync(full, 'utf8');
  const original = content;

  // 1) Remove CREATE EXTENSION ... vector; (case-insensitive)
  content = content.replace(/CREATE\s+EXTENSION[\s\S]*?vector[\s\S]*?;?/ig, '');

  // 2) Replace vector(<number>) types with jsonb (simple fallback for embedding column)
  //    e.g. embedding vector(1536) -> embedding jsonb
  content = content.replace(/\b([\w"]+)\s+vector\s*\(\s*\d+\s*\)/ig, (m, colName) => {
    return `${colName} jsonb`;
  });

  // 3) Replace any bare "vector" declarations (e.g. COLUMN vector) -> jsonb
  content = content.replace(/\b([\w"]+)\s+vector\b/ig, (m, colName) => {
    return `${colName} jsonb`;
  });

  // 4) Remove index creation lines that use ivfflat / vector ops (remove whole CREATE INDEX line)
  content = content.replace(/CREATE\s+INDEX[\s\S]*?USING\s+ivfflat[\s\S]*?;?/ig, '');
  content = content.replace(/vector_l2_ops/ig, '');
  content = content.replace(/vector_cosine_ops/ig, '');

  // 5) Remove leftover WITH (lists = ...) fragments (if isolated)
  content = content.replace(/WITH\s*\(\s*lists\s*=\s*\d+\s*\)\s*;?/ig, '');

  // 6) Trim multiple blank lines introduced by removals
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    // backup
    const bak = full + '.bak';
    fs.copyFileSync(full, bak);
    fs.writeFileSync(full, content, 'utf8');
    console.log('Patched and backed up:', f, '->', path.basename(bak));
    changed++;
  }
}

console.log(`Done. ${changed} file(s) modified. Backups (*.bak) saved next to originals.`);
if (changed === 0) console.log('No changes needed.');