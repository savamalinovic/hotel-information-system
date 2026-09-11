Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-LocalDemoValue {
    [CmdletBinding()]
    param(
        [AllowEmptyString()][string]$Value,
        [Parameter(Mandatory)][string]$EnvironmentName,
        [Parameter(Mandatory)][string]$Label
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    $environmentValue = [Environment]::GetEnvironmentVariable($EnvironmentName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($environmentValue)) {
        return $environmentValue
    }

    throw "$Label is required. Provide it as a parameter or set $EnvironmentName."
}

function Assert-LocalDemoHost {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$HostName)

    if ($HostName -notin @('127.0.0.1', 'localhost')) {
        throw "Only localhost or 127.0.0.1 is allowed for local demo tools; received '$HostName'."
    }
}

function Assert-LocalDemoDatabaseName {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$DatabaseName)

    $normalized = $DatabaseName.Trim().ToLowerInvariant()
    $protectedNames = @('postgres', 'template0', 'template1', 'hotel', 'efikas', 'bluestars')
    if ($normalized -in $protectedNames) {
        throw "Database '$DatabaseName' is protected and cannot be used by local demo tools."
    }
    if ($normalized -notmatch '^[a-z][a-z0-9_]{0,62}$') {
        throw "Database '$DatabaseName' is not a safe PostgreSQL identifier."
    }
    if ($normalized -notmatch '(^|_)(demo|test)(_|$)') {
        throw "Database '$DatabaseName' must contain a clear demo or test marker."
    }
    return $normalized
}

function Resolve-LocalDemoPsql {
    [CmdletBinding()]
    param(
        [string]$PsqlPath,
        [string]$PostgreSqlRoot = 'C:\Program Files\PostgreSQL'
    )

    function Assert-PsqlExecutable([string]$Candidate, [string]$Source) {
        if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
            throw "PostgreSQL client from $Source does not exist: $Candidate"
        }
        $item = Get-Item -LiteralPath $Candidate
        if ($item.Name -ine 'psql.exe') {
            throw "PostgreSQL client from $Source must be named psql.exe: $Candidate"
        }
        try {
            & $item.FullName '--version' *> $null
            if ($LASTEXITCODE -ne 0) { throw 'non-zero exit code' }
        } catch {
            throw "PostgreSQL client from $Source cannot be executed: $Candidate"
        }
        return $item.FullName
    }

    if (-not [string]::IsNullOrWhiteSpace($PsqlPath)) {
        return Assert-PsqlExecutable -Candidate $PsqlPath -Source 'the explicit -PsqlPath parameter'
    }

    $pathCommand = Get-Command psql.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $pathCommand) {
        return Assert-PsqlExecutable -Candidate $pathCommand.Source -Source 'PATH'
    }

    if (Test-Path -LiteralPath $PostgreSqlRoot -PathType Container) {
        $candidates = foreach ($directory in Get-ChildItem -LiteralPath $PostgreSqlRoot -Directory) {
            if ($directory.Name -notmatch '^\d+(?:\.\d+){0,3}$') { continue }
            $versionText = if ($directory.Name -notmatch '\.') { "$($directory.Name).0" } else { $directory.Name }
            try { $version = [Version]::Parse($versionText) } catch { continue }
            $candidatePath = Join-Path $directory.FullName 'bin\psql.exe'
            if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
                [pscustomobject]@{ Version = $version; Path = $candidatePath }
            }
        }
        $candidates = @($candidates | Sort-Object Version -Descending)
        if ($candidates) {
            return Assert-PsqlExecutable -Candidate $candidates[0].Path -Source 'the standard PostgreSQL installation directory'
        }
    }

    throw 'PostgreSQL client psql.exe was not found. Install PostgreSQL client tools, add psql.exe to PATH, or pass -PsqlPath.'
}

function Get-LocalDemoStatePath {
    Join-Path ([IO.Path]::GetTempPath()) 'bluestars-local-demo-backend-state.json'
}

function Get-LocalDemoProcessIdentity {
    param([Parameter(Mandatory)][int]$ProcessId)
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction Stop
        return [pscustomobject]@{ processId = $ProcessId; startedAt = $process.StartTime.ToUniversalTime().ToString('o') }
    } catch {
        return $null
    }
}

function Test-LocalDemoProcessIdentity {
    param([Parameter(Mandatory)]$Identity)
    $actual = Get-LocalDemoProcessIdentity -ProcessId ([int]$Identity.processId)
    if ($null -eq $actual) { return $false }
    return ([datetime]$actual.startedAt).ToUniversalTime().Ticks -eq ([datetime]$Identity.startedAt).ToUniversalTime().Ticks
}

function Get-LocalDemoProcessTree {
    param([Parameter(Mandatory)][int]$RootProcessId)
    $allProcesses = @(Get-CimInstance Win32_Process)
    $pending = [System.Collections.Generic.Queue[int]]::new()
    $pending.Enqueue($RootProcessId)
    $ids = [System.Collections.Generic.List[int]]::new()
    while ($pending.Count -gt 0) {
        $current = $pending.Dequeue()
        if ($ids.Contains($current)) { continue }
        $ids.Add($current)
        foreach ($child in $allProcesses | Where-Object { [int]$_.ParentProcessId -eq $current }) {
            $pending.Enqueue([int]$child.ProcessId)
        }
    }
    return @($ids | ForEach-Object { Get-LocalDemoProcessIdentity -ProcessId $_ } | Where-Object { $null -ne $_ })
}

function Get-LocalDemoProcessState {
    $statePath = Get-LocalDemoStatePath
    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) { return $null }
    try { return Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json } catch { Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue; return $null }
}

