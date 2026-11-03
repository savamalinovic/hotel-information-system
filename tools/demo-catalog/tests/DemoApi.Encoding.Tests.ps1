$ErrorActionPreference = 'Stop'
function Invoke-RestMethod {
    param($Method,$Uri,$Headers,$ContentType,$Body,$MaximumRedirection,$TimeoutSec,$ErrorAction)
    $script:capturedBody = $Body
    $script:capturedType = $ContentType
    return [pscustomobject]@{ accepted=$true }
}
foreach ($name in @('local-demo\LocalDemo.Common.ps1','remote-demo\RemoteDemo.Common.ps1')) {
    . (Join-Path $PSScriptRoot "..\..\$name")
    $text = 'Sredstva za čišćenje i Vešeraj i posteljina'
    [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl 'http://localhost:8080/api/v1' -Path '/expense-categories' -Token 'private-test-value' -Body @{name=$text})
    if ($script:capturedType -ne 'application/json; charset=utf-8' -or $script:capturedBody -isnot [byte[]]) { throw "Explicit UTF-8 JSON transport missing in $name." }
    $decoded = [Text.Encoding]::UTF8.GetString($script:capturedBody) | ConvertFrom-Json
    if ($decoded.name -cne $text) { throw "Unicode catalog text was altered in $name." }
}
Write-Host 'PASS: local and remote API requests preserve Serbian text as explicit UTF-8 JSON bytes.'
