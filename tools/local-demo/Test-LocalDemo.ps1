[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'http://127.0.0.1:8080/api/v1',
    [string]$DemoPassword,
    [string]$ManagerEmail,
    [switch]$SkipAdb,
    [string]$DeviceSerial
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

$passes = [Collections.Generic.List[string]]::new(); $failures = [Collections.Generic.List[string]]::new()
function Confirm([string]$Name, [scriptblock]$Check) { try { & $Check; $script:passes.Add($Name) } catch { $script:failures.Add($Name + ' - ' + $_.Exception.Message) } }
function Require([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
function Login([string]$Email) { $result = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{ email=$Email; password=$DemoPassword }; Require (-not [string]::IsNullOrWhiteSpace($result.token)) "Login failed for $Email."; return $result.token }
function Marker([string]$Code) { return "^\[DEMO:${Code}:\d{4}-\d{2}-\d{2}\]$" }
function Expect-Forbidden([string]$Path, [string]$Token) {
    try { [void](Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path $Path -Token $Token) } catch { if ($_.Exception.Message -match 'HTTP 403') { return }; throw }
    throw "Expected 403 for $Path."
}

try {
    $ApiBaseUrl = Resolve-LocalDemoApiBaseUrl -ApiBaseUrl $ApiBaseUrl
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = Get-LocalDemoValue -Value $ManagerEmail -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email'
    Confirm 'backend readiness' { $r=Invoke-WebRequest -UseBasicParsing -Uri ($ApiBaseUrl -replace '/api/v1$','/v3/api-docs/v1') -TimeoutSec 10; Require ($r.StatusCode -eq 200) 'OpenAPI readiness endpoint did not return 200.' }
    $managerToken=Login $ManagerEmail; $agentOneToken=Login 'demo.agent.one@bluestars.local'; $agentTwoToken=Login 'demo.agent.two@bluestars.local'; $workerToken=Login 'demo.worker.cleaning@bluestars.local'; $attendanceToken=Login 'demo.worker.apartment_preparation@bluestars.local'
    $users=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/users' -Token $managerToken
    Confirm 'demo account count and roles' { Require (@($users).Count -eq 9) "Expected 9 demo accounts, got $(@($users).Count)."; foreach($email in @($ManagerEmail,'demo.agent.one@bluestars.local','demo.agent.two@bluestars.local','demo.worker.cleaning@bluestars.local')) { Require ($null -ne ($users|Where-Object email -ieq $email|Select-Object -First 1)) "Missing $email." } }
    $types=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartment-types' -Token $managerToken; $apartments=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $managerToken; $categories=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/expense-categories' -Token $managerToken
    Confirm 'base catalog counts' { Require (@($types).Count -eq 3) 'Expected 3 apartment types.'; Require (@($apartments).Count -eq 8) 'Expected 8 apartments.'; Require (@($categories).Count -eq 4) 'Expected 4 expense categories.' }
    $reservations=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/reservations' -Token $managerToken
    $scenario=@{}; foreach($code in 'R1','R2','R3','R4','R5','R6','R7','R8') { $matches=@($reservations|Where-Object note -match (Marker $code)); Require ($matches.Count -eq 1) "Expected exactly one $code reservation, got $($matches.Count)."; $scenario[$code]=$matches[0] }
    Confirm 'exactly eight R1-R8 reservations' { Require ($scenario.Count -eq 8) 'Scenario lookup incomplete.' }
    Confirm 'R1-R8 reservation statuses' { $expected=@{R1='CHECKED_OUT';R2='CHECKED_OUT';R3='CHECKED_IN';R4='CONFIRMED';R5='CONFIRMED';R6='CONFIRMED';R7='CANCELLED';R8='NO_SHOW'}; foreach($code in $expected.Keys) { Require ($scenario[$code].status -eq $expected[$code]) "$code status is $($scenario[$code].status), not $($expected[$code])." } }
    Confirm 'representative payment statuses and receipts' { foreach($code in 'R1','R2','R3','R5') { $summary=Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($scenario[$code].reservationId)/payments/summary" -Token $managerToken; $expected=if($code -in 'R1','R2'){'PAID'}elseif($code -eq 'R3'){'PARTIALLY_PAID'}else{'UNPAID'}; Require ($summary.status -eq $expected) "$code payment is $($summary.status), not $expected." }; foreach($code in 'R1','R2') { $receipt=Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($scenario[$code].reservationId)/demo-receipt" -Token $managerToken; Require ($null -ne $receipt.demoReceiptId) "Missing $code demo receipt." } }
    $tasks=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/tasks' -Token $managerToken
    Confirm 'tasks and task histories' { Require (@($tasks).Count -ge 6) 'Expected seeded operational tasks.'; foreach($task in @($tasks|Select-Object -First 3)) { $history=@(Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($task.taskId)/history" -Token $managerToken); Require ($history.Count -gt 0) "Task $($task.taskId) has no history." } }
    Confirm 'attendance, break, availability and leave examples' { $attendance=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance-sessions' -Token $attendanceToken; Require (@($attendance|Where-Object { $_.clockedOutAt }).Count -gt 0) 'No completed worker attendance.'; Require (@($attendance|Where-Object { @($_.breaks).Count -gt 0 }).Count -gt 0) 'No attendance break history.'; $availability=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/availability' -Token $managerToken; foreach($state in 'AVAILABLE','UNAVAILABLE','BUSY') { Require (@($availability|Where-Object status -eq $state).Count -gt 0) "No $state workforce participant." }; $leaves=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/leave-requests' -Token $managerToken; foreach($state in 'PENDING','APPROVED','REJECTED','CANCELLED') { Require (@($leaves|Where-Object status -eq $state).Count -gt 0) "No $state leave request." } }
    Confirm 'expenses, void, damages and unavailability' { $expenses=Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/expenses' -Token $managerToken; Require (@($expenses).Count -ge 12) 'Expected 12 demo expenses.'; Require (@($expenses|Where-Object voided).Count -ge 1) 'Expected a voided expense.'; $allDamages=@(); foreach($apartment in $apartments){$allDamages+=@(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($apartment.apartmentId)/damages" -Token $managerToken)}; Require ($allDamages.Count -ge 4) 'Expected four damages.'; $c303=$apartments|Where-Object name -eq 'Demo C303'|Select-Object -First 1; $unavailability=@(Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($c303.apartmentId)/unavailability" -Token $managerToken); Require ($unavailability.Count -gt 0) 'Expected apartment unavailability period.' }
    Confirm 'RBAC denial remains enforced' { Expect-Forbidden -Path '/users' -Token $agentOneToken }
    if ($SkipAdb) { $passes.Add('ADB reverse skipped') } else { Confirm 'ADB reverse tcp:8080' { $adb=Get-Command adb -ErrorAction Stop; $args=@(); if($DeviceSerial){$args+=@('-s',$DeviceSerial)}; $rules=& $adb.Source @args reverse --list; Require ($rules -match 'tcp:8080\s+tcp:8080') 'tcp:8080 reverse is absent.' } }
} catch { $failures.Add($_.Exception.Message) }
foreach($item in $passes){Write-Host "PASS: $item"}; foreach($item in $failures){Write-Error "FAIL: $item"}
if($failures.Count -gt 0){Write-Host "FAIL: $($passes.Count) passed, $($failures.Count) failed."; exit 1}; Write-Host "PASS: $($passes.Count) local demo invariants verified."