function Save-LocalDemoProcessState {
    param([Parameter(Mandatory)]$State)
    $statePath = Get-LocalDemoStatePath
    $temporaryPath = "$statePath.$([Guid]::NewGuid().ToString('N')).tmp"
    $State | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $temporaryPath -Encoding UTF8 -NoNewline
    Move-Item -LiteralPath $temporaryPath -Destination $statePath -Force
}

function Remove-LocalDemoProcessState {
    Remove-Item -LiteralPath (Get-LocalDemoStatePath) -Force -ErrorAction SilentlyContinue
}

function Initialize-LocalDemoProcessState {
    param([Parameter(Mandatory)][int]$LauncherProcessId)
    $existing = Get-LocalDemoProcessState
    if ($null -ne $existing) {
        $live = @($existing.ownedProcesses | Where-Object { Test-LocalDemoProcessIdentity $_ })
        if ($live.Count -gt 0) { throw 'A backend process previously started by this local demo tool is still recorded. Stop it with Stop-DemoBackend.ps1 first.' }
        Remove-LocalDemoProcessState
    }
    $launcher = Get-LocalDemoProcessIdentity -ProcessId $LauncherProcessId
    if ($null -eq $launcher) { throw 'The backend launcher process ended before ownership state could be recorded.' }
    $state = [pscustomobject]@{ launcher = $launcher; ownedProcesses = @($launcher) }
    Save-LocalDemoProcessState -State $state
    return $state
}

function Update-LocalDemoProcessStateTree {
    param([Parameter(Mandatory)]$State)
    $tree = Get-LocalDemoProcessTree -RootProcessId ([int]$State.launcher.processId)
    if ($tree.Count -gt 0) {
        $State.ownedProcesses = @($tree)
        Save-LocalDemoProcessState -State $State
    }
}

function Stop-LocalDemoOwnedProcess {
    [CmdletBinding()]
    param()
    $state = Get-LocalDemoProcessState
    if ($null -eq $state) { return $false }
    $owned = @($state.ownedProcesses | Where-Object { Test-LocalDemoProcessIdentity $_ })
    if ($owned.Count -eq 0) { Remove-LocalDemoProcessState; return $false }
    foreach ($identity in @($owned | Sort-Object { [int]$_.processId } -Descending)) {
        Stop-Process -Id ([int]$identity.processId) -Force -ErrorAction SilentlyContinue
    }
    Remove-LocalDemoProcessState
    return $true
}

function Resolve-LocalDemoApiBaseUrl {
    [CmdletBinding()]
    param([string]$ApiBaseUrl = 'http://127.0.0.1:8080/api/v1')

    try {
        $uri = [Uri]$ApiBaseUrl
    } catch {
        throw "API base URL is invalid."
    }

    if ($uri.Scheme -ne 'http') {
        throw "Only the local HTTP demo API is allowed."
    }
    Assert-LocalDemoHost -HostName $uri.Host
    if ($uri.UserInfo -or $uri.Query -or $uri.Fragment) {
        throw "API base URL must not contain credentials, a query, or a fragment."
    }

    $path = $uri.AbsolutePath.TrimEnd('/')
    if ([string]::IsNullOrEmpty($path)) {
        $path = '/api/v1'
    }
    if ($path -ne '/api/v1') {
        throw "API base URL must use the /api/v1 contract path."
    }

    return "http://$($uri.Host):$($uri.Port)$path"
}

function Get-LocalDemoApiUri {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$ApiBaseUrl,
        [Parameter(Mandatory)][string]$Path
    )

    $base = Resolve-LocalDemoApiBaseUrl -ApiBaseUrl $ApiBaseUrl
    if (-not $Path.StartsWith('/')) {
        $Path = "/$Path"
    }
    return "$base$Path"
}

function Invoke-LocalDemoApi {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][ValidateSet('GET', 'POST', 'PUT', 'PATCH')][string]$Method,
        [Parameter(Mandatory)][string]$ApiBaseUrl,
        [Parameter(Mandatory)][string]$Path,
        [string]$Token,
        [object]$Body
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers.Authorization = "Bearer $Token"
    }

    $request = @{
        Method = $Method
        Uri = Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path $Path
        Headers = $headers
        ErrorAction = 'Stop'
    }
    if ($PSBoundParameters.ContainsKey('Body')) {
        $request.ContentType = 'application/json'
        $request.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }

    try {
        return Invoke-RestMethod @request
    } catch {
        $status = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        $suffix = if ($null -ne $status) { " (HTTP $status)" } else { '' }
        throw "API request $Method $Path failed$suffix. Review the local backend log for a safe server-side error."
    }
}

function Get-LocalDemoPagedContent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$ApiBaseUrl,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Token
    )

    $page = 0
    $all = @()
    do {
        $separator = if ($Path.Contains('?')) { '&' } else { '?' }
        $response = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "${Path}${separator}page=$page&size=100" -Token $Token
        $all += @($response.content)
        $page++
    } while ($page -lt [int]$response.totalPages)
    return $all
}

function Invoke-LocalDemoEnsure {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][scriptblock]$Lookup,
        [Parameter(Mandatory)][scriptblock]$Create
    )

    $existing = & $Lookup
    if ($null -ne $existing) {
        return [pscustomobject]@{ Status = 'already exists'; Value = $existing }
    }
    return [pscustomobject]@{ Status = 'created'; Value = (& $Create) }
}

function Write-LocalDemoStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][ValidateSet('created', 'already exists', 'updated', 'failed')][string]$Status,
        [Parameter(Mandatory)][string]$Resource
    )
    Write-Host "${Status}: $Resource"
}
