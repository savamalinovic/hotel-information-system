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
if ((Assert-LocalDemoDatabaseName -DatabaseName 'bluestars_scenarios_verify') -ne 'bluestars_scenarios_verify') { throw 'Safe scenario database was not accepted.' }

foreach ($url in @('https://example.com/api/v1', 'http://hotel.example/api/v1', 'http://127.0.0.1:8080/api/v2')) {
    Assert-Throws { Resolve-LocalDemoApiBaseUrl -ApiBaseUrl $url } "Expected unsafe API URL '$url' to be rejected."
}
$base = Resolve-LocalDemoApiBaseUrl -ApiBaseUrl 'http://localhost:8080'
if ($base -ne 'http://localhost:8080/api/v1') { throw 'API base URL was not normalized correctly.' }
if ((Get-LocalDemoApiUri -ApiBaseUrl $base -Path 'users') -ne 'http://localhost:8080/api/v1/users') { throw 'API request URL was not assembled correctly.' }

$standardPsql = Resolve-LocalDemoPsql
if (-not (Test-Path -LiteralPath $standardPsql -PathType Leaf)) { throw 'Standard PostgreSQL client discovery failed.' }
if ((Resolve-LocalDemoPsql -PsqlPath $standardPsql) -ne $standardPsql) { throw 'Explicit PostgreSQL client path did not take priority.' }
Assert-Throws { Resolve-LocalDemoPsql -PsqlPath (Join-Path $env:TEMP 'missing-psql.exe') } 'Missing PostgreSQL client path was accepted.'
Assert-Throws { Resolve-LocalDemoPsql -PsqlPath "$env:SystemRoot\System32\cmd.exe" } 'Non-psql executable path was accepted.'

$statePath = Get-LocalDemoStatePath
$originalState = if (Test-Path -LiteralPath $statePath) { Get-Content -Raw -LiteralPath $statePath } else { $null }
try {
    $testProcess = Start-Process -FilePath "$env:SystemRoot\System32\ping.exe" -ArgumentList @('-n', '30', '127.0.0.1') -PassThru
    $identity = Get-LocalDemoProcessIdentity -ProcessId $testProcess.Id
    Save-LocalDemoProcessState -State ([pscustomobject]@{ serverPort = 18081; launcher = $identity; ownedProcesses = @($identity) })
    Assert-Throws { Stop-LocalDemoOwnedProcess -ServerPort 18082 } 'Cleanup accepted a mismatched port.'
    if (-not (Get-Process -Id $testProcess.Id -ErrorAction SilentlyContinue)) { throw 'Mismatched port cleanup stopped its process.' }
    if (-not (Stop-LocalDemoOwnedProcess -ServerPort 18081)) { throw 'Owned test process was not cleaned up.' }
    Start-Sleep -Milliseconds 250
    if (Get-Process -Id $testProcess.Id -ErrorAction SilentlyContinue) { throw 'Cleanup did not stop its owned test process.' }
    if (Test-Path -LiteralPath $statePath) { throw 'Cleanup did not remove its state file.' }

    $current = Get-LocalDemoProcessIdentity -ProcessId $PID
    $stale = [pscustomobject]@{ processId = $current.processId; startedAt = ([datetime]$current.startedAt).AddSeconds(-1).ToString('o') }
    Save-LocalDemoProcessState -State ([pscustomobject]@{ serverPort = 18081; launcher = $stale; ownedProcesses = @($stale) })
    if (Stop-LocalDemoOwnedProcess -ServerPort 18081) { throw 'Cleanup accepted a process identity it did not own.' }
    if (-not (Get-Process -Id $PID -ErrorAction SilentlyContinue)) { throw 'Cleanup stopped an unrelated current process.' }
    Save-LocalDemoProcessState -State ([pscustomobject]@{ launcher = $current; ownedProcesses = @($current) })
    if (Stop-LocalDemoOwnedProcess -ServerPort 18081) { throw 'Legacy state was accepted as current.' }
    if (Test-Path -LiteralPath $statePath) { throw 'Legacy state was not removed.' }
} finally {
    Remove-LocalDemoProcessState
    if ($null -ne $originalState) { Set-Content -LiteralPath $statePath -Value $originalState -Encoding UTF8 -NoNewline }
}

