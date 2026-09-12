Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:LocalDemoObjectStorageRoot = Join-Path $PSScriptRoot '.local-object-storage'

function Get-LocalDemoObjectStorageRoot {
    return [IO.Path]::GetFullPath($script:LocalDemoObjectStorageRoot).TrimEnd('\')
}

function Get-LocalDemoObjectStorageDataPath {
    return [IO.Path]::GetFullPath((Join-Path (Get-LocalDemoObjectStorageRoot) 'data')).TrimEnd('\')
}

function Get-LocalDemoObjectStorageStatePath {
    return Join-Path (Get-LocalDemoObjectStorageRoot) 'minio-state.json'
}

function Get-LocalDemoObjectStorageOutputLogPath {
    return Join-Path (Get-LocalDemoObjectStorageRoot) 'minio.out.log'
}

function Get-LocalDemoObjectStorageErrorLogPath {
    return Join-Path (Get-LocalDemoObjectStorageRoot) 'minio.err.log'
}

function Assert-LocalDemoObjectStorageDataPath {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$DataPath)

    $expected = Get-LocalDemoObjectStorageDataPath
    $candidate = [IO.Path]::GetFullPath($DataPath).TrimEnd('\')
    if (-not [StringComparer]::OrdinalIgnoreCase.Equals($candidate, $expected)) {
        throw "Object-storage cleanup is restricted to the dedicated local demo data directory '$expected'."
    }
    foreach ($path in @((Get-LocalDemoObjectStorageRoot), $expected)) {
        if (Test-Path -LiteralPath $path) {
            $item = Get-Item -LiteralPath $path
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw 'Object-storage cleanup refuses reparse-point directories.'
            }
        }
    }
    return $candidate
}

function Get-LocalDemoObjectStorageState {
    $statePath = Get-LocalDemoObjectStorageStatePath
    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) { return $null }
    try {
        return Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
    } catch {
        throw "The local object-storage state file is invalid; inspect '$statePath' before retrying."
    }
}

function Save-LocalDemoObjectStorageState {
    [CmdletBinding()]
    param([Parameter(Mandatory)]$State)

    $root = Get-LocalDemoObjectStorageRoot
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    $statePath = Get-LocalDemoObjectStorageStatePath
    $temporaryPath = "$statePath.$([Guid]::NewGuid().ToString('N')).tmp"
    $State | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $temporaryPath -Encoding UTF8 -NoNewline
    Move-Item -LiteralPath $temporaryPath -Destination $statePath -Force
}

function Remove-LocalDemoObjectStorageState {
    Remove-Item -LiteralPath (Get-LocalDemoObjectStorageStatePath) -Force -ErrorAction SilentlyContinue
}

function Resolve-LocalDemoObjectStorageExecutable {
    [CmdletBinding()]
    param(
        [string]$ExplicitPath,
        [Parameter(Mandatory)][ValidateSet('minio.exe', 'mc.exe')][string]$ExecutableName,
        [string]$LocalToolDirectory = (Join-Path $PSScriptRoot 'bin')
    )

    function Assert-Candidate([string]$Candidate, [string]$Source) {
        if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
            throw "$ExecutableName from $Source does not exist: $Candidate"
        }
        $item = Get-Item -LiteralPath $Candidate
        if ($item.Name -ine $ExecutableName) {
            throw "$ExecutableName from $Source must be named ${ExecutableName}: $Candidate"
        }
        return $item.FullName
    }

    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
        return Assert-Candidate -Candidate $ExplicitPath -Source 'the explicit parameter'
    }

    $pathCommand = Get-Command $ExecutableName -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $pathCommand) {
        $path = if ($pathCommand.PSObject.Properties['Source']) { $pathCommand.Source } else { $pathCommand.Path }
        return Assert-Candidate -Candidate $path -Source 'PATH'
    }

    $localCandidate = Join-Path $LocalToolDirectory $ExecutableName
    if (Test-Path -LiteralPath $localCandidate -PathType Leaf) {
        return Assert-Candidate -Candidate $localCandidate -Source 'the ignored local-demo bin directory'
    }

    throw "$ExecutableName was not found. Put the official binary in '$LocalToolDirectory', add it to PATH, or pass the explicit path parameter. Automatic download is not performed."
}

