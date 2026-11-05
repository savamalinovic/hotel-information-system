Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Get-DemoApartmentMedia {
    param([Parameter(Mandatory)][string]$Name)
    if ($Name -eq 'C301') { return @('family.jpg','family-bedroom.jpg','family-kitchen.jpg') }
    if ($Name.StartsWith('A')) { return @('studio.jpg') }
    if ($Name.StartsWith('B')) { return @('double.jpg') }
    if ($Name.StartsWith('C')) { return @('family.jpg') }
    throw 'Unknown apartment media mapping.'
}

function Get-DemoBytesHash {
    param([Parameter(Mandatory)][byte[]]$Bytes)
    $hash = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($hash.ComputeHash($Bytes)).Replace('-','').ToLowerInvariant() } finally { $hash.Dispose() }
}

function Get-DemoSourceMedia {
    $assets = Join-Path $PSScriptRoot 'assets'
    $manifest = Get-Content -Raw -LiteralPath (Join-Path $assets 'manifest.json') | ConvertFrom-Json
    $result = @{}
    foreach ($name in @('studio.jpg','double.jpg','family.jpg','family-bedroom.jpg','family-kitchen.jpg')) {
        $entry = @($manifest.images | Where-Object name -ceq $name)
        if ($entry.Count -ne 1) { throw "Missing or duplicate source media manifest entry: $name." }
        $bytes = [IO.File]::ReadAllBytes((Join-Path $assets $name))
        if ($bytes.Length -gt 500KB -or $bytes.Length -lt 10KB -or $bytes[0] -ne 255 -or $bytes[1] -ne 216) { throw "Source media must be an optimized JPEG: $name." }
        $hash = Get-DemoBytesHash $bytes
        if ($hash -cne $entry[0].sha256) { throw "Source media checksum mismatch: $name." }
        $result[$name] = @{ path=(Join-Path $assets $name); hash=$hash }
    }
    return $result
}

function Assert-DemoMediaUrl {
    param([Parameter(Mandatory)][string]$Url)
    $uri = $null
    if (-not [Uri]::TryCreate($Url, [UriKind]::Absolute, [ref]$uri) -or $uri.UserInfo -or $uri.Fragment -or
        $uri.Query -notmatch '(?i)(?:[?&])X-Amz-Signature=' -or $uri.Query -notmatch '(?i)(?:[?&])X-Amz-Expires=') { throw 'Media response did not contain a private presigned URL.' }
    if (([Uri]$ApiBaseUrl).Scheme -eq 'https') {
        if ($uri.Scheme -cne 'https' -or $uri.DnsSafeHost -notmatch '^[a-z0-9]+\.r2\.cloudflarestorage\.com$' -or $uri.Port -ne 443) { throw 'Remote media must use the private HTTPS R2 endpoint.' }
    } elseif ($uri.Scheme -ne 'http' -or $uri.DnsSafeHost -notin @('localhost','127.0.0.1')) { throw 'Local demo media must use local object storage.' }
    return $uri
}

function Get-DemoMediaHash {
    param([Parameter(Mandatory)][string]$Url)
    $uri = Assert-DemoMediaUrl $Url
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(30)
    $client.MaxResponseContentBufferSize = 10MB
    $response = $null
    try {
        # The storage request intentionally carries no API authorization header.
        $response = $client.GetAsync($uri).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) { throw 'download status' }
        $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        return Get-DemoBytesHash $bytes
    } catch { throw 'Private media download failed; retry the seed to reacquire fresh signed URLs. The result was not confirmed.' }
    finally { if ($null -ne $response) { $response.Dispose() }; $client.Dispose() }
}

function Send-DemoApartmentPicture {
    param([Parameter(Mandatory)][int]$ApartmentId, [Parameter(Mandatory)][string]$FilePath, [Parameter(Mandatory)][string]$Token)
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(60)
    $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, "$ApiBaseUrl/apartments/$ApartmentId/pictures")
    $request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
    $multipart = [Net.Http.MultipartFormDataContent]::new()
    $content = [Net.Http.ByteArrayContent]::new([IO.File]::ReadAllBytes($FilePath))
    $content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse('image/jpeg')
    $multipart.Add($content, 'picture', [IO.Path]::GetFileName($FilePath))
    $request.Content = $multipart
    $response = $null
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) { throw 'upload status' }
        return $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
    } catch { throw 'Apartment photo upload was not confirmed. Rerun the seed; it compares existing content before uploading again.' }
    finally { if ($null -ne $response) { $response.Dispose() }; $request.Dispose(); $client.Dispose() }
}

function Confirm-DemoApartmentPictures {
    param([Parameter(Mandatory)]$Apartment, [Parameter(Mandatory)][hashtable]$Sources, [Parameter(Mandatory)][string]$Token, [switch]$UploadMissing)
    $detail = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($Apartment.apartmentId)" -Token $Token
    $hashes = @{}
    foreach ($picture in @($detail.pictures)) {
        $hash = Get-DemoMediaHash $picture.url
        if ($hashes.ContainsKey($hash)) { throw "Duplicate image content in apartment $($Apartment.name); review it without deleting user data." }
        $hashes[$hash] = $true
    }
    foreach ($name in @(Get-DemoApartmentMedia $Apartment.name)) {
        $source = $Sources[$name]
        if ($hashes.ContainsKey($source.hash)) { continue }
        if (-not $UploadMissing) { throw "Missing expected gallery image in apartment $($Apartment.name)." }
        $uploaded = Send-DemoApartmentPicture -ApartmentId $Apartment.apartmentId -FilePath $source.path -Token $Token
        if ((Get-DemoMediaHash $uploaded.url) -cne $source.hash) { throw "Uploaded photo content verification failed for apartment $($Apartment.name)." }
        $hashes[$source.hash] = $true
        Write-LocalDemoStatus -Status 'created' -Resource "apartment $($Apartment.name) photo $name"
    }
    Write-LocalDemoStatus -Status 'already exists' -Resource "verified apartment $($Apartment.name) gallery"
}
