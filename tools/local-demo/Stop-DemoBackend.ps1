[CmdletBinding()]
param(
    [switch]$Force,
    [ValidateRange(1, 65535)][int]$ServerPort = 8080,
    [switch]$RemoveAdbReverse,
    [string]$DeviceSerial,
    [switch]$DropDatabase,
    [string]$DatabaseName = 'bluestars_demo',
    [string]$PostgresHost = 'localhost',
    [ValidateRange(1, 65535)][int]$PostgresPort = 5432,
    [string]$PostgresUser,
    [string]$PostgresPassword,
    [string]$PsqlPath
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

try {
    if (-not $Force) { throw 'Refusing to stop a process without -Force.' }
    if (-not (Stop-LocalDemoOwnedProcess -ServerPort $ServerPort)) { throw 'No recognized current backend state with a recorded port is available.' }
    Write-Host "Stopped the recorded local demo backend process tree for verified port $ServerPort."
    if ($RemoveAdbReverse) {
        if ($ServerPort -ne 8080) { throw 'ADB reverse cleanup is only supported for the Android demo port 8080.' }
        $adb = Get-Command adb -ErrorAction Stop
        $args = @()
        if (-not [string]::IsNullOrWhiteSpace($DeviceSerial)) { $args += @('-s', $DeviceSerial) }
        & $adb.Source @args reverse --remove tcp:8080
        if ($LASTEXITCODE -ne 0) { throw 'Could not remove adb reverse tcp:8080.' }
        Write-Host 'Removed adb reverse tcp:8080.'
    }
    if ($DropDatabase) {
        Assert-LocalDemoHost -HostName $PostgresHost
        $DatabaseName = Assert-LocalDemoDatabaseName -DatabaseName $DatabaseName
        $PostgresUser = Get-LocalDemoValue -Value $PostgresUser -EnvironmentName 'POSTGRES_USER' -Label 'PostgreSQL user'
        $PostgresPassword = Get-LocalDemoValue -Value $PostgresPassword -EnvironmentName 'POSTGRES_PASSWORD' -Label 'PostgreSQL password'
        $psql = Resolve-LocalDemoPsql -PsqlPath $PsqlPath
        $previousPassword = $env:PGPASSWORD; $env:PGPASSWORD = $PostgresPassword
        try {
            $args = @('-X', '-v', 'ON_ERROR_STOP=1', '-h', $PostgresHost, '-p', "$PostgresPort", '-U', $PostgresUser, '-d', 'postgres')
            & $psql @args '-c' "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DatabaseName' AND pid <> pg_backend_pid();"
            if ($LASTEXITCODE -ne 0) { throw 'Could not close demo database connections.' }
            & $psql @args '-c' "DROP DATABASE IF EXISTS `"$DatabaseName`";"
            if ($LASTEXITCODE -ne 0) { throw 'Could not drop the local demo database.' }
            Write-Host "Dropped guarded local demo database '$DatabaseName'."
        } finally { $env:PGPASSWORD = $previousPassword }
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
