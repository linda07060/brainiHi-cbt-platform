# normalize-plans.ps1
# One-time script: backup DB and normalize user.plan values to 'Free'|'Pro'|'Tutor'
# USAGE:
# 1) Open PowerShell and set $env:DATABASE_URL and (optionally) $env:PGPASSWORD in the session.
#    Example:
#      $env:DATABASE_URL = 'postgres://user:pass@host:5432/dbname'
#      $env:PGPASSWORD = 'pass'            # optional - if omitted psql/pg_dump will prompt for password
# 2) Run: .\normalize-plans.ps1

Write-Output "Starting normalization script..."
if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL environment variable is not set in this PowerShell session. Set it and re-run the script."
  exit 1
}

$backupFile = Join-Path (Get-Location) 'backup-before-normalize.dump'
Write-Output "Creating compressed backup: $backupFile"
pg_dump -Fc -f $backupFile $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) {
  Write-Error "pg_dump failed with exit code $LASTEXITCODE. Aborting."
  exit $LASTEXITCODE
}

Write-Output "Running plan normalization UPDATE (mapping variants to 'Free'/'Pro'/'Tutor')..."
$update1 = @"
UPDATE "user"
SET plan = (
  CASE
    WHEN lower(trim(plan)) LIKE '%tutor%' THEN 'Tutor'
    WHEN lower(trim(plan)) LIKE '%pro%' THEN 'Pro'
    WHEN lower(trim(plan)) IN ('pro','professional','standard','paid') THEN 'Pro'
    WHEN lower(trim(plan)) IN ('tutor','tutorplan','mentor') THEN 'Tutor'
    ELSE 'Free'
  END
)
WHERE plan IS NOT NULL;
"@

psql $env:DATABASE_URL -c $update1
if ($LASTEXITCODE -ne 0) {
  Write-Error "First UPDATE failed with exit code $LASTEXITCODE. Aborting."
  exit $LASTEXITCODE
}

Write-Output "Replacing NULL or empty plan values with 'Free'..."
$update2 = "UPDATE ""user"" SET plan = 'Free' WHERE plan IS NULL OR trim(plan) = '';"
psql $env:DATABASE_URL -c $update2
if ($LASTEXITCODE -ne 0) {
  Write-Error "Second UPDATE failed with exit code $LASTEXITCODE. Aborting."
  exit $LASTEXITCODE
}

Write-Output "Verification: counts by plan"
psql $env:DATABASE_URL -c "SELECT plan, COUNT(*) AS cnt FROM ""user"" GROUP BY plan ORDER BY cnt DESC;"

Write-Output "Normalization completed. Backup file: $backupFile"