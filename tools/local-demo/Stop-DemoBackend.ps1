[CmdletBinding()]
param(
    [switch]$Force,
    [ValidateRange(1, 65535)][int]$ServerPort = 8080
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

try {
    if (-not $Force) { throw 'Refusing to stop a process without -Force.' }
    if (-not (Stop-LocalDemoOwnedProcess)) { throw 'No recognized backend process started by the local demo tool is recorded.' }
    Write-Host "Stopped the recorded local demo backend process tree for port $ServerPort."
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
