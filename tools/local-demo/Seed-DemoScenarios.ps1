[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'http://127.0.0.1:8080/api/v1',
    [string]$DemoPassword,
    [string]$ManagerEmail,
    [string]$ReferenceDate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

function Get-ScenarioMarker([string]$Code, [datetime]$Date) {
    return "[DEMO:${Code}:$($Date.ToString('yyyy-MM-dd'))]"
}

function ConvertTo-ScenarioDate([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return (Get-Date).Date }
    $parsed = [datetime]::MinValue
    if (-not [datetime]::TryParseExact($Value, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::None, [ref]$parsed)) {
        throw 'ReferenceDate must use ISO form yyyy-MM-dd.'
    }
    return $parsed.Date
}

function Get-BackendHotelDate {
    $response = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$ApiBaseUrl/auth/login" -ContentType 'application/json' -Body (@{ email = $ManagerEmail; password = $DemoPassword } | ConvertTo-Json -Compress) -TimeoutSec 10 -ErrorAction Stop
    $header = [string]$response.Headers['Date']
    if ([string]::IsNullOrWhiteSpace($header)) { throw 'The local backend did not return an HTTP Date header for date validation.' }
    $instant = [datetimeoffset]::Parse($header, [Globalization.CultureInfo]::InvariantCulture)
    $hotelZone = [TimeZoneInfo]::FindSystemTimeZoneById('Central European Standard Time')
    return [TimeZoneInfo]::ConvertTime($instant, $hotelZone).Date
}

function Login-Demo([string]$Email) {
    $result = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{ email = $Email; password = $DemoPassword }
    if ([string]::IsNullOrWhiteSpace($result.token)) { throw "Login did not return a session for $Email." }
    return $result.token
}

function Find-DemoUser([string]$Email) {
    return (Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/users' -Token $managerToken |
        Where-Object { $_.email -ieq $Email } | Select-Object -First 1)
}

function Require-DemoResource([object]$Resource, [string]$Description) {
    if ($null -eq $Resource) { throw "$Description is missing. Run Seed-DemoData.ps1 before seeding scenarios." }
    return $Resource
}

function Copy-ScenarioGuest([hashtable]$Guest, [bool]$Primary) {
    $copy = @{}
    foreach ($key in $Guest.Keys) { $copy[$key] = $Guest[$key] }
    $copy.primary = $Primary
    return $copy
}

function Get-DemoReservations { return @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/reservations' -Token $managerToken) }

function Get-LocalDemoCollection([string]$Path, [string]$Token) {
    $items = @()
    foreach ($response in @(Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path $Path -Token $Token)) { $items += @($response) }
    return $items
}

function Assert-NoStaleScenario([datetime]$Date) {
    $expected = $Date.ToString('yyyy-MM-dd')
    foreach ($reservation in Get-DemoReservations) {
        if ($reservation.note -match '^\[DEMO:R[1-8]:(?<date>\d{4}-\d{2}-\d{2})\]') {
            if ($Matches.date -ne $expected -and $reservation.status -in @('CONFIRMED', 'CHECKED_IN')) {
                throw "Found unfinished local demo scenario for $($Matches.date) (reservation $($reservation.reservationId)). Reset the demo database before creating scenarios for a new day."
            }
        }
    }
}

function Ensure-ScenarioReservation([hashtable]$Definition) {
    $existing = Get-DemoReservations | Where-Object { $_.note -eq $Definition.marker } | Select-Object -First 1
    if ($null -ne $existing) {
        if ($existing.apartmentId -ne $Definition.apartment.apartmentId -or $existing.checkInDate -ne $Definition.checkIn -or $existing.checkOutDate -ne $Definition.checkOut) {
            throw "Conflicting existing state for $($Definition.code), reservation $($existing.reservationId)."
        }
        Write-LocalDemoStatus -Status 'already exists' -Resource "reservation $($Definition.code)"
        return $existing
    }
    $created = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/reservations' -Token $Definition.creatorToken -Body @{
        apartmentId = $Definition.apartment.apartmentId; checkInDate = $Definition.checkIn; checkOutDate = $Definition.checkOut
        guestCount = $Definition.guestCount; nightlyRate = $Definition.nightlyRate; note = $Definition.marker
    }
    Write-LocalDemoStatus -Status 'created' -Resource "reservation $($Definition.code)"
    return $created
}

function Get-GuestByCitizenId([string]$CitizenId) {
    $encoded = [Uri]::EscapeDataString($CitizenId)
    return (Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/guests?query=$encoded" -Token $managerToken |
        Where-Object { $_.citizenId -eq $CitizenId } | Select-Object -First 1)
}

function Ensure-ReservationGuest([object]$Reservation, [hashtable]$Guest, [bool]$Primary) {
    $links = @(Get-LocalDemoCollection -Path "/reservations/$($Reservation.reservationId)/guests" -Token $managerToken)
    $linked = $links | Where-Object { $_.guest.citizenId -eq $Guest.citizenId } | Select-Object -First 1
    if ($null -ne $linked) { return $linked }
    if ($links.Count -ge $Reservation.guestCount) { throw "Reservation $($Reservation.reservationId) has conflicting guest links." }
    $existingGuest = Get-GuestByCitizenId $Guest.citizenId
    $guestPayload = @{}
    foreach ($key in $Guest.Keys) { if ($key -ne 'primary') { $guestPayload[$key] = $Guest[$key] } }
    $body = if ($null -ne $existingGuest) { @{ existingGuestId = $existingGuest.guestId; primaryGuest = $Primary } } else { @{ guest = $guestPayload; primaryGuest = $Primary } }
    return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/guests" -Token $agentOneToken -Body $body
}

function Assert-ReservationGuests([object]$Reservation, [hashtable[]]$Guests) {
    foreach ($guest in $Guests) { [void](Ensure-ReservationGuest -Reservation $Reservation -Guest $guest -Primary ([bool]$guest.primary)) }
    $links = @(Get-LocalDemoCollection -Path "/reservations/$($Reservation.reservationId)/guests" -Token $managerToken)
    if ($links.Count -ne $Reservation.guestCount -or @($links | Where-Object { $_.primaryGuest }).Count -ne 1) {
        throw "Reservation $($Reservation.reservationId) does not have its declared guests and exactly one primary guest."
    }
}

function Get-Payments([object]$Reservation) { return @(Get-LocalDemoCollection -Path "/reservations/$($Reservation.reservationId)/payments" -Token $managerToken) }

function Ensure-Payment([object]$Reservation, [string]$Reference, [string]$Amount, [string]$Token) {
    $existing = Get-Payments $Reservation | Where-Object { $_.type -eq 'PAYMENT' -and $_.reference -eq $Reference } | Select-Object -First 1
    if ($null -ne $existing) { return $existing }
    return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/payments" -Token $Token -Body @{ amount = $Amount; reference = $Reference; note = $Reference }
}

function Ensure-Correction([object]$Reservation, [object]$Payment, [string]$Amount, [string]$Marker, [string]$Token) {
    $existing = Get-Payments $Reservation | Where-Object { $_.type -eq 'CORRECTION' -and $_.referencedPaymentId -eq $Payment.paymentId -and $_.reason -eq $Marker } | Select-Object -First 1
    if ($null -eq $existing) { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/payments/$($Payment.paymentId)/corrections" -Token $Token -Body @{ amount = $Amount; reason = $Marker }) }
}

function Ensure-Reversal([object]$Reservation, [object]$Payment, [string]$Marker, [string]$Token) {
    $existing = Get-Payments $Reservation | Where-Object { $_.type -eq 'REVERSAL' -and $_.referencedPaymentId -eq $Payment.paymentId } | Select-Object -First 1
    if ($null -eq $existing) { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/payments/$($Payment.paymentId)/reversal" -Token $Token -Body @{ reason = $Marker }) }
}

function Ensure-Status([object]$Reservation, [string]$Status, [string]$Marker, [string]$Token) {
    $current = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
    if ($current.status -eq $Status) { return $current }
    if ($current.status -ne 'CONFIRMED') { throw "Reservation $($Reservation.reservationId) cannot safely transition from $($current.status) to $Status." }
    return Invoke-LocalDemoApi -Method PATCH -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/status" -Token $Token -Body @{ status = $Status; reason = $Marker }
}

function Ensure-CheckIn([object]$Reservation, [string]$Token) {
    $current = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
    if ($current.status -eq 'CHECKED_IN' -or $current.status -eq 'CHECKED_OUT') { return $current }
    if ($current.status -ne 'CONFIRMED') { throw "Reservation $($Reservation.reservationId) cannot be checked in from $($current.status)." }
    [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/check-in" -Token $Token)
    return Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
}

function Ensure-R1Claim([object]$Reservation, [int]$AgentOneId) {
    $history = @(Get-LocalDemoCollection -Path "/reservations/$($Reservation.reservationId)/check-in/claim-history" -Token $managerToken)
    $agentClaim = $history | Where-Object { $_.action -eq 'CLAIMED' -and $_.performedByUserId -eq $AgentOneId } | Select-Object -First 1
    $current = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
    if ($current.status -in @('CHECKED_IN', 'CHECKED_OUT')) {
        if ($null -eq $agentClaim) { throw "R1 reservation $($Reservation.reservationId) was completed without the required agent 1 check-in claim." }
        return
    }
    if ($current.status -ne 'CONFIRMED') { throw "R1 reservation $($Reservation.reservationId) cannot safely receive a claim from $($current.status)." }
    if ($null -eq $current.checkInClaimedByUserId) {
        [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/check-in/claim" -Token $agentOneToken)
    } elseif ($current.checkInClaimedByUserId -ne $AgentOneId) {
        throw "R1 reservation $($Reservation.reservationId) is claimed by another agent and cannot be reconciled safely."
    }
    $history = @(Get-LocalDemoCollection -Path "/reservations/$($Reservation.reservationId)/check-in/claim-history" -Token $managerToken)
    if ($null -eq ($history | Where-Object { $_.action -eq 'CLAIMED' -and $_.performedByUserId -eq $AgentOneId } | Select-Object -First 1)) { throw 'R1 check-in claim history did not contain the agent 1 claim.' }
}

function Ensure-CheckOut([object]$Reservation, [string]$Token) {
    $current = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
    if ($current.status -eq 'CHECKED_OUT') { return $current }
    if ($current.status -ne 'CHECKED_IN') { throw "Reservation $($Reservation.reservationId) cannot be checked out from $($current.status)." }
    [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/check-out" -Token $Token)
    return Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
}

function Ensure-Receipt([object]$Reservation, [string]$Token) {
    $current = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)" -Token $managerToken
    if ($current.status -ne 'CHECKED_OUT') { throw "Receipt requires a checked-out reservation ($($Reservation.reservationId))." }
    [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($Reservation.reservationId)/demo-receipt" -Token $Token)
}

function Ensure-ClockedIn([string]$Token) {
    $availability = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/availability' -Token $Token
    if ($null -eq $availability.attendanceSessionId) { return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance/clock-in' -Token $Token }
    return $availability
}

function Ensure-CompletedDemoAttendance([string]$Token) {
    $sessions = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance-sessions' -Token $Token)
    $completed = $sessions | Where-Object {
        $null -ne $_.clockedOutAt -and @($_.breaks | Where-Object { $null -ne $_.endedAt }).Count -gt 0
    } | Select-Object -First 1
    if ($null -ne $completed) { return $completed }

    $availability = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/availability' -Token $Token
    if ($null -eq $availability.attendanceSessionId) {
        if (@($sessions | Where-Object { $null -ne $_.clockedOutAt }).Count -gt 0) {
            throw 'The preparation worker has an unrecoverable closed attendance session without a completed break.'
        }
        $availability = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance/clock-in' -Token $Token
    }
    if ($null -ne $availability.breakStartedAt) {
        [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance/breaks/end' -Token $Token)
    } else {
        [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance/breaks/start' -Token $Token)
        [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance/breaks/end' -Token $Token)
    }
    [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance/clock-out' -Token $Token)
    $sessions = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/attendance-sessions' -Token $Token)
    $completed = $sessions | Where-Object {
        $null -ne $_.clockedOutAt -and @($_.breaks | Where-Object { $null -ne $_.endedAt }).Count -gt 0
    } | Select-Object -First 1
    if ($null -eq $completed -or $sessions.Count -ne 1) { throw 'The preparation worker attendance scenario did not finish as one completed session with one completed break.' }
    return $completed
}

function Get-Tasks { return @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/tasks' -Token $managerToken) }

function Ensure-ManualTask([hashtable]$Definition) {
    $existing = Get-Tasks | Where-Object { $_.title -eq $Definition.title } | Select-Object -First 1
    if ($null -ne $existing) { return $existing }
    $body = @{}
    foreach ($key in $Definition.Keys) { if ($key -ne 'key') { $body[$key] = $Definition[$key] } }
    return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/tasks' -Token $agentOneToken -Body $body
}

function Ensure-TaskState([object]$Task, [string]$State, [string]$WorkerToken, [string]$Marker) {
    $current = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($Task.taskId)" -Token $managerToken
    if ($current.status -eq $State) { return $current }
    if ($current.status -eq 'COMPLETED' -or $current.status -eq 'CANCELLED') { throw "Task $($Task.taskId) is terminal with unexpected status $($current.status)." }
    if ($State -eq 'CANCELLED') { return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($Task.taskId)/cancel" -Token $agentOneToken -Body @{ reason = $Marker } }
    if ($current.status -eq 'NEW') { [void](Ensure-ClockedIn $WorkerToken); $current = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($Task.taskId)/claim" -Token $WorkerToken }
    if ($State -eq 'ASSIGNED') { return $current }
    if ($current.status -eq 'ASSIGNED') { $current = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($Task.taskId)/start" -Token $WorkerToken }
    if ($State -eq 'IN_PROGRESS') { return $current }
    if ($State -eq 'BLOCKED' -and $current.status -eq 'IN_PROGRESS') { return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($Task.taskId)/block" -Token $WorkerToken -Body @{ reason = $Marker } }
    if ($State -eq 'COMPLETED' -and $current.status -eq 'IN_PROGRESS') { return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/tasks/$($Task.taskId)/complete" -Token $WorkerToken }
    throw "Task $($Task.taskId) cannot safely reach $State from $($current.status)."
}

function Ensure-Expense([hashtable]$Definition, [string]$Token) {
    $existing = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/expenses' -Token $managerToken | Where-Object { $_.name -eq $Definition.name } | Select-Object -First 1
    if ($null -eq $existing) { return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/expenses' -Token $Token -Body $Definition }
    return $existing
}

function Ensure-Damage([object]$Apartment, [hashtable]$Definition, [string]$Token) {
    $existing = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($Apartment.apartmentId)/damages" -Token $managerToken | Where-Object { $_.title -eq $Definition.title } | Select-Object -First 1
    if ($null -eq $existing) { return Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($Apartment.apartmentId)/damages" -Token $Token -Body $Definition }
    return $existing
}

try {
    $ApiBaseUrl = Resolve-LocalDemoApiBaseUrl -ApiBaseUrl $ApiBaseUrl
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = Get-LocalDemoValue -Value $ManagerEmail -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email'
    $reference = ConvertTo-ScenarioDate $ReferenceDate
    $backendDate = Get-BackendHotelDate
    if ($reference -ne $backendDate) { throw "ReferenceDate must equal the backend hotel date ($($backendDate.ToString('yyyy-MM-dd'))) for check-in and no-show scenarios. Reset the demo database and run this seed on that date." }
    $dateText = $reference.ToString('yyyy-MM-dd')
    Write-Host "Target confirmed: local demo API $ApiBaseUrl; ReferenceDate=$dateText"

    $managerToken = Login-Demo $ManagerEmail
    $agentOneToken = Login-Demo 'demo.agent.one@bluestars.local'
    $agentTwoToken = Login-Demo 'demo.agent.two@bluestars.local'
    $users = @{}
    foreach ($email in @('demo.agent.one@bluestars.local', 'demo.agent.two@bluestars.local', 'demo.worker.cleaning@bluestars.local', 'demo.worker.electrical@bluestars.local', 'demo.worker.plumbing@bluestars.local', 'demo.worker.general_maintenance@bluestars.local', 'demo.worker.inspection@bluestars.local', 'demo.worker.apartment_preparation@bluestars.local')) { $users[$email] = Require-DemoResource (Find-DemoUser $email) "Demo user $email" }
    $workerTokens = @{}
    foreach ($email in @($users.Keys | Where-Object { $users[$_].role -eq 'OPERATIONAL_WORKER' })) { $workerTokens[$email] = Login-Demo $email }
    $apartments = @{}
    foreach ($name in @('Demo A101','Demo A102','Demo B201','Demo B202','Demo B203','Demo C301','Demo C302','Demo C303')) {
        $apartments[$name] = Require-DemoResource ((Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $managerToken | Where-Object { $_.name -eq $name } | Select-Object -First 1)) "Demo apartment $name"
    }
    $specializationRows = @()
    foreach ($response in @(Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path '/specializations' -Token $managerToken)) { $specializationRows += @($response) }
    $specializations = @{}
    foreach ($entry in $specializationRows) { $specializations[$entry.code] = $entry.id }
    foreach ($code in @('CLEANING','ELECTRICAL','PLUMBING','GENERAL_MAINTENANCE','INSPECTION','APARTMENT_PREPARATION')) { [void](Require-DemoResource $specializations[$code] "Specialization $code") }
    $categories = @{}
    foreach ($category in Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/expense-categories' -Token $managerToken) { $categories[$category.name] = $category.expenseCategoryId }
    foreach ($name in @('Demo Cleaning Supplies','Demo Utilities','Demo Maintenance','Demo Laundry')) { [void](Require-DemoResource $categories[$name] "Expense category $name") }
    Assert-NoStaleScenario $reference

    $domesticOne = @{ citizenId = 'D' + $dateText.Replace('-','') + '001'; local = $true; name = 'Mila'; surname = 'Demo'; gender = 'Female'; phoneNumber = '+38765000001'; birthDate = '1988-04-12'; birthPlace = 'Banja Luka'; birthMunicipality = 'Banja Luka'; birthCountry = 'BA'; address = 'Demo Guest Street 1' }
    $domesticTwo = @{ citizenId = 'D' + $dateText.Replace('-','') + '002'; local = $true; name = 'Nikola'; surname = 'Demo'; gender = 'Male'; phoneNumber = '+38765000002'; birthDate = '1984-07-20'; birthPlace = 'Prijedor'; birthMunicipality = 'Prijedor'; birthCountry = 'BA'; address = 'Demo Guest Street 2' }
    $domesticThree = @{ citizenId = 'D' + $dateText.Replace('-','') + '003'; local = $true; name = 'Ena'; surname = 'Demo'; gender = 'Female'; phoneNumber = '+38765000003'; birthDate = '1992-11-02'; birthPlace = 'Tuzla'; birthMunicipality = 'Tuzla'; birthCountry = 'BA'; address = 'Demo Guest Street 3' }
    $foreignOne = @{ citizenId = 'F' + $dateText.Replace('-','') + '001'; local = $false; name = 'Alex'; surname = 'Visitor'; gender = 'Male'; phoneNumber = '+49151000001'; birthDate = '1986-03-09'; birthPlace = 'Berlin'; birthCountry = 'DE'; address = 'Demo Foreign Street 1'; citizenship = 'DE'; passportNumber = 'DP' + $dateText.Replace('-','') + '01'; passportIssuedDate = '2024-01-10'; visaType = 'VISA_FREE'; entryDate = $dateText; entryPlace = 'Gradiska' }
    $foreignTwo = @{ citizenId = 'F' + $dateText.Replace('-','') + '002'; local = $false; name = 'Sofia'; surname = 'Visitor'; gender = 'Female'; phoneNumber = '+39021000002'; birthDate = '1990-09-15'; birthPlace = 'Milano'; birthCountry = 'IT'; address = 'Demo Foreign Street 2'; citizenship = 'IT'; passportNumber = 'IP' + $dateText.Replace('-','') + '02'; passportIssuedDate = '2023-07-15'; visaType = 'VISA_FREE'; entryDate = $dateText; entryPlace = 'Banja Luka' }

    $definitions = @(
        @{ code='R1'; apartment=$apartments['Demo A101']; checkIn=$dateText; checkOut=$reference.AddDays(3).ToString('yyyy-MM-dd'); guestCount=1; nightlyRate='65.00'; marker=(Get-ScenarioMarker 'R1' $reference); creatorToken=$agentOneToken; guests=@(Copy-ScenarioGuest $domesticOne $true) },
        @{ code='R2'; apartment=$apartments['Demo B201']; checkIn=$dateText; checkOut=$reference.AddDays(4).ToString('yyyy-MM-dd'); guestCount=2; nightlyRate='95.00'; marker=(Get-ScenarioMarker 'R2' $reference); creatorToken=$agentOneToken; guests=@((Copy-ScenarioGuest $foreignOne $true), (Copy-ScenarioGuest $domesticTwo $false)) },
        @{ code='R3'; apartment=$apartments['Demo B202']; checkIn=$dateText; checkOut=$reference.AddDays(5).ToString('yyyy-MM-dd'); guestCount=2; nightlyRate='95.00'; marker=(Get-ScenarioMarker 'R3' $reference); creatorToken=$agentTwoToken; guests=@((Copy-ScenarioGuest $domesticThree $true), (Copy-ScenarioGuest $foreignTwo $false)) },
        @{ code='R4'; apartment=$apartments['Demo C301']; checkIn=$dateText; checkOut=$reference.AddDays(3).ToString('yyyy-MM-dd'); guestCount=1; nightlyRate='145.00'; marker=(Get-ScenarioMarker 'R4' $reference); creatorToken=$agentOneToken; guests=@(Copy-ScenarioGuest $foreignOne $true) },
        @{ code='R5'; apartment=$apartments['Demo A102']; checkIn=$reference.AddDays(8).ToString('yyyy-MM-dd'); checkOut=$reference.AddDays(10).ToString('yyyy-MM-dd'); guestCount=1; nightlyRate=$null; marker=(Get-ScenarioMarker 'R5' $reference); creatorToken=$agentTwoToken; guests=@() },
        @{ code='R6'; apartment=$apartments['Demo C302']; checkIn=$reference.AddDays(12).ToString('yyyy-MM-dd'); checkOut=$reference.AddDays(14).ToString('yyyy-MM-dd'); guestCount=1; nightlyRate='155.00'; marker=(Get-ScenarioMarker 'R6' $reference); creatorToken=$agentOneToken; guests=@() },
        @{ code='R7'; apartment=$apartments['Demo B203']; checkIn=$reference.AddDays(16).ToString('yyyy-MM-dd'); checkOut=$reference.AddDays(18).ToString('yyyy-MM-dd'); guestCount=1; nightlyRate='95.00'; marker=(Get-ScenarioMarker 'R7' $reference); creatorToken=$agentOneToken; guests=@() },
        @{ code='R8'; apartment=$apartments['Demo C303']; checkIn=$dateText; checkOut=$reference.AddDays(2).ToString('yyyy-MM-dd'); guestCount=1; nightlyRate='145.00'; marker=(Get-ScenarioMarker 'R8' $reference); creatorToken=$agentTwoToken; guests=@() }
    )
    $reservations = @{}
    foreach ($definition in $definitions) { $reservations[$definition.code] = Ensure-ScenarioReservation $definition; if ($definition.guests.Count) { Assert-ReservationGuests $reservations[$definition.code] $definition.guests } }

    $r1 = $reservations.R1; [void](Ensure-Payment $r1 "$(Get-ScenarioMarker 'R1-P1' $reference)" '120.00' $agentOneToken); [void](Ensure-Payment $r1 "$(Get-ScenarioMarker 'R1-P2' $reference)" '75.00' $agentOneToken); Ensure-R1Claim $r1 ([int]$users['demo.agent.one@bluestars.local'].id); [void](Ensure-CheckIn $r1 $agentOneToken); [void](Ensure-CheckOut $r1 $agentOneToken); Ensure-Receipt $r1 $agentOneToken
    $r2 = $reservations.R2; [void](Ensure-Payment $r2 "$(Get-ScenarioMarker 'R2-P1' $reference)" '380.00' $agentTwoToken); [void](Ensure-CheckIn $r2 $agentOneToken); [void](Ensure-CheckOut $r2 $agentOneToken); Ensure-Receipt $r2 $agentOneToken
    $r3 = $reservations.R3; [void](Ensure-Payment $r3 "$(Get-ScenarioMarker 'R3-P1' $reference)" '100.00' $agentTwoToken); [void](Ensure-CheckIn $r3 $agentTwoToken)
    $r4 = $reservations.R4; $claimHistory = @(Get-LocalDemoCollection -Path "/reservations/$($r4.reservationId)/check-in/claim-history" -Token $managerToken); if (@($claimHistory | Where-Object { $_.action -eq 'TAKEN_OVER' }).Count -eq 0) { $claim = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)" -Token $managerToken; if ($null -ne $claim.checkInClaimedByUserId) { if ($claim.checkInClaimedByUserId -ne $users['demo.agent.one@bluestars.local'].id) { [void](Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)/check-in/claim" -Token $agentOneToken) }; [void](Invoke-LocalDemoApi -Method DELETE -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)/check-in/claim" -Token $agentOneToken) }; [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)/check-in/claim" -Token $agentOneToken); [void](Invoke-LocalDemoApi -Method DELETE -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)/check-in/claim" -Token $agentOneToken); [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)/check-in/claim" -Token $agentTwoToken); [void](Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($r4.reservationId)/check-in/claim" -Token $agentOneToken) }
    $r6 = $reservations.R6; $r6Payment = Ensure-Payment $r6 "$(Get-ScenarioMarker 'R6-P1' $reference)" '120.00' $agentOneToken; Ensure-Correction $r6 $r6Payment '-20.00' (Get-ScenarioMarker 'R6-CORRECTION' $reference) $agentOneToken; $reversed = Ensure-Payment $r6 "$(Get-ScenarioMarker 'R6-REVERSAL' $reference)" '10.00' $agentOneToken; Ensure-Reversal $r6 $reversed (Get-ScenarioMarker 'R6-REVERSAL' $reference) $agentOneToken
    [void](Ensure-Status $reservations.R7 'CANCELLED' (Get-ScenarioMarker 'R7-CANCELLED' $reference) $agentOneToken); [void](Ensure-Status $reservations.R8 'NO_SHOW' (Get-ScenarioMarker 'R8-NO_SHOW' $reference) $agentTwoToken)

    $damages = @{}
    $damages['estimated'] = Ensure-Damage $apartments['Demo A102'] @{ title=(Get-ScenarioMarker 'DAMAGE-ESTIMATED' $reference); description='Estimated local demo damage.'; estimatedAmount='85.50'; confirmedAmount=$null } $agentOneToken
    $damages['confirmed'] = Ensure-Damage $apartments['Demo B203'] @{ title=(Get-ScenarioMarker 'DAMAGE-CONFIRMED' $reference); description='Confirmed local demo damage.'; estimatedAmount='140.00'; confirmedAmount='125.00' } $managerToken
    $damages['noAmount'] = Ensure-Damage $apartments['Demo C301'] @{ title=(Get-ScenarioMarker 'DAMAGE-NO-AMOUNT' $reference); description='Local demo damage awaiting estimate.'; estimatedAmount=$null; confirmedAmount=$null } $agentTwoToken
    $damages['blocked'] = Ensure-Damage $apartments['Demo C302'] @{ title=(Get-ScenarioMarker 'DAMAGE-BLOCKED' $reference); description='Damage associated with blocked maintenance task.'; estimatedAmount='210.00'; confirmedAmount=$null } $agentOneToken

    $manualTasks = @(
        @{ key='NEW'; specializationId=$specializations['APARTMENT_PREPARATION']; apartmentId=$apartments['Demo A102'].apartmentId; title=(Get-ScenarioMarker 'TASK-NEW' $reference); description='New local demo preparation task.'; priority='LOW' },
        @{ key='ASSIGNED'; specializationId=$specializations['ELECTRICAL']; apartmentId=$apartments['Demo B203'].apartmentId; title=(Get-ScenarioMarker 'TASK-ASSIGNED' $reference); description='Assigned local demo electrical task.'; priority='HIGH' },
        @{ key='IN_PROGRESS'; specializationId=$specializations['PLUMBING']; apartmentId=$apartments['Demo C301'].apartmentId; title=(Get-ScenarioMarker 'TASK-IN-PROGRESS' $reference); description='In-progress local demo plumbing task.'; priority='NORMAL' },
        @{ key='BLOCKED'; specializationId=$specializations['GENERAL_MAINTENANCE']; apartmentId=$apartments['Demo C302'].apartmentId; title=(Get-ScenarioMarker 'TASK-BLOCKED' $reference); description='Blocked task; see related demo damage.'; priority='URGENT' },
        @{ key='COMPLETED'; specializationId=$specializations['INSPECTION']; apartmentId=$apartments['Demo C303'].apartmentId; title=(Get-ScenarioMarker 'TASK-COMPLETED' $reference); description='Completed local demo inspection.'; priority='NORMAL' },
        @{ key='CANCELLED'; specializationId=$specializations['APARTMENT_PREPARATION']; apartmentId=$apartments['Demo A101'].apartmentId; title=(Get-ScenarioMarker 'TASK-CANCELLED' $reference); description='Cancelled local demo preparation task.'; priority='LOW' }
    )
    $taskByKey = @{}; foreach ($task in $manualTasks) { $taskByKey[$task.key] = Ensure-ManualTask $task }
    [void](Ensure-TaskState $taskByKey.ASSIGNED 'ASSIGNED' $workerTokens['demo.worker.electrical@bluestars.local'] (Get-ScenarioMarker 'TASK-ASSIGNED' $reference)); [void](Ensure-TaskState $taskByKey.IN_PROGRESS 'IN_PROGRESS' $workerTokens['demo.worker.plumbing@bluestars.local'] (Get-ScenarioMarker 'TASK-IN-PROGRESS' $reference)); [void](Ensure-TaskState $taskByKey.BLOCKED 'BLOCKED' $workerTokens['demo.worker.general_maintenance@bluestars.local'] (Get-ScenarioMarker 'TASK-BLOCKED' $reference)); [void](Ensure-TaskState $taskByKey.COMPLETED 'COMPLETED' $workerTokens['demo.worker.inspection@bluestars.local'] (Get-ScenarioMarker 'TASK-COMPLETED' $reference)); [void](Ensure-TaskState $taskByKey.CANCELLED 'CANCELLED' $null (Get-ScenarioMarker 'TASK-CANCELLED' $reference))
    $checkoutTasks = Get-Tasks | Where-Object { $_.reservationId -in @($r1.reservationId, $r2.reservationId) }
    $r1Cleaning = $checkoutTasks | Where-Object { $_.reservationId -eq $r1.reservationId } | Select-Object -First 1; $r2Cleaning = $checkoutTasks | Where-Object { $_.reservationId -eq $r2.reservationId } | Select-Object -First 1
    if ($null -eq $r1Cleaning -or $null -eq $r2Cleaning) { throw 'Expected checkout cleaning tasks were not created.' }
    [void](Ensure-TaskState $r2Cleaning 'COMPLETED' $workerTokens['demo.worker.cleaning@bluestars.local'] (Get-ScenarioMarker 'R2-CLEANING' $reference))

    [void](Ensure-ClockedIn $agentOneToken); [void](Ensure-ClockedIn $agentTwoToken)
    $overrideMarker = Get-ScenarioMarker 'AGENT2-OVERRIDE' $reference
    $overrides = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/availability-overrides' -Token $agentTwoToken
    if ($null -eq ($overrides | Where-Object { $_.reason -eq $overrideMarker -and $null -eq $_.clearedAt } | Select-Object -First 1)) { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/availability-overrides' -Token $agentTwoToken -Body @{ startsAt=$null; endsAt=$null; reason=$overrideMarker }) }
    $prepToken = $workerTokens['demo.worker.apartment_preparation@bluestars.local']; [void](Ensure-CompletedDemoAttendance $prepToken)

    $leaveDefinitions = @(@{ token=$agentOneToken; key='PENDING'; start=$reference.AddDays(20); end=$reference.AddDays(21) }, @{ token=$workerTokens['demo.worker.cleaning@bluestars.local']; key='APPROVED'; start=$reference.AddDays(24); end=$reference.AddDays(25) }, @{ token=$workerTokens['demo.worker.electrical@bluestars.local']; key='REJECTED'; start=$reference.AddDays(28); end=$reference.AddDays(29) }, @{ token=$workerTokens['demo.worker.plumbing@bluestars.local']; key='CANCELLED'; start=$reference.AddDays(32); end=$reference.AddDays(33) })
    foreach ($leave in $leaveDefinitions) { $marker = Get-ScenarioMarker "LEAVE-$($leave.key)" $reference; $mine = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/leave-requests' -Token $leave.token; $request = $mine | Where-Object { $_.reason -eq $marker } | Select-Object -First 1; if ($null -eq $request) { $request = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/workforce/me/leave-requests' -Token $leave.token -Body @{ startDate=$leave.start.ToString('yyyy-MM-dd'); endDate=$leave.end.ToString('yyyy-MM-dd'); reason=$marker } }; if ($leave.key -eq 'APPROVED' -and $request.status -eq 'PENDING') { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/workforce/leave-requests/$($request.leaveRequestId)/approve" -Token $managerToken) }; if ($leave.key -eq 'REJECTED' -and $request.status -eq 'PENDING') { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/workforce/leave-requests/$($request.leaveRequestId)/reject" -Token $managerToken -Body @{ reason=$marker }) }; if ($leave.key -eq 'CANCELLED' -and $request.status -eq 'PENDING') { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/workforce/me/leave-requests/$($request.leaveRequestId)/cancel" -Token $leave.token) } }

    $expenseDefinitions = @(); $expenseNames = @('Supplies','Utilities','Maintenance','Laundry','Reception','Repairs','Detergent','Water','Inspection','Linen','Tools','Cleaning'); $categoryNames = @('Demo Cleaning Supplies','Demo Utilities','Demo Maintenance','Demo Laundry'); for ($i=0; $i -lt 12; $i++) { $expenseDefinitions += @{ categoryId=$categories[$categoryNames[$i % 4]]; name="$(Get-ScenarioMarker "EXPENSE-$($i+1)" $reference) $($expenseNames[$i])"; description='Local demo analytics expense.'; amount=(ConvertTo-LocalDemoMoney ([decimal]($i + 11) + [decimal]0.25)); expenseDate=$reference.AddMonths(-($i % 3)).ToString('yyyy-MM-dd'); token=if($i % 3 -eq 0){$agentOneToken}elseif($i % 3 -eq 1){$agentTwoToken}else{$managerToken} } }
    $expenses = @(); foreach ($expense in $expenseDefinitions) { $token = $expense.token; $body=@{ categoryId=$expense.categoryId; name=$expense.name; description=$expense.description; amount=$expense.amount; expenseDate=$expense.expenseDate }; $expenses += Ensure-Expense $body $token }; $voidMarker = Get-ScenarioMarker 'EXPENSE-VOID' $reference; if ($expenses[0].voided -eq $false) { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/expenses/$($expenses[0].operationalExpenseId)/void" -Token $managerToken -Body @{ reason=$voidMarker }) }

    $unavailabilityMarker = Get-ScenarioMarker 'OUT-OF-ORDER' $reference; $unavailability = @(Get-LocalDemoCollection -Path "/apartments/$($apartments['Demo C303'].apartmentId)/unavailability" -Token $managerToken); if ($null -eq ($unavailability | Where-Object { $_.reason -eq $unavailabilityMarker } | Select-Object -First 1)) { [void](Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path "/apartments/$($apartments['Demo C303'].apartmentId)/unavailability" -Token $managerToken -Body @{ startDate=$reference.AddDays(40).ToString('yyyy-MM-dd'); endDate=$reference.AddDays(42).ToString('yyyy-MM-dd'); reason=$unavailabilityMarker }) }

    $domesticBook = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/books/domestic-guests?from=$dateText&to=$dateText" -Token $managerToken | Where-Object { $_.reservationId -eq $r1.reservationId -or $_.reservationId -eq $r2.reservationId })
    $foreignBook = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/books/foreign-guests?from=$dateText&to=$dateText" -Token $managerToken | Where-Object { $_.reservationId -eq $r2.reservationId })
    $incomeBook = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/books/income?from=$dateText&to=$dateText" -Token $managerToken | Where-Object { $_.reservationId -eq $r1.reservationId -or $_.reservationId -eq $r2.reservationId })
    if ($domesticBook.Count -lt 2 -or $foreignBook.Count -lt 1 -or $incomeBook.Count -ne 2) { throw 'Expected automatic domestic, foreign, and income book entries were not found.' }
    foreach ($reservation in @($r1, $r2, $r3, $r4, $reservations.R7, $reservations.R8)) { if (@(Get-LocalDemoCollection -Path "/reservations/$($reservation.reservationId)/status-history" -Token $managerToken).Count -lt 1) { throw "Reservation $($reservation.reservationId) has no status history." } }
    if (@(Get-LocalDemoCollection -Path "/reservations/$($r4.reservationId)/check-in/claim-history" -Token $managerToken).Count -lt 4) { throw 'R4 does not contain the expected claim history.' }
    foreach ($task in $taskByKey.Values) { if (@(Get-LocalDemoCollection -Path "/tasks/$($task.taskId)/history" -Token $managerToken).Count -lt 1) { throw "Task $($task.taskId) has no history." } }
    $r2ApartmentHistory = @(Get-LocalDemoCollection -Path "/apartments/$($apartments['Demo B201'].apartmentId)/status-history" -Token $managerToken)
    if ($r2ApartmentHistory.Count -lt 2) { throw 'Expected apartment status history from checkout cleaning was not found.' }
    $auditRows = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path "/audit-logs?reservationId=$($r1.reservationId)" -Token $managerToken)
    if ($auditRows.Count -lt 1) { throw 'Expected regular-operation audit records were not found.' }
    $notificationCount = @((Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/notifications' -Token $agentOneToken)).Count + @((Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/notifications' -Token $workerTokens['demo.worker.cleaning@bluestars.local'])).Count
    Write-Host "Scenario seed completed. ReferenceDate=$dateText books(domestic=$($domesticBook.Count),foreign=$($foreignBook.Count),income=$($incomeBook.Count)) audit=$($auditRows.Count) notifications=$notificationCount"
    foreach ($code in 'R1','R2','R3','R4','R5','R6','R7','R8') { $reservation = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($reservations[$code].reservationId)" -Token $managerToken; $payment = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path "/reservations/$($reservation.reservationId)/payments/summary" -Token $managerToken; Write-Host "  $code reservation=$($reservation.reservationId) apartment=$($reservation.apartmentName) status=$($reservation.status) payment=$($payment.status)" }
    Write-Host "  resources: expenses=$($expenses.Count) damages=$($damages.Count) leaveRequests=$($leaveDefinitions.Count) manualTasks=$($taskByKey.Count)"
    Write-Host "  accounts: $ManagerEmail (MANAGER), demo.agent.one@bluestars.local (AGENT), demo.agent.two@bluestars.local (AGENT), demo.worker.cleaning@bluestars.local (OPERATIONAL_WORKER)"
} catch {
    Write-LocalDemoStatus -Status 'failed' -Resource 'local demo scenarios'
    Write-Error $_.Exception.Message
    exit 1
} finally {
    $managerToken = $null; $agentOneToken = $null; $agentTwoToken = $null; $workerTokens = $null; $DemoPassword = $null
}
