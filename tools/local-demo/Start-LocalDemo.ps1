[CmdletBinding()]
param(
    [string]$DatabaseName = 'bluestars_demo',
    [string]$PostgresHost = 'localhost',
    [ValidateRange(1, 65535)][int]$PostgresPort = 5432,
    [string]$PostgresUser,
    [string]$PostgresPassword,
    [string]$PsqlPath,
    [string]$JwtSecret,
    [string]$DemoPassword,
    [string]$ManagerEmail,
    [string]$ManagerName,
    [string]$ManagerSurname,
    [string]$ManagerJmbg,
    [string]$ManagerAddress,
    [string]$ManagerPhone,
    [ValidateRange(1, 65535)][int]$ServerPort = 8080,
    [ValidateRange(10, 300)][int]$ReadinessTimeoutSeconds = 90,
    [switch]$ResetDatabase,
    [switch]$CleanupDatabaseOnFailure,
    [switch]$SkipAdb,
    [switch]$ShowDemoPassword,
    [string]$DeviceSerial
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

function Invoke-LocalDemoScript([string]$Name, [hashtable]$Parameters) {
    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot $Name))
    foreach ($entry in $Parameters.GetEnumerator()) {
        if ($entry.Value -is [bool] -and -not [bool]$entry.Value) { continue }
        $arguments += "-$($entry.Key)"
        if ($entry.Value -isnot [switch] -and $entry.Value -isnot [bool]) { $arguments += [string]$entry.Value }
    }
    $powerShell = Get-Command powershell.exe -CommandType Application -ErrorAction Stop
    $watch = [Diagnostics.Stopwatch]::StartNew()
    Write-Host "START: $Name"
    try {
        & $powerShell.Source @arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) { throw "$Name failed with exit code $exitCode." }
        Write-Host ("PASS: {0} (exit {1}, {2:N1} s)" -f $Name, $exitCode, $watch.Elapsed.TotalSeconds)
    } catch {
        $code = if ($null -eq $LASTEXITCODE) { 'unknown' } else { $LASTEXITCODE }
        Write-Host ("FAIL: {0} (exit {1}, {2:N1} s)" -f $Name, $code, $watch.Elapsed.TotalSeconds)
        throw
    }
}

