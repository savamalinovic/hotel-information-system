$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\RemoteDemo.Common.ps1')

function Assert-Rejected([string]$Url, [string]$AllowedHost) {
    try { [void](Resolve-RemoteDemoApiBaseUrl -ApiBaseUrl $Url -AllowedHost $AllowedHost) }
    catch { return }
    throw "Unsafe URL was accepted: $Url"
}

foreach ($url in @(
    'http://demo.up.railway.app/api/v1',
    'https://localhost/api/v1',
    'https://127.0.0.1/api/v1',
    'https://10.1.2.3/api/v1',
    'https://172.16.1.2/api/v1',
    'https://192.168.1.2/api/v1',
    'https://[::1]/api/v1',
    'https://user:pass@demo.up.railway.app/api/v1',
    'https://demo.up.railway.app/api/v1?x=1',
    'https://demo.up.railway.app/api/v1#section',
    'https://demo.up.railway.app:8443/api/v1',
    'https://demo.up.railway.app/api/v2',
    'https://demo.up.railway.app.evil.example/api/v1'
)) { Assert-Rejected $url $null }
Assert-Rejected 'https://127.0.0.1/api/v1' '127.0.0.1'
Assert-Rejected 'https://localhost.example/api/v1' $null

$source = @(Get-ChildItem (Join-Path $PSScriptRoot '..') -Filter '*.ps1' -File | ForEach-Object { Get-Content -Raw $_.FullName }) -join "`n"
foreach ($script in @(Get-ChildItem (Join-Path $PSScriptRoot '..') -Filter '*.ps1' -File)) {
    $header = (Get-Content $script.FullName | Select-Object -First 8) -join "`n"
    if ($header -match '\[string\]\$(DemoPassword|ManagerEmail|Jwt|Token)\b') { throw "Secret command-line parameter found in $($script.Name)." }
}
if ($source -match 'Write-(Host|Output|Error).*\$(DemoPassword|\w+Token)\b') { throw 'Secret output found.' }
if ($source -match '(?i)\b(psql|jdbc|drop database|reset database|postgresql password)\b') { throw 'Direct database or reset operation found.' }
if ($source -match '(?i)\b(Set-Content|Out-File|Export-Clixml|ConvertFrom-SecureString)\b') { throw 'Unexpected file write found.' }
if ($source -notmatch 'MaximumRedirection=0' -or $source -notmatch 'MaximumRedirection 0') { throw 'HTTP redirects must be disabled.' }

$oldEmail = $env:BLUESTARS_DEMO_MANAGER_EMAIL
$oldPassword = $env:BLUESTARS_DEMO_PASSWORD
$oldErrorPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $env:BLUESTARS_DEMO_MANAGER_EMAIL = 'sentinel@example.invalid'
    $env:BLUESTARS_DEMO_PASSWORD = 'private-test-sentinel'
    $output = & powershell.exe -NoProfile -NonInteractive -File (Join-Path $PSScriptRoot '..\Start-RemoteDemo.ps1') -ApiBaseUrl 'http://localhost/api/v1' -ConfirmHost 'localhost' 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) { throw 'Unsafe entry point succeeded.' }
    if ($output.Contains('private-test-sentinel')) { throw 'A secret appeared in command output.' }
} finally {
    $ErrorActionPreference = $oldErrorPreference
    $env:BLUESTARS_DEMO_MANAGER_EMAIL = $oldEmail
    $env:BLUESTARS_DEMO_PASSWORD = $oldPassword
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$scripts = @(Get-ChildItem $root -Filter '*.ps1' -Recurse)
foreach ($script in $scripts) {
    $tokens = $null; $errors = $null
    [void][Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count) { throw "PowerShell parser errors in $($script.Name): $($errors.Message -join '; ')" }
}
Write-Host "PASS: $($scripts.Count) PowerShell scripts parsed; URL and secret guards passed."
