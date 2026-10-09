[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ApiBaseUrl,
    [string]$AllowedHost,
    [string]$ConfirmHost,
    [string]$ReferenceDate,
    [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'RemoteDemo.Common.ps1')

try {
    $ApiBaseUrl = Assert-RemoteDemoTarget -ApiBaseUrl $ApiBaseUrl -AllowedHost $AllowedHost -ConfirmHost $ConfirmHost
    [void](Get-RemoteDemoSecret 'BLUESTARS_DEMO_MANAGER_EMAIL')
    [void](Get-RemoteDemoSecret 'BLUESTARS_DEMO_PASSWORD')
    $arguments = @('-NoProfile', '-NonInteractive', '-File')
    $public = @('-ApiBaseUrl', $ApiBaseUrl, '-ConfirmHost', $ConfirmHost)
    if ($AllowedHost) { $public += @('-AllowedHost', $AllowedHost) }
    $scripts = if ($VerifyOnly) { @('Test-RemoteDemo.ps1') } else { @('Seed-DemoData.ps1','Seed-DemoScenarios.ps1','Test-RemoteDemo.ps1') }
    foreach ($script in $scripts) {
        $scriptArguments = @($arguments) + @((Join-Path $PSScriptRoot $script)) + @($public)
        if ($script -eq 'Seed-DemoScenarios.ps1' -and $ReferenceDate) { $scriptArguments += @('-ReferenceDate', $ReferenceDate) }
        & powershell.exe @scriptArguments
        if ($LASTEXITCODE -ne 0) { throw "$script failed. Resolve the conflict, then rerun the same command; existing demo records are reused." }
    }
    Write-Host 'Remote demo workflow completed.'
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
