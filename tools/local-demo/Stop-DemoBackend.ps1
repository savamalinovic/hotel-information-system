[CmdletBinding()]
param(
    [switch]$Force,
    [ValidateRange(1, 65535)][int]$ServerPort = 8080
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

try {
    if (-not $Force) { throw 'Refusing to stop a process without -Force.' }
    if (-not (Stop-LocalDemoOwnedProcess -ServerPort $ServerPort)) { throw 'No recognized current backend state with a recorded port is available.' }
    Write-Host "Stopped the recorded local demo backend process tree for verified port $ServerPort."
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
