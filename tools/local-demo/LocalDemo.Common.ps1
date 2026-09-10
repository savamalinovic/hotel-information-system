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