function Assert-LocalDemoObjectStorageBucketName {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$BucketName)

    if ($BucketName -notmatch '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' -or $BucketName -match '\.\.' -or $BucketName -match '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$') {
        throw "Bucket '$BucketName' is not a safe S3 bucket name."
    }
    return $BucketName
}

function Assert-LocalDemoObjectStorageEndpoint {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Endpoint)

    try { $uri = [Uri]$Endpoint } catch { throw 'EFIKAS_AWS_ENDPOINT must be a valid URL.' }
    if ($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or $uri.Port -ne 9000 -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/') {
        throw 'EFIKAS_AWS_ENDPOINT must be exactly http://127.0.0.1:9000 without credentials, a path, a query, or a fragment.'
    }
    return 'http://127.0.0.1:9000'
}

function Assert-LocalDemoObjectStorageCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value,
        [Parameter(Mandatory)][ValidateRange(3, 128)][int]$MinimumLength
    )

    if ($Value.Length -lt $MinimumLength -or $Value -notmatch '^[A-Za-z0-9_-]+\z') {
        throw "$Name must contain only ASCII letters, digits, '_' or '-' and at least $MinimumLength characters; the versioned local-demo mc client requires URL-safe credentials."
    }
    return $Value
}

function Get-LocalDemoObjectStorageConfiguration {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$BucketName,
        [switch]$RequireMinioCredentials
    )

    $bucket = Assert-LocalDemoObjectStorageBucketName -BucketName $BucketName
    $endpoint = [Environment]::GetEnvironmentVariable('EFIKAS_AWS_ENDPOINT', 'Process')
    $region = [Environment]::GetEnvironmentVariable('EFIKAS_AWS_REGION', 'Process')
    $accessKeyId = [Environment]::GetEnvironmentVariable('EFIKAS_AWS_ACCESS_KEY_ID', 'Process')
    $secretAccessKey = [Environment]::GetEnvironmentVariable('EFIKAS_AWS_SECRET_ACCESS_KEY', 'Process')
    $pathStyle = [Environment]::GetEnvironmentVariable('EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED', 'Process')
    $missing = @(@(
        @{ Name = 'EFIKAS_AWS_ENDPOINT'; Value = $endpoint }
        @{ Name = 'EFIKAS_AWS_REGION'; Value = $region }
        @{ Name = 'EFIKAS_AWS_ACCESS_KEY_ID'; Value = $accessKeyId }
        @{ Name = 'EFIKAS_AWS_SECRET_ACCESS_KEY'; Value = $secretAccessKey }
        @{ Name = 'EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED'; Value = $pathStyle }
    ) | Where-Object { [string]::IsNullOrWhiteSpace($_.Value) })
    if ($missing.Count -gt 0) {
        throw "Object-storage configuration is incomplete; missing $($missing.Name -join ', ')."
    }
    if ($pathStyle -notmatch '^(?i:true)$') {
        throw 'EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED must be true for the local MinIO workflow.'
    }
    $normalizedEndpoint = Assert-LocalDemoObjectStorageEndpoint -Endpoint $endpoint
    Assert-LocalDemoObjectStorageCredential -Name 'EFIKAS_AWS_ACCESS_KEY_ID' -Value $accessKeyId -MinimumLength 3 | Out-Null
    Assert-LocalDemoObjectStorageCredential -Name 'EFIKAS_AWS_SECRET_ACCESS_KEY' -Value $secretAccessKey -MinimumLength 32 | Out-Null

    $rootUser = $null
    $rootPassword = $null
    if ($RequireMinioCredentials) {
        $rootUser = [Environment]::GetEnvironmentVariable('BLUESTARS_MINIO_ROOT_USER', 'Process')
        $rootPassword = [Environment]::GetEnvironmentVariable('BLUESTARS_MINIO_ROOT_PASSWORD', 'Process')
        if ([string]::IsNullOrWhiteSpace($rootUser) -or [string]::IsNullOrWhiteSpace($rootPassword)) {
            throw 'BLUESTARS_MINIO_ROOT_USER and BLUESTARS_MINIO_ROOT_PASSWORD are required for the local MinIO launcher.'
        }
        Assert-LocalDemoObjectStorageCredential -Name 'BLUESTARS_MINIO_ROOT_USER' -Value $rootUser -MinimumLength 3 | Out-Null
        Assert-LocalDemoObjectStorageCredential -Name 'BLUESTARS_MINIO_ROOT_PASSWORD' -Value $rootPassword -MinimumLength 32 | Out-Null
        if ($rootUser -ne $accessKeyId -or $rootPassword -ne $secretAccessKey) {
            throw 'For the standalone local demo, EFIKAS AWS credentials must match the MinIO root credentials.'
        }
    }

    return [pscustomobject]@{
        Bucket = $bucket
        Endpoint = $normalizedEndpoint
        Region = $region
        AccessKeyId = $accessKeyId
        SecretAccessKey = $secretAccessKey
        PathStyleAccessEnabled = $true
        RootUser = $rootUser
        RootPassword = $rootPassword
    }
}

