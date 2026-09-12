$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\LocalDemo.Common.ps1')
. (Join-Path $PSScriptRoot '..\LocalDemo.ObjectStorage.Common.ps1')

function Assert-Throws {
    param([scriptblock]$Action, [string]$Message)
    try { & $Action } catch { return }
    throw $Message
}

$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "bluestars-object-storage-tests-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
$statePath = Get-LocalDemoObjectStorageStatePath
$originalState = if (Test-Path -LiteralPath $statePath) { Get-Content -Raw -LiteralPath $statePath } else { $null }
$environmentNames = @(
    'BLUESTARS_MINIO_ROOT_USER',
    'BLUESTARS_MINIO_ROOT_PASSWORD',
    'EFIKAS_AWS_REGION',
    'EFIKAS_AWS_ENDPOINT',
    'EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED',
    'EFIKAS_AWS_ACCESS_KEY_ID',
    'EFIKAS_AWS_SECRET_ACCESS_KEY',
    'EFIKAS_AWS_BUCKET',
    'MC_HOST_bluestars'
)
$originalEnvironment = @{}
foreach ($name in $environmentNames) { $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

try {
    foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }

    Assert-Throws { Resolve-LocalDemoObjectStorageExecutable -ExplicitPath (Join-Path $temporaryDirectory 'minio.exe') -ExecutableName 'minio.exe' } 'Missing minio.exe was accepted.'
    Assert-Throws { Resolve-LocalDemoObjectStorageExecutable -ExplicitPath (Join-Path $temporaryDirectory 'mc.exe') -ExecutableName 'mc.exe' } 'Missing mc.exe was accepted.'
    Assert-Throws { Get-LocalDemoObjectStorageConfiguration -BucketName 'bluestars-demo' } 'Incomplete object-storage configuration was accepted.'

    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    try {
        $occupiedPort = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
        Assert-Throws { Assert-LocalDemoObjectStoragePortsAvailable -Ports @($occupiedPort) } 'An occupied object-storage port was accepted.'
    } finally {
        $listener.Stop()
    }

    $testSecret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'
    [Environment]::SetEnvironmentVariable('EFIKAS_AWS_REGION', 'eu-central-1', 'Process')
    [Environment]::SetEnvironmentVariable('EFIKAS_AWS_ENDPOINT', 'http://127.0.0.1:9000', 'Process')
    [Environment]::SetEnvironmentVariable('EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED', 'true', 'Process')
    [Environment]::SetEnvironmentVariable('EFIKAS_AWS_ACCESS_KEY_ID', 'test-user', 'Process')
    [Environment]::SetEnvironmentVariable('EFIKAS_AWS_SECRET_ACCESS_KEY', $testSecret, 'Process')
    $configuration = Get-LocalDemoObjectStorageConfiguration -BucketName 'bluestars-demo'
    if ($configuration.Endpoint -ne 'http://127.0.0.1:9000' -or -not $configuration.PathStyleAccessEnabled) { throw 'Local object-storage configuration was not normalized correctly.' }

    Assert-LocalDemoObjectStorageCredential -Name 'allowed credential' -Value 'abc_DEF-123' -MinimumLength 3 | Out-Null
    Assert-LocalDemoObjectStorageCredential -Name 'allowed secret' -Value ('A' * 46 + '_-') -MinimumLength 32 | Out-Null
    Assert-Throws { Assert-LocalDemoObjectStorageCredential -Name 'short secret' -Value ('A' * 31) -MinimumLength 32 } 'Short object-storage secret was accepted.'
    foreach ($reservedCharacter in @('@', ':', '%', '+', '/', '?', '#', ' ')) {
        $invalidCredential = 'ValidPrefix' + $reservedCharacter + ('A' * 32)
        try {
            Assert-LocalDemoObjectStorageCredential -Name 'reserved credential' -Value $invalidCredential -MinimumLength 32 | Out-Null
        } catch {
            if ($_.Exception.Message -match [regex]::Escape($invalidCredential)) { throw 'Credential validation exposed the rejected value.' }
            continue
        }
        throw 'A reserved object-storage credential character was accepted.'
    }
    $unicodeCredential = 'ValidPrefix' + [char]0x00E9 + ('A' * 32)
    $unicodeRejected = $false
    try {
        Assert-LocalDemoObjectStorageCredential -Name 'unicode credential' -Value $unicodeCredential -MinimumLength 32 | Out-Null
    } catch {
        if ($_.Exception.Message -match [regex]::Escape($unicodeCredential)) { throw 'Credential validation exposed the Unicode value.' }
        $unicodeRejected = $true
    }
    if (-not $unicodeRejected) { throw 'Unicode object-storage credential was accepted.' }

    $powershellPath = (Get-Command powershell.exe -CommandType Application -ErrorAction Stop).Source
    $capturePath = Join-Path $temporaryDirectory 'mc-host.txt'
    [Environment]::SetEnvironmentVariable('MC_HOST_bluestars', 'previous-sentinel', 'Process')
    $captureCommand = "Set-Content -LiteralPath '$capturePath' -Value `$env:MC_HOST_bluestars -Encoding UTF8; Write-Output 'stub-output'"
    $allowedAccessKey = 'bluestars_demo'
    $allowedSecretKey = ('A' * 46) + '_-'
    $successCall = Invoke-LocalDemoObjectStorageMc -McPath $powershellPath -Endpoint $configuration.Endpoint -AccessKeyId $allowedAccessKey -SecretAccessKey $allowedSecretKey -Arguments @('-NoProfile', '-NonInteractive', '-Command', $captureCommand)
    $expectedMcHost = "http://$allowedAccessKey`:$allowedSecretKey@127.0.0.1:9000"
    if ((Get-Content -Raw -LiteralPath $capturePath).Trim() -ne $expectedMcHost) { throw 'MC_HOST_bluestars did not contain the unencoded URL-safe host.' }
    if ((Get-Content -Raw -LiteralPath $capturePath) -match '%') { throw 'MC_HOST_bluestars encoded URL-unreserved credentials.' }
    if (($successCall.Output -join "`n") -match [regex]::Escape($allowedAccessKey) -or ($successCall.Output -join "`n") -match [regex]::Escape($allowedSecretKey)) { throw 'Credentials reached the test stdout.' }
    if ([Environment]::GetEnvironmentVariable('MC_HOST_bluestars', 'Process') -ne 'previous-sentinel') { throw 'MC_HOST_bluestars was not restored after success.' }
    Assert-Throws { Invoke-LocalDemoObjectStorageMc -McPath $powershellPath -Endpoint $configuration.Endpoint -AccessKeyId $allowedAccessKey -SecretAccessKey $allowedSecretKey -Arguments @('-NoProfile', '-NonInteractive', '-Command', 'exit 7') } 'mc failure did not propagate.'
    if ([Environment]::GetEnvironmentVariable('MC_HOST_bluestars', 'Process') -ne 'previous-sentinel') { throw 'MC_HOST_bluestars was not restored after failure.' }

    $calls = [System.Collections.Generic.List[string]]::new()
    $existingResult = Ensure-LocalDemoObjectStorageBucket -Configuration $configuration -McPath 'unused' -McInvoker {
        param([string[]]$Arguments)
        [void]$calls.Add(($Arguments -join ' '))
        [pscustomobject]@{ ExitCode = 0 }
    }
    if ($existingResult.Status -ne 'already exists' -or $calls.Count -ne 1) { throw 'Existing bucket was not handled idempotently.' }
    $calls.Clear()
    $createResult = Ensure-LocalDemoObjectStorageBucket -Configuration $configuration -McPath 'unused' -McInvoker {
        param([string[]]$Arguments)
        [void]$calls.Add(($Arguments -join ' '))
        if ($Arguments[0] -eq 'stat') { return [pscustomobject]@{ ExitCode = 1 } }
        return [pscustomobject]@{ ExitCode = 0 }
    }
    if ($createResult.Status -ne 'created' -or $calls.Count -ne 2 -or $calls[1] -notmatch '--ignore-existing') { throw 'Missing bucket was not created idempotently.' }

    Assert-Throws { Wait-LocalDemoObjectStorageReadiness -HealthUri 'http://127.0.0.1:1/minio/health/ready' -TimeoutSeconds 0 } 'Readiness timeout was not reported.'
    Assert-Throws { Assert-LocalDemoObjectStorageDataPath -DataPath (Get-LocalDemoObjectStorageRoot) } 'Cleanup accepted the storage root.'
    Assert-Throws { Assert-LocalDemoObjectStorageDataPath -DataPath (Get-Location).Path } 'Cleanup accepted the workspace path.'
    if ((Assert-LocalDemoObjectStorageDataPath -DataPath (Get-LocalDemoObjectStorageDataPath)) -ne (Get-LocalDemoObjectStorageDataPath)) { throw 'Guarded data path was not accepted.' }

    $validUrl = Assert-LocalDemoPresignedUrl -Url 'http://127.0.0.1:9000/bluestars-demo/test.txt?X-Amz-Signature=test' -SecretAccessKey $testSecret
    if ($validUrl.Host -ne '127.0.0.1' -or $validUrl.Port -ne 9000) { throw 'Presigned URL host/port was not validated.' }
    Assert-Throws { Assert-LocalDemoPresignedUrl -Url 'http://localhost:9000/bluestars-demo/test.txt?X-Amz-Signature=test' -SecretAccessKey $testSecret } 'Presigned URL accepted the wrong host.'
    Assert-Throws { Assert-LocalDemoPresignedUrl -Url "http://127.0.0.1:9000/bluestars-demo/test.txt?X-Amz-Signature=$testSecret" -SecretAccessKey $testSecret } 'Presigned URL exposed the configured secret.'

    $pingPath = Join-Path $env:SystemRoot 'System32\ping.exe'
    $ping = Start-Process -FilePath $pingPath -ArgumentList @('-n', '30', '127.0.0.1') -PassThru
    try {
        $identity = Get-LocalDemoProcessIdentity -ProcessId $ping.Id
        Save-LocalDemoObjectStorageState -State ([pscustomobject]@{ processId = $identity.processId; startedAt = $identity.startedAt; serverPort = 19090; consolePort = 19091; dataPath = (Get-LocalDemoObjectStorageDataPath); bucket = 'bluestars-demo'; executable = $pingPath })
        $stateText = Get-Content -Raw -LiteralPath $statePath
        if ($stateText -match '(?i)(?:password|secretaccesskey|accesskeyid)') { throw 'Object-storage state contains credential fields.' }
        Assert-Throws { Stop-LocalDemoObjectStorageOwnedProcess -ServerPort 19090 -ConsolePort 19092 } 'Stop accepted a mismatched console port.'
        if (-not (Get-Process -Id $ping.Id -ErrorAction SilentlyContinue)) { throw 'Mismatched port cleanup stopped a process.' }
        Save-LocalDemoObjectStorageState -State ([pscustomobject]@{ processId = $identity.processId; startedAt = ([datetime]$identity.startedAt).AddSeconds(-1).ToString('o'); serverPort = 19090; consolePort = 19091 })
        Assert-Throws { Stop-LocalDemoObjectStorageOwnedProcess -ServerPort 19090 -ConsolePort 19091 } 'Stop accepted a mismatched PID start time.'
        if (-not (Get-Process -Id $ping.Id -ErrorAction SilentlyContinue)) { throw 'Ownership validation stopped an unrelated process.' }
        Save-LocalDemoObjectStorageState -State ([pscustomobject]@{ processId = $identity.processId; startedAt = $identity.startedAt; serverPort = 19090; consolePort = 19091 })
        if (-not (Stop-LocalDemoObjectStorageOwnedProcess -ServerPort 19090 -ConsolePort 19091)) { throw 'Owned process was not stopped.' }
        Start-Sleep -Milliseconds 250
        if (Get-Process -Id $ping.Id -ErrorAction SilentlyContinue) { throw 'Owned process did not stop.' }
        if (Test-Path -LiteralPath $statePath) { throw 'State was not removed after a successful stop.' }
    } finally {
        if (Get-Process -Id $ping.Id -ErrorAction SilentlyContinue) { Stop-Process -Id $ping.Id -Force -ErrorAction SilentlyContinue }
        Remove-LocalDemoObjectStorageState
    }

    $slowPing = Start-Process -FilePath $pingPath -ArgumentList @('-n', '30', '127.0.0.1') -PassThru
    try {
        $slowIdentity = Get-LocalDemoProcessIdentity -ProcessId $slowPing.Id
        Save-LocalDemoObjectStorageState -State ([pscustomobject]@{ processId = $slowIdentity.processId; startedAt = $slowIdentity.startedAt; serverPort = 19090; consolePort = 19091 })
        Assert-Throws { Stop-LocalDemoObjectStorageOwnedProcess -ServerPort 19090 -ConsolePort 19091 -WaitTimeoutSeconds 0 -StopAction { param([int]$ProcessId) } } 'Stop did not report a process that remained alive.'
        if (-not (Test-Path -LiteralPath $statePath)) { throw 'State was not retained after an incomplete stop.' }
    } finally {
        if (Get-Process -Id $slowPing.Id -ErrorAction SilentlyContinue) { Stop-Process -Id $slowPing.Id -Force -ErrorAction SilentlyContinue }
        Remove-LocalDemoObjectStorageState
    }

    $localDemoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\') + '\'
    $localBuildToolsRoot = (Join-Path $localDemoRoot '.local-build-tools').TrimEnd('\') + '\'
    $scriptFiles = Get-ChildItem -Path $localDemoRoot -Filter '*.ps1' -File -Recurse | Where-Object {
        -not $_.FullName.StartsWith($localBuildToolsRoot, [StringComparison]::OrdinalIgnoreCase)
    }
    foreach ($script in $scriptFiles) {
        $tokens = $null
        $errors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$tokens, [ref]$errors)
        if ($errors.Count -gt 0) { throw "PowerShell parser errors in $($script.FullName): $($errors.Message -join '; ')" }
    }

    $startSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Start-LocalDemoObjectStorage.ps1')
    $stopSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Stop-LocalDemoObjectStorage.ps1')
    $adbSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Set-AndroidAdbReverse.ps1')
    $smokeSource = Get-Content -Raw (Join-Path $PSScriptRoot '..\Test-LocalDemoObjectStorage.ps1')
    if ($startSource -notmatch 'minio\.exe' -or $startSource -notmatch 'mc\.exe') { throw 'Storage launcher does not resolve both official tools.' }
    $argumentBlock = [regex]::Match($startSource, '(?s)\$arguments\s*=\s*@\((.*?)\)')
    if ($argumentBlock.Value -match '(?i)(?:RootPassword|MINIO_ROOT_PASSWORD|SecretAccessKey)') { throw 'MinIO secret appears in process arguments.' }
    if ($startSource -notmatch 'MINIO_ROOT_USER' -or $startSource -notmatch 'MINIO_ROOT_PASSWORD') { throw 'MinIO launcher does not use child-process environment credentials.' }
    if ($startSource -notmatch 'Write-Host "FAIL: Local object-storage start failed:' -or $startSource -match 'Write-Error "Local object-storage start failed:') { throw 'Storage launcher failure reporting can mask cleanup diagnostics.' }
    if ($stopSource -notmatch 'CleanupData' -or $stopSource -notmatch 'Clear-LocalDemoObjectStorageData') { throw 'Storage stop does not require explicit guarded cleanup.' }
    if ($adbSource -notmatch 'IncludeObjectStorage' -or $adbSource -notmatch 'tcp:9000') { throw 'ADB helper does not implement the object-storage reverse rule.' }
    if ($adbSource -notmatch 'DeviceSerial' -or $adbSource -notmatch 'unauthorized' -or $adbSource -notmatch 'offline') { throw 'ADB helper lost device selection safety checks.' }
    foreach ($path in @('/apartments/', '/pictures', '/tasks/', '/damages/')) { if ($smokeSource -notmatch [regex]::Escape($path)) { throw "Object-storage smoke does not cover $path." } }
    foreach ($mime in @('image/png', 'text/plain')) { if ($smokeSource -notmatch [regex]::Escape($mime)) { throw "Object-storage smoke does not use $mime." } }
    if ($smokeSource -notmatch 'SKIPPED: object storage is not completely configured' -or $smokeSource -notmatch 'finally') { throw 'Object-storage smoke lacks skip or temporary-file cleanup handling.' }
    if ($smokeSource -match '(?i)Write-(Host|Output|Error).*\$(?:DemoPassword|token|SecretAccessKey|AccessKeyId)') { throw 'Object-storage smoke could print a credential.' }
    if ($startSource -match '(?i)Write-(Host|Output|Error).*\$(?:RootPassword|SecretAccessKey|AccessKeyId)') { throw 'Storage launcher could print a credential.' }
    if ($startSource -notmatch 'Automatic download is not performed' -and $startSource -notmatch 'Resolve-LocalDemoObjectStorageExecutable') { throw 'Storage launcher does not use explicit/PATH/local executable discovery without download.' }
    $stateText = Get-Content -Raw -LiteralPath $statePath -ErrorAction SilentlyContinue
    if ($stateText -and $stateText -match '(?i)(?:password|secretaccesskey|accesskeyid)') { throw 'Object-storage state contains credential fields.' }

    Write-Host "PASS: object-storage executable/configuration, port, bucket idempotency, readiness, ownership stop, cleanup guard, presigned URL, ADB, smoke paths, and parser checks passed."
} finally {
    Remove-LocalDemoObjectStorageState
    foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $originalEnvironment[$name], 'Process') }
    if (Test-Path -LiteralPath $temporaryDirectory) { Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue }
    if ($null -ne $originalState) { Set-Content -LiteralPath $statePath -Value $originalState -Encoding UTF8 -NoNewline }
}