$counters = [pscustomobject]@{ Lookup = 0; Create = 0 }
$existing = [pscustomobject]@{ id = 1 }
$result = Invoke-LocalDemoEnsure -Lookup { [void]($counters.Lookup++); $existing } -Create { [void]($counters.Create++); [pscustomobject]@{ id = 2 } }
if ($result.Status -ne 'already exists' -or $counters.Create -ne 0) { throw 'Existing resource was not idempotent.' }
$result = Invoke-LocalDemoEnsure -Lookup { [void]($counters.Lookup++); $null } -Create { [void]($counters.Create++); [pscustomobject]@{ id = 2 } }
if ($result.Status -ne 'created' -or $counters.Create -ne 1) { throw 'Missing resource was not created once.' }

$previousCulture = [Globalization.CultureInfo]::CurrentCulture
$previousUiCulture = [Globalization.CultureInfo]::CurrentUICulture
try {
    [Globalization.CultureInfo]::CurrentCulture = [Globalization.CultureInfo]::GetCultureInfo('sr-Latn-BA')
    [Globalization.CultureInfo]::CurrentUICulture = [Globalization.CultureInfo]::GetCultureInfo('sr-Latn-BA')
    $moneyJson = @{ amount = ConvertTo-LocalDemoMoney ([decimal]11.25) } | ConvertTo-Json -Compress
    if ($moneyJson -ne '{"amount":"11.25"}') { throw "Invariant demo money JSON was not preserved: $moneyJson" }
} finally {
    [Globalization.CultureInfo]::CurrentCulture = $previousCulture
    [Globalization.CultureInfo]::CurrentUICulture = $previousUiCulture
}

$seedSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Seed-DemoData.ps1')
if ($seedSource -match 'Write-(Host|Output|Error).*\$DemoPassword') { throw 'Seed script could write the demo password.' }
$scenarioSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Seed-DemoScenarios.ps1')
if ($scenarioSource -notmatch 'ReferenceDate must use ISO form yyyy-MM-dd') { throw 'Scenario seed does not validate ReferenceDate.' }
if ($scenarioSource -notmatch '\[DEMO:\$\{Code\}:') { throw 'Scenario seed does not form stable scenario markers.' }
if ($scenarioSource -match '(?i)\b(double|float)\b') { throw 'Scenario seed must not use binary floating-point values.' }
if ($scenarioSource -notmatch 'Conflicting existing state') { throw 'Scenario seed does not stop on a conflicting existing scenario.' }
if ($scenarioSource -notmatch 'Ensure-R1Claim') { throw 'Scenario seed does not record the required R1 claim.' }
if ($scenarioSource -notmatch 'Ensure-CompletedDemoAttendance') { throw 'Scenario seed does not make preparation attendance idempotent.' }
if ($scenarioSource -notmatch "status -eq 'COMPLETED'.*status -eq 'CANCELLED'") { throw 'Scenario seed does not guard terminal task actions.' }
if ($scenarioSource -match '(?i)\b(insert|update|delete\s+from|psql|jdbc)\b') { throw 'Scenario seed appears to use a direct database operation.' }
if ($scenarioSource -match 'Write-(Host|Output|Error).*\$(managerToken|agentOneToken|agentTwoToken|DemoPassword)') { throw 'Scenario seed could write a secret.' }
$startSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Start-DemoBackend.ps1')
if ($startSource -match 'Write-(Host|Output|Error).*(\$JwtSecret|\$PostgresPassword|\$DemoPassword)') { throw 'Backend launcher could write a secret.' }

$scripts = Get-ChildItem -Path (Join-Path $PSScriptRoot '..') -Filter '*.ps1' -File -Recurse
foreach ($script in $scripts) {
    $tokens = $null; $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count -gt 0) { throw "PowerShell parser errors in $($script.FullName): $($errors.Message -join '; ')" }
}
Write-Host "PASS: $($scripts.Count) PowerShell scripts parsed; local demo safety, scenario idempotency guards, PostgreSQL discovery, and ownership cleanup checks passed."
