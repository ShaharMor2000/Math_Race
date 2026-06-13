$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendEnv = Join-Path $root "frontend\.env"
$backendLocal = Join-Path $root "backend\src\main\resources\application-local.yml"

Write-Host ""
Write-Host "=== Math Race — Google Login Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Before running this script, create an OAuth Client ID in Google Cloud:"
Write-Host "  1. https://console.cloud.google.com/apis/credentials"
Write-Host "  2. Create project (or pick existing)"
Write-Host "  3. OAuth consent screen -> External -> App name: Math Race"
Write-Host "  4. Credentials -> Create -> OAuth client ID -> Web application"
Write-Host "  5. Authorized JavaScript origins:"
Write-Host "       http://localhost:5173"
Write-Host "       http://localhost:5174"
Write-Host "  6. Copy the Client ID (ends with .apps.googleusercontent.com)"
Write-Host ""

$clientId = Read-Host "Paste your Google Client ID"
$clientId = $clientId.Trim()
if (-not $clientId) { throw "Client ID is required." }
if ($clientId -notmatch '\.apps\.googleusercontent\.com$') {
  Write-Host "Warning: Client ID usually ends with .apps.googleusercontent.com" -ForegroundColor Yellow
}

$envContent = @"
VITE_GOOGLE_CLIENT_ID=$clientId
VITE_API_BASE=http://localhost:8080/api/v1
"@
Set-Content -Path $frontendEnv -Value $envContent -Encoding utf8
Write-Host "Created frontend/.env" -ForegroundColor Green

if (Test-Path $backendLocal) {
  $local = Get-Content $backendLocal -Raw
  if ($local -match 'google-client-id:\s*(\S+)') {
    $local = $local -replace 'google-client-id:\s*\S+', "google-client-id: $clientId"
  } else {
    $local = $local.TrimEnd() + "`n`napp:`n  auth:`n    google-client-id: $clientId`n"
  }
  Set-Content -Path $backendLocal -Value $local -Encoding utf8
} else {
  @"
spring:
  datasource:
    username: root
    password: your-mysql-password-here

app:
  auth:
    google-client-id: $clientId
"@ | Set-Content -Path $backendLocal -Encoding utf8
}

Write-Host "Updated backend application-local.yml" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart backend:  cd backend; .\mvnw.cmd spring-boot:run"
Write-Host "  2. Restart frontend: cd frontend; npm run dev"
Write-Host "  3. Open http://localhost:5173 -> Teacher -> Sign in with Google"
Write-Host ""
