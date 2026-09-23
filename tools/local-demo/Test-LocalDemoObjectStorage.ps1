[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'http://127.0.0.1:8080/api/v1',
    [string]$DemoPassword,
    [string]$ManagerEmail
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')
. (Join-Path $PSScriptRoot 'LocalDemo.ObjectStorage.Common.ps1')

$required = @(
    'BLUESTARS_AWS_REGION',
    'BLUESTARS_AWS_ENDPOINT',
    'BLUESTARS_AWS_PATH_STYLE_ACCESS_ENABLED',
    'BLUESTARS_AWS_ACCESS_KEY_ID',
    'BLUESTARS_AWS_SECRET_ACCESS_KEY',
    'BLUESTARS_AWS_BUCKET'
)
$missing = @($required | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_, 'Process')) })
if ($missing.Count -gt 0) {
    Write-Host 'SKIPPED: object storage is not completely configured in this process.'
    exit 0
}

function Invoke-LocalDemoMultipartUpload {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Uri,
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string]$PartName,
        [Parameter(Mandatory)][string]$ContentType
    )

    $client = [Net.Http.HttpClient]::new()
    $multipart = [Net.Http.MultipartFormDataContent]::new()
    $request = $null
    $response = $null
    try {
        $bytes = [IO.File]::ReadAllBytes($FilePath)
        $fileContent = [Net.Http.ByteArrayContent]::new($bytes)
        $fileContent.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse($ContentType)
        $multipart.Add($fileContent, $PartName, [IO.Path]::GetFileName($FilePath))
        $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, $Uri)
        $request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
        $request.Content = $multipart
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) {
            throw "Multipart upload failed with HTTP $([int]$response.StatusCode)."
        }
        return $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
    } finally {
        if ($null -ne $response) { $response.Dispose() }
        if ($null -ne $request) { $request.Dispose() }
        $multipart.Dispose()
        $client.Dispose()
    }
}

function Get-LocalDemoDownloadedBytes {
    [CmdletBinding()]
    param([Parameter(Mandatory)][Uri]$Uri)

    $client = [Net.Http.HttpClient]::new()
    $response = $null
    try {
        $response = $client.GetAsync($Uri).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) { throw "Presigned download failed with HTTP $([int]$response.StatusCode)." }
        return $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    } finally {
        if ($null -ne $response) { $response.Dispose() }
        $client.Dispose()
    }
}

function Assert-LocalDemoBytesEqual {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][byte[]]$Actual,
        [Parameter(Mandatory)][byte[]]$Expected,
        [Parameter(Mandatory)][string]$Resource
    )

    if ($Actual.Length -ne $Expected.Length) { throw "Downloaded $Resource content did not match the uploaded content." }
    for ($index = 0; $index -lt $Expected.Length; $index++) {
        if ($Actual[$index] -ne $Expected[$index]) { throw "Downloaded $Resource content did not match the uploaded content." }
    }
}

function Assert-LocalDemoUploadedObject {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Response,
        [Parameter(Mandatory)][byte[]]$Expected,
        [Parameter(Mandatory)][string]$Resource,
        [Parameter(Mandatory)][string]$SecretAccessKey
    )

    $url = if ($Response.PSObject.Properties['downloadUrl']) { $Response.downloadUrl } else { $Response.url }
    if ([string]::IsNullOrWhiteSpace($url)) { throw "$Resource upload response did not contain a download URL." }
    $presigned = Assert-LocalDemoPresignedUrl -Url $url -SecretAccessKey $SecretAccessKey
    Assert-LocalDemoBytesEqual -Actual (Get-LocalDemoDownloadedBytes -Uri $presigned) -Expected $Expected -Resource $Resource
    return $presigned.AbsoluteUri
}

function New-LocalDemoSmokeFile {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][byte[]]$Bytes
    )

    $path = Join-Path ([IO.Path]::GetTempPath()) "$Name-$([Guid]::NewGuid().ToString('N'))"
    [IO.File]::WriteAllBytes($path, $Bytes)
    return $path
}

