$ErrorActionPreference = 'Stop'
$common = Join-Path $PSScriptRoot '..\LocalDemo.Common.ps1'
. $common

function Assert-Throws {
    param([scriptblock]$Action, [string]$Message)
    try { & $Action } catch { return }
    throw $Message
}

foreach ($name in @('postgres', 'template0', 'template1', 'hotel', 'efikas', 'bluestars', 'ordinary_database')) {
    Assert-Throws { Assert-LocalDemoDatabaseName -DatabaseName $name } "Expected unsafe database '$name' to be rejected."
}
if ((Assert-LocalDemoDatabaseName -DatabaseName 'bluestars_demo_verify') -ne 'bluestars_demo_verify') { throw 'Safe demo database was not accepted.' }

foreach ($url in @('https://example.com/api/v1', 'http://hotel.example/api/v1', 'http://127.0.0.1:8080/api/v2')) {
    Assert-Throws { Resolve-LocalDemoApiBaseUrl -ApiBaseUrl $url } "Expected unsafe API URL '$url' to be rejected."
}
$base = Resolve-LocalDemoApiBaseUrl -ApiBaseUrl 'http://localhost:8080'
if ($base -ne 'http://localhost:8080/api/v1') { throw 'API base URL was not normalized correctly.' }
if ((Get-LocalDemoApiUri -ApiBaseUrl $base -Path 'users') -ne 'http://localhost:8080/api/v1/users') { throw 'API request URL was not assembled correctly.' }

$counters = [pscustomobject]@{ Lookup = 0; Create = 0 }
$existing = [pscustomobject]@{ id = 1 }
$result = Invoke-LocalDemoEnsure -Lookup { [void]($counters.Lookup++); $existing } -Create { [void]($counters.Create++); [pscustomobject]@{ id = 2 } }
if ($result.Status -ne 'already exists' -or $counters.Create -ne 0) { throw 'Existing resource was not idempotent.' }
$result = Invoke-LocalDemoEnsure -Lookup { [void]($counters.Lookup++); $null } -Create { [void]($counters.Create++); [pscustomobject]@{ id = 2 } }
if ($result.Status -ne 'created' -or $counters.Create -ne 1) { throw 'Missing resource was not created once.' }

$seedSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Seed-DemoData.ps1')
if ($seedSource -match 'Write-(Host|Output|Error).*\$DemoPassword') { throw 'Seed script could write the demo password.' }
$startSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Start-DemoBackend.ps1')
if ($startSource -match 'Write-(Host|Output|Error).*(\$JwtSecret|\$PostgresPassword|\$DemoPassword)') { throw 'Backend launcher could write a secret.' }

$scripts = Get-ChildItem -Path (Join-Path $PSScriptRoot '..') -Filter '*.ps1' -File -Recurse
foreach ($script in $scripts) {
    $tokens = $null; $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count -gt 0) { throw "PowerShell parser errors in $($script.FullName): $($errors.Message -join '; ')" }
}
Write-Host "PASS: $($scripts.Count) PowerShell scripts parsed; local demo safety helpers passed."
