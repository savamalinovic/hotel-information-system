[CmdletBinding()]
param(
    [string]$DeviceSerial,
    [switch]$IncludeObjectStorage
)

$ErrorActionPreference = 'Stop'

try {
    $adb = Get-Command adb -ErrorAction Stop
    $devices = & $adb.Source devices
    if ($LASTEXITCODE -ne 0) { throw 'adb devices failed.' }
    Write-Host $devices

    $authorized = @($devices | Select-Object -Skip 1 | ForEach-Object {
        $parts = $_ -split '\s+'
        if ($parts.Count -ge 2 -and $parts[1] -eq 'device') { $parts[0] }
    } | Where-Object { $_ })
    $unauthorized = @($devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sunauthorized$' })
    $offline = @($devices | Select-Object -Skip 1 | Where-Object { $_ -match '\soffline$' })
    if ($unauthorized.Count -gt 0) { throw 'An adb device is unauthorized. Unlock it and approve USB debugging, then retry.' }
    if ($offline.Count -gt 0) { throw 'An adb device is offline. Reconnect it, then retry.' }

    if ([string]::IsNullOrWhiteSpace($DeviceSerial)) {
        if ($authorized.Count -ne 1) { throw "Exactly one authorized adb device is required; found $($authorized.Count). Supply -DeviceSerial when multiple devices are connected." }
        $DeviceSerial = $authorized[0]
    } elseif ($DeviceSerial -notin $authorized) {
        throw "Requested device '$DeviceSerial' is not an authorized adb device."
    }

    $reversePorts = @(8080)
    if ($IncludeObjectStorage) { $reversePorts += 9000 }
    foreach ($port in $reversePorts) {
        & $adb.Source -s $DeviceSerial reverse "tcp:$port" "tcp:$port"
        if ($LASTEXITCODE -ne 0) { throw "adb reverse failed for tcp:$port." }
    }
    $rules = & $adb.Source -s $DeviceSerial reverse --list
    if ($LASTEXITCODE -ne 0) { throw 'Could not verify adb reverse rules.' }
    if (-not ($rules -match 'tcp:8080\s+tcp:8080')) { throw 'adb reverse completed but the tcp:8080 rule is not active.' }
    if ($IncludeObjectStorage -and -not ($rules -match 'tcp:9000\s+tcp:9000')) { throw 'adb reverse completed but the tcp:9000 rule is not active.' }
    if ($IncludeObjectStorage) {
        Write-Host "ADB reverse is active for ${DeviceSerial}: device tcp:8080 -> computer tcp:8080 and tcp:9000 -> computer tcp:9000"
    } else {
        Write-Host "ADB reverse is active for ${DeviceSerial}: device tcp:8080 -> computer tcp:8080"
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
