Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RemoteDemoApiBaseUrl {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$ApiBaseUrl, [string]$AllowedHost)

    $uri = $null
    if (-not [Uri]::TryCreate($ApiBaseUrl, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -cne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or
        $uri.AbsolutePath -cne '/api/v1' -or $uri.Port -ne 443 -or
        $ApiBaseUrl -cne $uri.AbsoluteUri.TrimEnd('/')) {
        throw 'Provide an explicit canonical HTTPS URL ending in /api/v1, without port, credentials, query, or fragment.'
    }
    $hostName = $uri.DnsSafeHost.ToLowerInvariant()
    $ipAddress = $null
    if ([Net.IPAddress]::TryParse($hostName, [ref]$ipAddress)) { throw 'The API host must be a public DNS name, not an IP address.' }
    if ($hostName -notmatch '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$' -or
        $hostName -eq 'localhost' -or $hostName.EndsWith('.localhost') -or $hostName.EndsWith('.local') -or
        $hostName.EndsWith('.internal') -or $hostName.EndsWith('.test') -or $hostName.EndsWith('.invalid')) {
        throw 'The API host must be a public DNS name.'
    }
    if ($hostName -notmatch '^[a-z0-9-]+\.up\.railway\.app$') {
        if ([string]::IsNullOrWhiteSpace($AllowedHost) -or $hostName -cne $AllowedHost.ToLowerInvariant()) {
            throw 'Only a Railway *.up.railway.app host is allowed by default; use -AllowedHost for one explicitly approved HTTPS DNS host.'
        }
    }
    $addresses = @([Net.Dns]::GetHostAddresses($hostName))
    if ($addresses.Count -eq 0) { throw 'The API host has no DNS address.' }
    foreach ($address in $addresses) {
        if ($address.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork) {
            $b = $address.GetAddressBytes()
            if ($b[0] -eq 0 -or $b[0] -eq 10 -or $b[0] -eq 127 -or $b[0] -ge 224 -or
                ($b[0] -eq 100 -and $b[1] -ge 64 -and $b[1] -le 127) -or
                ($b[0] -eq 169 -and $b[1] -eq 254) -or ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) -or
                ($b[0] -eq 192 -and $b[1] -eq 168) -or ($b[0] -eq 192 -and $b[1] -eq 0) -or
                ($b[0] -eq 192 -and $b[1] -eq 0 -and $b[2] -eq 2) -or
                ($b[0] -eq 198 -and $b[1] -in @(18,19,51)) -or
                ($b[0] -eq 203 -and $b[1] -eq 0 -and $b[2] -eq 113)) { throw 'API host resolves to a non-public address.' }
        } elseif ($address.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetworkV6) {
            $b = $address.GetAddressBytes()
            if ([Net.IPAddress]::IsLoopback($address) -or $address.IsIPv6LinkLocal -or $address.IsIPv6SiteLocal -or
                ($b[0] -band 0xfe) -eq 0xfc -or $b[0] -eq 0xff -or
                ($b[0] -eq 0x20 -and $b[1] -eq 0x01 -and $b[2] -eq 0x0d -and $b[3] -eq 0xb8) -or
                $address.IsIPv4MappedToIPv6) { throw 'API host resolves to a non-public address.' }
        } else { throw 'API host has an unsupported address family.' }
    }
    return $uri.AbsoluteUri
}

function Assert-RemoteDemoTarget {
    param([Parameter(Mandatory)][string]$ApiBaseUrl, [string]$AllowedHost, [string]$ConfirmHost)
    $base = Resolve-RemoteDemoApiBaseUrl -ApiBaseUrl $ApiBaseUrl -AllowedHost $AllowedHost
    $hostName = ([Uri]$base).DnsSafeHost
    if ($ConfirmHost -cne $hostName) {
        throw "Before any write, repeat the exact target host with -ConfirmHost '$hostName'."
    }
    return $base
}

function Get-RemoteDemoSecret([string]$Name) {
    $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) { throw "$Name must be set in the current process environment." }
    return $value
}

function Invoke-LocalDemoApi {
    [CmdletBinding()]
    param([Parameter(Mandatory)][ValidateSet('GET','POST','PUT','PATCH','DELETE')][string]$Method,
          [Parameter(Mandatory)][string]$ApiBaseUrl, [Parameter(Mandatory)][string]$Path,
          [string]$Token, [object]$Body)
    $headers = @{}
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $request = @{ Method=$Method; Uri="$ApiBaseUrl$Path"; Headers=$headers; ErrorAction='Stop';
                  MaximumRedirection=0; TimeoutSec=30 }
    if ($PSBoundParameters.ContainsKey('Body')) {
        $request.ContentType = 'application/json'
        $request.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }
    try { return Invoke-RestMethod @request }
    catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'network' }
        throw "API request $Method $Path failed (HTTP $status). Check the target and existing data."
    }
}

function Get-LocalDemoPagedContent {
    param([string]$ApiBaseUrl, [string]$Path, [string]$Token)
    $page = 0; $all = @()
    do {
        $separator = if ($Path.Contains('?')) { '&' } else { '?' }
        $response = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "${Path}${separator}page=$page&size=100" -Token $Token
        $all += @($response.content)
        $page++
    } while ($page -lt [int]$response.totalPages)
    return $all
}

function ConvertTo-LocalDemoMoney([decimal]$Value) {
    return $Value.ToString('0.00', [Globalization.CultureInfo]::InvariantCulture)
}

function Write-LocalDemoStatus([string]$Status, [string]$Resource) {
    Write-Host "${Status}: $Resource"
}