$pictureFile = $null
$taskFile = $null
$damageFile = $null
try {
    $configuration = Get-LocalDemoObjectStorageConfiguration -BucketName (Get-LocalDemoValue -Value $null -EnvironmentName 'BLUESTARS_AWS_BUCKET' -Label 'BLUESTARS_AWS_BUCKET')
    $ApiBaseUrl = Resolve-LocalDemoApiBaseUrl $ApiBaseUrl
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = Get-LocalDemoValue -Value $ManagerEmail -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email'
    $login = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{ email = $ManagerEmail; password = $DemoPassword }
    $token = $login.token

    $apartments = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $token
    $apartment = $apartments | Select-Object -First 1
    if ($null -eq $apartment) { throw 'No seeded apartment is available for the object-storage smoke.' }
    $tasks = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/tasks' -Token $token
    $task = $tasks | Select-Object -First 1
    if ($null -eq $task) { throw 'No seeded task is available for the object-storage smoke.' }

    $damage = $null
    $damageApartment = $null
    foreach ($candidateApartment in $apartments) {
        $candidateDamage = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($candidateApartment.apartmentId)/damages" -Token $token | Select-Object -First 1
        if ($null -ne $candidateDamage) {
            $damage = $candidateDamage
            $damageApartment = $candidateApartment
            break
        }
    }
    if ($null -eq $damage) { throw 'No seeded damage is available for the object-storage smoke.' }

    $pictureBytes = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    $taskBytes = [Text.Encoding]::UTF8.GetBytes("local-demo-task-$([Guid]::NewGuid().ToString('N'))")
    $damageBytes = [Text.Encoding]::UTF8.GetBytes("local-demo-damage-$([Guid]::NewGuid().ToString('N'))")
    $pictureFile = New-LocalDemoSmokeFile -Name 'bluestars-apartment-picture.png' -Bytes $pictureBytes
    $taskFile = New-LocalDemoSmokeFile -Name 'bluestars-task-attachment.txt' -Bytes $taskBytes
    $damageFile = New-LocalDemoSmokeFile -Name 'bluestars-damage-attachment.txt' -Bytes $damageBytes

    $picture = Invoke-LocalDemoMultipartUpload -Uri (Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($apartment.apartmentId)/pictures") -Token $token -FilePath $pictureFile -PartName 'picture' -ContentType 'image/png'
    [void](Assert-LocalDemoUploadedObject -Response $picture -Expected $pictureBytes -Resource 'apartment picture' -SecretAccessKey $configuration.SecretAccessKey)
    $apartmentAfterUpload = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($apartment.apartmentId)" -Token $token
    $listedPicture = @($apartmentAfterUpload.pictures | Where-Object { $_.pictureId -eq $picture.pictureId }) | Select-Object -First 1
    if ($null -eq $listedPicture) { throw 'Apartment picture was not returned by the apartment details endpoint after upload.' }
    [void](Assert-LocalDemoPresignedUrl -Url $listedPicture.url -SecretAccessKey $configuration.SecretAccessKey)
    Write-Host 'PASS: apartment picture upload, presigned fetch, and API listing succeeded.'

    $taskUpload = Invoke-LocalDemoMultipartUpload -Uri (Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($task.taskId)/attachments") -Token $token -FilePath $taskFile -PartName 'file' -ContentType 'text/plain'
    [void](Assert-LocalDemoUploadedObject -Response $taskUpload -Expected $taskBytes -Resource 'task attachment' -SecretAccessKey $configuration.SecretAccessKey)
    $listedTaskAttachment = @((Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($task.taskId)/attachments" -Token $token) | Where-Object { $_.id -eq $taskUpload.id }) | Select-Object -First 1
    if ($null -eq $listedTaskAttachment) { throw 'Task attachment was not returned by the task attachment endpoint after upload.' }
    [void](Assert-LocalDemoUploadedObject -Response $listedTaskAttachment -Expected $taskBytes -Resource 'task attachment listing' -SecretAccessKey $configuration.SecretAccessKey)
    Write-Host 'PASS: task attachment upload and download succeeded.'

    $damageUpload = Invoke-LocalDemoMultipartUpload -Uri (Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($damageApartment.apartmentId)/damages/$($damage.damageId)/attachments") -Token $token -FilePath $damageFile -PartName 'file' -ContentType 'text/plain'
    [void](Assert-LocalDemoUploadedObject -Response $damageUpload -Expected $damageBytes -Resource 'damage attachment' -SecretAccessKey $configuration.SecretAccessKey)
    $listedDamageAttachment = @((Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($damageApartment.apartmentId)/damages/$($damage.damageId)/attachments" -Token $token) | Where-Object { $_.damageAttachmentId -eq $damageUpload.damageAttachmentId }) | Select-Object -First 1
    if ($null -eq $listedDamageAttachment) { throw 'Damage attachment was not returned by the damage attachment endpoint after upload.' }
    [void](Assert-LocalDemoUploadedObject -Response $listedDamageAttachment -Expected $damageBytes -Resource 'damage attachment listing' -SecretAccessKey $configuration.SecretAccessKey)
    Write-Host 'PASS: damage attachment upload and download succeeded.'
    Write-Host 'PASS: all presigned URLs used http://127.0.0.1:9000 and no raw secret credential was exposed.'
} catch {
    Write-Error "FAIL: object-storage smoke - $($_.Exception.Message)"
    exit 1
} finally {
    foreach ($file in @($pictureFile, $taskFile, $damageFile)) {
        if ($file) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
    }
}