function Get-LocalDemoListeningConnections {
    [CmdletBinding()]
    param([Parameter(Mandatory)][ValidateRange(1, 65535)][int]$Port)

    return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Assert-LocalDemoObjectStoragePortsAvailable {
    [CmdletBinding()]
    param([Parameter(Mandatory)][ValidateCount(1, 2)][int[]]$Ports)

    foreach ($port in $Ports) {
        if (@(Get-LocalDemoListeningConnections -Port $port).Count -gt 0) {
            throw "Port $port is already in use by another listening process; no local object-storage process was started or stopped."
        }
    }
}

function Invoke-LocalDemoObjectStorageMc {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$McPath,
        [Parameter(Mandatory)][string]$Endpoint,
        [Parameter(Mandatory)][string]$AccessKeyId,
        [Parameter(Mandatory)][string]$SecretAccessKey,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$IgnoreFailure
    )

    Assert-LocalDemoObjectStorageCredential -Name 'mc access key' -Value $AccessKeyId -MinimumLength 3 | Out-Null
    Assert-LocalDemoObjectStorageCredential -Name 'mc secret key' -Value $SecretAccessKey -MinimumLength 32 | Out-Null
    $endpointUri = [Uri](Assert-LocalDemoObjectStorageEndpoint -Endpoint $Endpoint)
    $mcHostValue = '{0}://{1}:{2}@{3}' -f $endpointUri.Scheme, $AccessKeyId, $SecretAccessKey, $endpointUri.Authority
    $previous = [Environment]::GetEnvironmentVariable('MC_HOST_bluestars', 'Process')
    [Environment]::SetEnvironmentVariable('MC_HOST_bluestars', $mcHostValue, 'Process')
    try {
        $output = & $McPath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } catch {
        $output = @()
        $exitCode = 1
    } finally {
        [Environment]::SetEnvironmentVariable('MC_HOST_bluestars', $previous, 'Process')
    }
    if ($exitCode -ne 0 -and -not $IgnoreFailure) {
        throw "mc object-storage operation failed with exit code $exitCode."
    }
    return [pscustomobject]@{ ExitCode = $exitCode; Output = @($output) }
}

function Ensure-LocalDemoObjectStorageBucket {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Configuration,
        [Parameter(Mandatory)][string]$McPath,
        [scriptblock]$McInvoker
    )

    $target = "bluestars/$($Configuration.Bucket)"
    if ($null -eq $McInvoker) {
        $lookup = Invoke-LocalDemoObjectStorageMc -McPath $McPath -Endpoint $Configuration.Endpoint -AccessKeyId $Configuration.AccessKeyId -SecretAccessKey $Configuration.SecretAccessKey -Arguments @('stat', $target) -IgnoreFailure
    } else {
        $lookup = & $McInvoker @('stat', $target)
    }
    if ($lookup.ExitCode -eq 0) {
        return [pscustomobject]@{ Status = 'already exists'; Bucket = $Configuration.Bucket }
    }

    if ($null -eq $McInvoker) {
        $create = Invoke-LocalDemoObjectStorageMc -McPath $McPath -Endpoint $Configuration.Endpoint -AccessKeyId $Configuration.AccessKeyId -SecretAccessKey $Configuration.SecretAccessKey -Arguments @('mb', '--ignore-existing', $target)
    } else {
        $create = & $McInvoker @('mb', '--ignore-existing', $target)
    }
    if ($create.ExitCode -ne 0) { throw 'mc could not create or verify the local demo bucket.' }
    return [pscustomobject]@{ Status = 'created'; Bucket = $Configuration.Bucket }
}

