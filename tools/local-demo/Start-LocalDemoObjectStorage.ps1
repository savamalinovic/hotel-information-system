[CmdletBinding()]
param(
    [string]$MinioPath,
    [string]$McPath,
    [string]$Bucket = 'bluestars-demo',
    [ValidateRange(1, 65535)][int]$ServerPort = 9000,
    [ValidateRange(1, 65535)][int]$ConsolePort = 9001,
    [ValidateRange(10, 300)][int]$ReadinessTimeoutSeconds = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')
. (Join-Path $PSScriptRoot 'LocalDemo.ObjectStorage.Common.ps1')

$started = $false
$state = $null
$process = $null
$processIdentity = $null
try {
    if ($ServerPort -eq $ConsolePort) { throw 'MinIO S3 API and console must use different ports.' }
    if ($ServerPort -ne 9000 -or $ConsolePort -ne 9001) { throw 'The local Android object-storage workflow requires S3 port 9000 and console port 9001.' }
    $configuration = Get-LocalDemoObjectStorageConfiguration -BucketName $Bucket -RequireMinioCredentials
    $minio = Resolve-LocalDemoObjectStorageExecutable -ExplicitPath $MinioPath -ExecutableName 'minio.exe'
    $mc = Resolve-LocalDemoObjectStorageExecutable -ExplicitPath $McPath -ExecutableName 'mc.exe'
    $dataPath = Assert-LocalDemoObjectStorageDataPath -DataPath (Get-LocalDemoObjectStorageDataPath)
    $root = Get-LocalDemoObjectStorageRoot
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null

    $existing = Get-LocalDemoObjectStorageState
    if ($null -ne $existing) {
        $existingIdentity = Get-LocalDemoProcessIdentity -ProcessId ([int]$existing.processId)
        if ($null -ne $existingIdentity -and (Test-LocalDemoProcessIdentity -Identity $existing)) {
            if ([int]$existing.serverPort -ne $ServerPort -or [int]$existing.consolePort -ne $ConsolePort) {
                throw 'A local MinIO process is already running with different ports; stop it before changing the ports.'
            }
            Wait-LocalDemoObjectStorageReadiness -HealthUri "http://127.0.0.1:$ServerPort/minio/health/ready" -TimeoutSeconds $ReadinessTimeoutSeconds -ProcessId ([int]$existing.processId) | Out-Null
            $bucketStatus = Ensure-LocalDemoObjectStorageBucket -Configuration $configuration -McPath $mc
            Write-Host "Local MinIO is already running for bucket '$($configuration.Bucket)' (PID $($existing.processId))."
            Write-Host "  S3 API: http://127.0.0.1:$ServerPort"
            Write-Host "  Console: http://127.0.0.1:$ConsolePort"
            Write-Host "  Bucket: $($bucketStatus.Status)"
            return
        }
        if ($null -eq $existingIdentity) {
            Remove-LocalDemoObjectStorageState
        } else {
            throw 'The recorded MinIO PID exists with a different start time; state was not reused or overwritten.'
        }
    }

    Assert-LocalDemoObjectStoragePortsAvailable -Ports @($ServerPort, $ConsolePort)
    $logPath = Get-LocalDemoObjectStorageOutputLogPath
    $errorLogPath = Get-LocalDemoObjectStorageErrorLogPath
    $environmentUpdates = @{
        MINIO_ROOT_USER = $configuration.RootUser
        MINIO_ROOT_PASSWORD = $configuration.RootPassword
    }
    $previousEnvironment = @{}
    foreach ($item in $environmentUpdates.GetEnumerator()) {
        $previousEnvironment[$item.Key] = [Environment]::GetEnvironmentVariable($item.Key, 'Process')
        [Environment]::SetEnvironmentVariable($item.Key, $item.Value, 'Process')
    }
    try {
        $dataPathArgument = '"' + $dataPath + '"'
        $arguments = @(
            'server', $dataPathArgument,
            '--address', "127.0.0.1:$ServerPort",
            '--console-address', "127.0.0.1:$ConsolePort"
        )
        $process = Start-Process -FilePath $minio -ArgumentList $arguments -WorkingDirectory $root -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
        $processIdentity = Get-LocalDemoProcessIdentity -ProcessId $process.Id
        if ($null -eq $processIdentity) { throw 'MinIO ended before its ownership identity could be recorded.' }
        $state = [pscustomobject]@{
            processId = $process.Id
            startedAt = $processIdentity.startedAt
            serverPort = $ServerPort
            consolePort = $ConsolePort
            dataPath = $dataPath
            bucket = $configuration.Bucket
            executable = $minio
        }
        $started = $true
        Save-LocalDemoObjectStorageState -State $state
    } finally {
        foreach ($item in $previousEnvironment.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($item.Key, $item.Value, 'Process')
        }
    }

    Wait-LocalDemoObjectStorageReadiness -HealthUri "http://127.0.0.1:$ServerPort/minio/health/ready" -TimeoutSeconds $ReadinessTimeoutSeconds -ProcessId $process.Id | Out-Null
    $bucketStatus = Ensure-LocalDemoObjectStorageBucket -Configuration $configuration -McPath $mc
    Write-Host "Local MinIO is ready for bucket '$($configuration.Bucket)'."
    Write-Host "  S3 API: http://127.0.0.1:$ServerPort"
    Write-Host "  Console: http://127.0.0.1:$ConsolePort"
    Write-Host "  Bucket: $($bucketStatus.Status)"
    Write-Host "  PID: $($process.Id)"
    Write-Host "  Logs: $logPath ; $errorLogPath"
} catch {
    $originalMessage = $_.Exception.Message
    $cleanupMessage = $null
    if ($started -and $null -ne (Get-LocalDemoObjectStorageState)) {
        try { [void](Stop-LocalDemoObjectStorageOwnedProcess -ServerPort $ServerPort -ConsolePort $ConsolePort) } catch { $cleanupMessage = $_.Exception.Message }
    } elseif ($null -ne $processIdentity -and $null -ne (Get-LocalDemoProcessIdentity -ProcessId $process.Id) -and (Test-LocalDemoProcessIdentity -Identity $processIdentity)) {
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            $deadline = (Get-Date).AddSeconds(10)
            while ($null -ne (Get-LocalDemoProcessIdentity -ProcessId $process.Id) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
            if ($null -ne (Get-LocalDemoProcessIdentity -ProcessId $process.Id)) { $cleanupMessage = 'The newly started MinIO process did not stop after startup failure.' }
        } catch { $cleanupMessage = $_.Exception.Message }
    }
    Write-Host "FAIL: Local object-storage start failed: $originalMessage"
    if ($cleanupMessage) { Write-Host "FAIL: Local object-storage cleanup failed: $cleanupMessage" }
    exit 1
}
