[CmdletBinding()]
param(
    [switch]$Force,
    [ValidateRange(1, 65535)][int]$ServerPort = 9000,
    [ValidateRange(1, 65535)][int]$ConsolePort = 9001,
    [switch]$CleanupData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')
. (Join-Path $PSScriptRoot 'LocalDemo.ObjectStorage.Common.ps1')

try {
    if (-not $Force) { throw 'Refusing to stop local object storage without -Force.' }
    $state = Get-LocalDemoObjectStorageState
    if ($null -ne $state) {
        $stopped = Stop-LocalDemoObjectStorageOwnedProcess -ServerPort $ServerPort -ConsolePort $ConsolePort
        if ($stopped) { Write-Host "Stopped the recorded local MinIO process for ports $ServerPort/$ConsolePort." }
        else { Write-Host 'The recorded local MinIO process was already stopped; state was removed.' }
    } elseif (@(Get-LocalDemoListeningConnections -Port $ServerPort).Count -gt 0 -or @(Get-LocalDemoListeningConnections -Port $ConsolePort).Count -gt 0) {
        throw 'A MinIO port is occupied but no owned local object-storage state exists; no process was stopped.'
    } else {
        Write-Host 'No owned local MinIO process is recorded.'
    }

    if ($CleanupData) {
        Clear-LocalDemoObjectStorageData -DataPath (Get-LocalDemoObjectStorageDataPath)
        Remove-Item -LiteralPath (Get-LocalDemoObjectStorageOutputLogPath) -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath (Get-LocalDemoObjectStorageErrorLogPath) -Force -ErrorAction SilentlyContinue
        Write-Host 'Removed only the guarded local object-storage data directory and its local logs.'
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
