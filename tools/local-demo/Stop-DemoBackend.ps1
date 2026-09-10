[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = 'Stop'

try {
    if (-not $Force) { throw 'Refusing to stop a process without -Force.' }
    $listener = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $listener) { Write-Host 'No listener is using port 8080.'; exit 0 }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if ($null -eq $processInfo -or $processInfo.Name -notmatch '^(java|javaw)\.exe$' -or $processInfo.CommandLine -notmatch 'blueStars') {
        throw "Port 8080 belongs to PID $($listener.OwningProcess), which is not recognized as the local demo backend."
    }
    Stop-Process -Id $listener.OwningProcess -Force
    Write-Host "Stopped local demo backend PID $($listener.OwningProcess)."
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