function Set-TemporaryLocalDemoEnvironment([hashtable]$Values) {
    $previous = @{}
    foreach ($entry in $Values.GetEnumerator()) {
        $previous[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
    return $previous
}

function Restore-TemporaryLocalDemoEnvironment([hashtable]$Previous) {
    foreach ($entry in $Previous.GetEnumerator()) { [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process') }
}

function Test-LocalPortOwnership([int]$Port) {
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) { return }
    $state = Get-LocalDemoProcessState
    $owned = if ($null -eq $state) { @() } else { @($state.ownedProcesses | Where-Object { Test-LocalDemoProcessIdentity $_ } | ForEach-Object { [int]$_.processId }) }
    $foreign = @($listeners | Where-Object { $_.OwningProcess -notin $owned })
    if ($foreign.Count -gt 0) { throw "Port $Port is occupied by a process not owned by this local demo runner; it was not stopped." }
    throw "Port $Port is occupied by an existing local demo backend. Stop it first with Stop-DemoBackend.ps1 -Force -ServerPort $Port."
}

$started = $false
$temporaryEnvironment = $null
try {
    Assert-LocalDemoHost -HostName $PostgresHost
    $DatabaseName = Assert-LocalDemoDatabaseName -DatabaseName $DatabaseName
    $PostgresUser = Get-LocalDemoValue -Value $PostgresUser -EnvironmentName 'POSTGRES_USER' -Label 'PostgreSQL user'
    $PostgresPassword = Get-LocalDemoValue -Value $PostgresPassword -EnvironmentName 'POSTGRES_PASSWORD' -Label 'PostgreSQL password'
    $JwtSecret = Get-LocalDemoValue -Value $JwtSecret -EnvironmentName 'EFIKAS_JWT_SECRET' -Label 'JWT secret'
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = if ($ManagerEmail) { $ManagerEmail } else { Get-LocalDemoValue -Value $null -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email' }
    foreach ($setting in @(@{ Name='ManagerName'; Environment='BLUESTARS_DEMO_MANAGER_NAME' }, @{ Name='ManagerSurname'; Environment='BLUESTARS_DEMO_MANAGER_SURNAME' }, @{ Name='ManagerJmbg'; Environment='BLUESTARS_DEMO_MANAGER_JMBG' }, @{ Name='ManagerAddress'; Environment='BLUESTARS_DEMO_MANAGER_ADDRESS' }, @{ Name='ManagerPhone'; Environment='BLUESTARS_DEMO_MANAGER_PHONE' })) {
        if ([string]::IsNullOrWhiteSpace((Get-Variable -Name $setting.Name -ValueOnly))) { Set-Variable -Name $setting.Name -Value (Get-LocalDemoValue -Value $null -EnvironmentName $setting.Environment -Label $setting.Name) }
    }
    $temporaryEnvironment = Set-TemporaryLocalDemoEnvironment -Values @{ POSTGRES_PASSWORD=$PostgresPassword; EFIKAS_JWT_SECRET=$JwtSecret; BLUESTARS_DEMO_PASSWORD=$DemoPassword }
    Test-LocalPortOwnership -Port $ServerPort
    $resetArgs = @{ DatabaseName=$DatabaseName; PostgresHost=$PostgresHost; PostgresPort=$PostgresPort; PostgresUser=$PostgresUser }
    if ($PsqlPath) { $resetArgs.PsqlPath = $PsqlPath }; if ($ResetDatabase) { $resetArgs.Reset = $true }
    Invoke-LocalDemoScript -Name 'Reset-DemoDatabase.ps1' -Parameters $resetArgs
    $apiBaseUrl = "http://127.0.0.1:$ServerPort/api/v1"
    $startArgs = @{ DatabaseName=$DatabaseName; PostgresHost=$PostgresHost; PostgresPort=$PostgresPort; PostgresUser=$PostgresUser; ManagerEmail=$ManagerEmail; ManagerName=$ManagerName; ManagerSurname=$ManagerSurname; ManagerJmbg=$ManagerJmbg; ManagerAddress=$ManagerAddress; ManagerPhone=$ManagerPhone; ServerPort=$ServerPort; ReadinessTimeoutSeconds=$ReadinessTimeoutSeconds }
    Invoke-LocalDemoScript -Name 'Start-DemoBackend.ps1' -Parameters $startArgs; $started = $true
    Invoke-LocalDemoScript -Name 'Seed-DemoData.ps1' -Parameters @{ ApiBaseUrl=$apiBaseUrl; ManagerEmail=$ManagerEmail }
    Invoke-LocalDemoScript -Name 'Seed-DemoScenarios.ps1' -Parameters @{ ApiBaseUrl=$apiBaseUrl; ManagerEmail=$ManagerEmail }
    if (-not $SkipAdb) {
        if ($ServerPort -ne 8080) { throw 'Android demo mode requires ServerPort 8080. Use -SkipAdb for an isolated port.' }
        $adbArgs = @{}; if ($DeviceSerial) { $adbArgs.DeviceSerial = $DeviceSerial }
        Invoke-LocalDemoScript -Name 'Set-AndroidAdbReverse.ps1' -Parameters $adbArgs
    }
    $verificationArgs = @{ ApiBaseUrl=$apiBaseUrl; ManagerEmail=$ManagerEmail }
    if ($SkipAdb) { $verificationArgs.SkipAdb = $true }
    if ($DeviceSerial) { $verificationArgs.DeviceSerial = $DeviceSerial }
    Invoke-LocalDemoScript -Name 'Test-LocalDemo.ps1' -Parameters $verificationArgs
    Write-Host "`nPASS: local demo is ready"
    Write-Host "  Backend: $apiBaseUrl"
    Write-Host "  Database: $DatabaseName"
    Write-Host '  Backend readiness: ready; base seed: complete; R1-R8 scenarios: complete'
    Write-Host (if ($SkipAdb) { '  ADB reverse: skipped' } else { '  ADB reverse: active for tcp:8080' })
    Write-Host "  Accounts: $ManagerEmail (MANAGER), demo.agent.one@bluestars.local (AGENT), demo.agent.two@bluestars.local (AGENT), demo.worker.cleaning@bluestars.local (OPERATIONAL_WORKER)"
    if ($ShowDemoPassword) { Write-Host "  Demo password: $DemoPassword" }
    Write-Host "  Verify: .\Test-LocalDemo.ps1 -ApiBaseUrl $apiBaseUrl"
    Write-Host "  Stop: .\Stop-DemoBackend.ps1 -Force -ServerPort $ServerPort"
} catch {
    Write-Error "Local demo failed: $($_.Exception.Message)"
    if ($CleanupDatabaseOnFailure) {
        try { & (Join-Path $PSScriptRoot 'Stop-DemoBackend.ps1') -Force -ServerPort $ServerPort -DropDatabase -DatabaseName $DatabaseName -PostgresHost $PostgresHost -PostgresPort $PostgresPort -PostgresUser $PostgresUser -PsqlPath $PsqlPath } catch { Write-Error 'CleanupDatabaseOnFailure could not remove the guarded demo database.' }
    } elseif ($started) { [void](Stop-LocalDemoOwnedProcess -ServerPort $ServerPort) }
    exit 1
} finally {
    if ($null -ne $temporaryEnvironment) { Restore-TemporaryLocalDemoEnvironment -Previous $temporaryEnvironment }
}
