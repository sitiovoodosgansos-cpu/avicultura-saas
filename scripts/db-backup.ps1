param(
  [string]$OutputDir = "backups"
)

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL não definida."
  exit 1
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error "pg_dump não encontrado. Instale PostgreSQL client tools."
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutputDir "backup-$timestamp.sql"

pg_dump --dbname="$env:DATABASE_URL" --no-owner --no-privileges --file="$file"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha ao gerar backup"
  exit $LASTEXITCODE
}

Write-Output "Backup criado: $file"
