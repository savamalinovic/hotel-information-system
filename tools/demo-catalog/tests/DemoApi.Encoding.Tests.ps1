$ErrorActionPreference = 'Stop'
function Invoke-WebRequest {
    param($Method,$Uri,$Headers,$ContentType,$Body,$MaximumRedirection,$TimeoutSec,$ErrorAction,[switch]$UseBasicParsing)
    $script:capturedBody = $Body
    $script:capturedType = $ContentType
    $bytes = [Text.Encoding]::UTF8.GetBytes($script:responseJson)
    if ($null -ne $script:responseBytes) { $bytes = $script:responseBytes }
    return [pscustomobject]@{
        RawContentStream=[IO.MemoryStream]::new($bytes)
        Content=[Text.Encoding]::GetEncoding(1252).GetString($bytes)
        Headers=@{'Content-Type'='application/json'}
    }
}
foreach ($name in @('local-demo\LocalDemo.Common.ps1','remote-demo\RemoteDemo.Common.ps1')) {
    $script:responseBytes = $null
    . (Join-Path $PSScriptRoot "..\..\$name")
    $text = 'Sredstva za čišćenje i Vešeraj i posteljina'
    $script:responseJson = @{name=$text} | ConvertTo-Json -Compress
    $result = Invoke-LocalDemoApi -Method POST -ApiBaseUrl 'http://localhost:8080/api/v1' -Path '/expense-categories' -Token 'private-test-value' -Body @{name=$text}
    if ($script:capturedType -ne 'application/json; charset=utf-8' -or $script:capturedBody -isnot [byte[]]) { throw "Explicit UTF-8 JSON transport missing in $name." }
    $decoded = [Text.Encoding]::UTF8.GetString($script:capturedBody) | ConvertFrom-Json
    if ($decoded.name -cne $text) { throw "Unicode catalog text was altered in $name." }
    if ($result.name -cne $text) { throw "UTF-8 JSON response without a charset was decoded incorrectly in $name." }
    $script:responseJson = '[{"name":"' + $text + '"}]'
    $rows = @(Invoke-LocalDemoApi -Method GET -ApiBaseUrl 'http://localhost:8080/api/v1' -Path '/expense-categories' -Token 'private-test-value')
    if ($rows.Count -ne 1 -or $rows[0].name -cne $text) { throw "Unicode collection response was altered in $name." }
    $script:responseJson = ''
    $empty = Invoke-LocalDemoApi -Method DELETE -ApiBaseUrl 'http://localhost:8080/api/v1' -Path '/example' -Token 'private-test-value'
    if ($null -ne $empty) { throw "Empty API response was not preserved in $name." }
    foreach ($invalid in @('json','utf8')) {
        $script:responseJson = '{"private-json-body":'
        $script:responseBytes = if ($invalid -eq 'utf8') { [byte[]]@(195,40) } else { $null }
        $failed = $false
        try { [void](Invoke-LocalDemoApi -Method GET -ApiBaseUrl 'http://localhost:8080/api/v1' -Path '/example' -Token 'private-test-value') }
        catch {
            $failed = $true
            if (-not $_.Exception.Message.StartsWith('API request GET /example failed') -or $_.Exception.Message.Contains('private-json-body')) { throw "Malformed response did not use the safe API error in $name." }
        }
        if (-not $failed) { throw "Malformed $invalid response was accepted in $name." }
    }
}
Write-Host 'PASS: local and remote API requests and charset-less JSON responses preserve Serbian text; collections and empty responses remain supported.'
