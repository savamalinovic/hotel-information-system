[CmdletBinding()]
param([string]$ApiBaseUrl='http://127.0.0.1:8080/api/v1',[string]$DemoPassword,[string]$ManagerEmail)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')
$required=@('EFIKAS_AWS_REGION','EFIKAS_AWS_ACCESS_KEY_ID','EFIKAS_AWS_SECRET_ACCESS_KEY','EFIKAS_AWS_BUCKET')
if(@($required|Where-Object {[string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_,'Process'))}).Count -gt 0){Write-Host 'SKIPPED: object storage is not completely configured in this process.';exit 0}
function Invoke-MultipartUpload([string]$Uri,[string]$Token,[string]$FilePath) {
    $client=[Net.Http.HttpClient]::new();$content=[Net.Http.MultipartFormDataContent]::new()
    try {$bytes=[IO.File]::ReadAllBytes($FilePath);$fileContent=[Net.Http.ByteArrayContent]::new($bytes);$fileContent.Headers.ContentType=[Net.Http.Headers.MediaTypeHeaderValue]::Parse('text/plain');$content.Add($fileContent,'file',[IO.Path]::GetFileName($FilePath));$request=[Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post,$Uri);$request.Headers.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$Token);$request.Content=$content;$response=$client.SendAsync($request).GetAwaiter().GetResult();if(-not $response.IsSuccessStatusCode){throw "Attachment upload failed with HTTP $([int]$response.StatusCode)."};return ($response.Content.ReadAsStringAsync().GetAwaiter().GetResult()|ConvertFrom-Json)} finally {$content.Dispose();$client.Dispose()}
}
function Assert-DownloadedContent([string]$Url,[string]$Expected) {$download=Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 20 -ErrorAction Stop;if([string]$download.Content -ne $Expected){throw 'Downloaded attachment content did not match.'}}
$taskFile=$null;$damageFile=$null
try {
    $ApiBaseUrl=Resolve-LocalDemoApiBaseUrl $ApiBaseUrl;$DemoPassword=Get-LocalDemoValue $DemoPassword 'BLUESTARS_DEMO_PASSWORD' 'Demo password';$ManagerEmail=Get-LocalDemoValue $ManagerEmail 'BLUESTARS_DEMO_MANAGER_EMAIL' 'Demo manager email'
    $login=Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{email=$ManagerEmail;password=$DemoPassword};$token=$login.token
    $task=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/tasks' -Token $token|Select-Object -First 1;if($null -eq $task){throw 'No seeded task is available for the attachment smoke.'}
    $apartments=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $token;$damage=$null;$damageApartment=$null;foreach($apartment in $apartments){$candidate=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($apartment.apartmentId)/damages" -Token $token|Select-Object -First 1;if($candidate){$damage=$candidate;$damageApartment=$apartment;break}};if($null -eq $damage){throw 'No seeded damage is available for the attachment smoke.'}
    $taskContent="local-demo-task-$([Guid]::NewGuid().ToString('N'))";$damageContent="local-demo-damage-$([Guid]::NewGuid().ToString('N'))";$taskFile=Join-Path ([IO.Path]::GetTempPath()) "bluestars-task-$([Guid]::NewGuid().ToString('N')).txt";$damageFile=Join-Path ([IO.Path]::GetTempPath()) "bluestars-damage-$([Guid]::NewGuid().ToString('N')).txt";[IO.File]::WriteAllText($taskFile,$taskContent);[IO.File]::WriteAllText($damageFile,$damageContent)
    $taskAttachment=Invoke-MultipartUpload -Uri (Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($task.taskId)/attachments") -Token $token -FilePath $taskFile;Assert-DownloadedContent -Url $taskAttachment.downloadUrl -Expected $taskContent
    $damageAttachment=Invoke-MultipartUpload -Uri (Get-LocalDemoApiUri -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($damageApartment.apartmentId)/damages/$($damage.damageId)/attachments") -Token $token -FilePath $damageFile;Assert-DownloadedContent -Url $damageAttachment.downloadUrl -Expected $damageContent
    Write-Host 'PASS: task and damage attachment upload/download succeeded.'
} catch {Write-Error "FAIL: object-storage smoke - $($_.Exception.Message)";exit 1} finally {if($taskFile){Remove-Item -LiteralPath $taskFile -Force -ErrorAction SilentlyContinue};if($damageFile){Remove-Item -LiteralPath $damageFile -Force -ErrorAction SilentlyContinue}}
