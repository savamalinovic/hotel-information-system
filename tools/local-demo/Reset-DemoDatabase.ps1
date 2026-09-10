[CmdletBinding()]
param(
    [string]$DatabaseName = 'bluestars_demo',
    [switch]$Reset,
    [string]$PostgresHost = 'localhost',
    [ValidateRange(1, 65535)][int]$PostgresPort = 5432,
    [string]$PostgresUser,
    [string]$PostgresPassword
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

try {
    Assert-LocalDemoHost -HostName $PostgresHost
    $DatabaseName = Assert-LocalDemoDatabaseName -DatabaseName $DatabaseName
    $PostgresUser = Get-LocalDemoValue -Value $PostgresUser -EnvironmentName 'POSTGRES_USER' -Label 'PostgreSQL user'
    $PostgresPassword = Get-LocalDemoValue -Value $PostgresPassword -EnvironmentName 'POSTGRES_PASSWORD' -Label 'PostgreSQL password'

    $psql = Get-Command psql -ErrorAction Stop
    $previousPassword = $env:PGPASSWORD
    $env:PGPASSWORD = $PostgresPassword
    try {
        $baseArgs = @('-X', '-v', 'ON_ERROR_STOP=1', '-h', $PostgresHost, '-p', "$PostgresPort", '-U', $PostgresUser, '-d', 'postgres')
        $exists = & $psql.Source @baseArgs '-tAc' "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
        if ($LASTEXITCODE -ne 0) { throw 'Could not query PostgreSQL database catalog.' }

        if ($exists) {
            if (-not $Reset) {
                Write-Host "Demo database already exists and was not changed: server=$PostgresHost port=$PostgresPort database=$DatabaseName"
                exit 0
            }
            Write-Host "Resetting local demo database: server=$PostgresHost port=$PostgresPort database=$DatabaseName"
            & $psql.Source @baseArgs '-c' "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DatabaseName' AND pid <> pg_backend_pid();"
            if ($LASTEXITCODE -ne 0) { throw 'Could not close existing demo database connections.' }
            & $psql.Source @baseArgs '-c' "DROP DATABASE `"$DatabaseName`";"
            if ($LASTEXITCODE -ne 0) { throw 'Could not drop the demo database.' }
        } else {
            Write-Host "Creating local demo database: server=$PostgresHost port=$PostgresPort database=$DatabaseName"
        }

        & $psql.Source @baseArgs '-c' "CREATE DATABASE `"$DatabaseName`";"
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the demo database.' }
        Write-Host "Created empty demo database '$DatabaseName'. Start-DemoBackend.ps1 will apply Flyway migrations."
    } finally {
        $env:PGPASSWORD = $previousPassword
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