function Wait-LocalDemoObjectStorageReadiness {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$HealthUri,
        [ValidateRange(0, 300)][int]$TimeoutSeconds = 90,
        [int]$ProcessId
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUri -TimeoutSec 3 -ErrorAction Stop
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { return $true }
        } catch {
            if ($PSBoundParameters.ContainsKey('ProcessId') -and $ProcessId -gt 0 -and $null -eq (Get-LocalDemoProcessIdentity -ProcessId $ProcessId)) {
                throw 'MinIO stopped before its readiness endpoint became available.'
            }
        }
        if ((Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
    } while ((Get-Date) -lt $deadline)
    throw "MinIO did not become ready within $TimeoutSeconds seconds."
}

function Stop-LocalDemoObjectStorageOwnedProcess {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][ValidateRange(1, 65535)][int]$ServerPort,
        [Parameter(Mandatory)][ValidateRange(1, 65535)][int]$ConsolePort,
        [ValidateRange(0, 300)][int]$WaitTimeoutSeconds = 10,
        [scriptblock]$StopAction
    )

    $state = Get-LocalDemoObjectStorageState
    if ($null -eq $state) { return $false }
    foreach ($property in @('processId', 'startedAt', 'serverPort', 'consolePort')) {
        if ($null -eq $state.PSObject.Properties[$property]) {
            throw 'The local object-storage state is incomplete; no process was stopped and state was retained.'
        }
    }
    if ([int]$state.serverPort -ne $ServerPort -or [int]$state.consolePort -ne $ConsolePort) {
        throw 'The requested object-storage ports do not match recorded ownership; no process was stopped.'
    }

    $identity = Get-LocalDemoProcessIdentity -ProcessId ([int]$state.processId)
    if ($null -eq $identity) {
        Remove-LocalDemoObjectStorageState
        return $false
    }
    if (-not (Test-LocalDemoProcessIdentity -Identity $state)) {
        throw 'The recorded MinIO PID exists with a different start time; it is not owned by this local demo tool and state was retained.'
    }

    if ($null -eq $StopAction) {
        Stop-Process -Id ([int]$state.processId) -Force -ErrorAction SilentlyContinue
    } else {
        & $StopAction ([int]$state.processId)
    }

    $deadline = (Get-Date).AddSeconds($WaitTimeoutSeconds)
    $remaining = $true
    do {
        $remaining = $null -ne (Get-LocalDemoProcessIdentity -ProcessId ([int]$state.processId))
        if (-not $remaining) { break }
        if ((Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
    } while ((Get-Date) -lt $deadline)
    if ($remaining) {
        throw 'The recorded MinIO process did not stop; state was retained and data cleanup was refused.'
    }
    Remove-LocalDemoObjectStorageState
    return $true
}

function Clear-LocalDemoObjectStorageData {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$DataPath)

    $guardedPath = Assert-LocalDemoObjectStorageDataPath -DataPath $DataPath
    if (Test-Path -LiteralPath $guardedPath) {
        Remove-Item -LiteralPath $guardedPath -Recurse -Force
    }
}

function Assert-LocalDemoPresignedUrl {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Url,
        [Parameter(Mandatory)][string]$SecretAccessKey
    )

    try { $uri = [Uri]$Url } catch { throw 'The API returned an invalid presigned URL.' }
    if ($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or $uri.Port -ne 9000) {
        throw 'The presigned URL is not reachable through the Android-facing MinIO endpoint http://127.0.0.1:9000.'
    }
    if ($uri.UserInfo) { throw 'The presigned URL contains embedded credentials.' }
    if ($uri.AbsoluteUri.Contains($SecretAccessKey)) { throw 'The presigned URL contains the configured secret access key.' }
    if ($uri.AbsoluteUri -match '(?i)(?:access[_-]?key|secret[_-]?access[_-]?key)\s*=') {
        throw 'The presigned URL contains a raw access or secret key parameter.'
    }
    if ($uri.Query -notmatch '(?i)(?:^|[?&])X-Amz-Signature=') {
        throw 'The API response is not a SigV4 presigned URL.'
    }
    return $uri
}
