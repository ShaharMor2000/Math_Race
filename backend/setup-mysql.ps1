# Interactive MySQL setup for Math Race backend (Windows)
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$schema = Join-Path $PSScriptRoot '..\docs\db-schema.sql'
$localConfig = Join-Path $PSScriptRoot 'src\main\resources\application-local.yml'

if (-not (Test-Path $mysql)) {
    Write-Error "MySQL client not found at: $mysql"
    exit 1
}

Write-Host 'Math Race - MySQL setup'
Write-Host 'Enter your MySQL root password (the one you chose during MySQL installation):'
$password = Read-Host -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

$testArgs = @('-u', 'root', "-p$plain", '-e', 'SELECT 1;')
& $mysql @testArgs 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Connection failed. Check username/password and that MySQL80 service is running.'
    exit 1
}

Write-Host 'Connected. Creating database and tables...'
& $mysql -u root "-p$plain" < $schema
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Schema import failed.'
    exit 1
}

@(
    'spring:',
    '  datasource:',
    '    username: root',
    "    password: $plain"
) | Set-Content -Path $localConfig -Encoding UTF8

Write-Host "Saved $localConfig"
Write-Host 'Done. Run: .\mvnw.cmd spring-boot:run'
