[CmdletBinding()]
param([string]$ApiBaseUrl='http://127.0.0.1:8080/api/v1',[string]$DemoPassword,[string]$ManagerEmail)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')
$required=@('AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_S3_BUCKET')
if(@($required|Where-Object {[string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_,'Process'))}).Count -gt 0){Write-Host 'SKIPPED: object storage is not configured in this process.';exit 0}
$tempFile=$null
try {
    $ApiBaseUrl=Resolve-LocalDemoApiBaseUrl $ApiBaseUrl
    $DemoPassword=Get-LocalDemoValue $DemoPassword 'BLUESTARS_DEMO_PASSWORD' 'Demo password'
    $ManagerEmail=Get-LocalDemoValue $ManagerEmail 'BLUESTARS_DEMO_MANAGER_EMAIL' 'Demo manager email'
    $login=Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{email=$ManagerEmail;password=$DemoPassword};$token=$login.token
    $task=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/tasks' -Token $token|Select-Object -First 1
    if($null -eq $task){throw 'No seeded task is available for the attachment smoke.'}
    $tempFile=Join-Path ([IO.Path]::GetTempPath()) "bluestars-local-demo-$([Guid]::NewGuid().ToString('N')).txt";[IO.File]::WriteAllText($tempFile,'local-demo attachment smoke')
    $headers=@{Authorization="Bearer $token"};$uri=Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($task.taskId)/attachments"
    $uploaded=Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Form @{file=(Get-Item -LiteralPath $tempFile)} -ErrorAction Stop
    if([string]::IsNullOrWhiteSpace($uploaded.downloadUrl)){throw 'Attachment API did not return a download URL.'}
    $download=Invoke-WebRequest -UseBasicParsing -Uri $uploaded.downloadUrl -TimeoutSec 20 -ErrorAction Stop
    if($download.Content -ne 'local-demo attachment smoke'){throw 'Downloaded attachment content did not match.'}
    Write-Host 'PASS: task attachment upload and download succeeded.'
} catch {Write-Error "FAIL: object-storage smoke - $($_.Exception.Message)";exit 1} finally {if($tempFile){Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue}}
