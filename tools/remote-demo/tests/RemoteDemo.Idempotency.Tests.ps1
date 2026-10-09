$ErrorActionPreference = 'Stop'
$script:ApiBaseUrl = 'https://example.com/api/v1'
$script:created = 0
$script:types = @()
$script:reservations = @()

function Import-SeedFunction([string]$File, [string]$Name) {
    $tokens = $null; $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile($File, [ref]$tokens, [ref]$errors)
    if ($errors.Count) { throw 'Seed function parser failed.' }
    $node = $ast.Find({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $Name }, $true)
    if ($null -eq $node) { throw "Missing function $Name." }
    return $node.Extent.Text
}

Invoke-Expression (Import-SeedFunction (Join-Path $PSScriptRoot '..\Seed-DemoData.ps1') 'Ensure-DemoApartmentType')
Invoke-Expression (Import-SeedFunction (Join-Path $PSScriptRoot '..\Seed-DemoScenarios.ps1') 'Ensure-ScenarioReservation')
function Get-LocalDemoPagedContent { return $script:types }
function Get-DemoReservations { return $script:reservations }
function Write-LocalDemoStatus { }
function Invoke-LocalDemoApi {
    param([string]$Method,[string]$ApiBaseUrl,[string]$Path,[string]$Token,[object]$Body)
    if ($Method -ne 'POST') { throw 'Unexpected API method.' }
    $script:created++
    if ($Path -eq '/apartment-types') {
        $item = [pscustomobject]@{ apartmentTypeId=1; name=$Body.name; description=$Body.description; capacity=$Body.capacity; defaultNightlyRate=$Body.defaultNightlyRate; active=$true }
        $script:types += $item
        return $item
    }
    if ($Path -eq '/reservations') {
        $item = [pscustomobject]@{ reservationId=1; note=$Body.note; apartmentId=$Body.apartmentId; checkInDate=$Body.checkInDate; checkOutDate=$Body.checkOutDate; guestCount=$Body.guestCount }
        $script:reservations += $item
        return $item
    }
    throw "Unexpected API path $Path."
}

$type = @{ name='Demo Studio'; description='Studio'; capacity=1; defaultNightlyRate='65.00' }
[void](Ensure-DemoApartmentType -Definition $type -Token 'redacted')
[void](Ensure-DemoApartmentType -Definition $type -Token 'redacted')
if ($script:created -ne 1) { throw 'Repeated type seed created a duplicate.' }
$type.capacity = 2
try { [void](Ensure-DemoApartmentType -Definition $type -Token 'redacted'); throw 'Conflicting type was accepted.' }
catch { if ($_.Exception.Message -eq 'Conflicting type was accepted.') { throw } }

$reservation = @{ code='R1'; marker='[DEMO:R1:2026-10-09]'; apartment=[pscustomobject]@{ apartmentId=1 }; checkIn='2026-10-09'; checkOut='2026-10-11'; guestCount=1; nightlyRate='65.00'; creatorToken='redacted' }
[void](Ensure-ScenarioReservation $reservation)
[void](Ensure-ScenarioReservation $reservation)
if ($script:created -ne 2) { throw 'Repeated reservation seed created a duplicate.' }
$reservation.guestCount = 2
try { [void](Ensure-ScenarioReservation $reservation); throw 'Conflicting reservation was accepted.' }
catch { if ($_.Exception.Message -eq 'Conflicting reservation was accepted.') { throw } }
Write-Host 'PASS: mocked repeated base and reservation seed did not duplicate records; conflicts stopped.'
