[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'http://127.0.0.1:8080/api/v1',
    [string]$DemoPassword,
    [string]$ManagerEmail
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

function Find-DemoUser {
    param([string]$Email, [string]$Token)
    $users = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/users' -Token $Token
    return $users | Where-Object { $_.email -ieq $Email } | Select-Object -First 1
}

function Ensure-DemoUser {
    param(
        [Parameter(Mandatory)][hashtable]$Definition,
        [Parameter(Mandatory)][string]$Token
    )

    $existing = Find-DemoUser -Email $Definition.email -Token $Token
    if ($null -eq $existing) {
        $created = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/users' -Token $Token -Body $Definition
        Write-LocalDemoStatus -Status 'created' -Resource "user $($Definition.email) ($($Definition.role))"
        return $created
    }
    if ($existing.role -ne $Definition.role) {
        throw "Demo account $($Definition.email) already exists with role $($existing.role), not $($Definition.role)."
    }

    $changed = $false
    if (-not $existing.active) {
        $existing = Invoke-LocalDemoApi -Method PATCH -ApiBaseUrl $ApiBaseUrl -Path "/users/$($existing.id)/status" -Token $Token -Body @{ active = $true }
        $changed = $true
    }
    $expectedSpecializationIds = @($Definition.specializationIds | Sort-Object)
    $actualSpecializationIds = @($existing.specializations | ForEach-Object { [int]($_.id) } | Sort-Object)
    if (@(Compare-Object -ReferenceObject $expectedSpecializationIds -DifferenceObject $actualSpecializationIds).Count -gt 0) {
        $existing = Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path "/users/$($existing.id)/specializations" -Token $Token -Body @{ specializationIds = $expectedSpecializationIds }
        $changed = $true
    }
    Write-LocalDemoStatus -Status $(if ($changed) { 'updated' } else { 'already exists' }) -Resource "user $($Definition.email) ($($Definition.role))"
    return $existing
}

function Ensure-DemoApartmentType {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Token)
    $types = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartment-types' -Token $Token
    $existing = $types | Where-Object { $_.name -ieq $Definition.name } | Select-Object -First 1
    if ($null -eq $existing) {
        $created = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/apartment-types' -Token $Token -Body $Definition
        Write-LocalDemoStatus -Status 'created' -Resource "apartment type $($Definition.name)"
        return $created
    }
    if (-not $existing.active) {
        throw "Demo apartment type $($Definition.name) is inactive. The public API cannot reactivate a deactivated type."
    }
    Write-LocalDemoStatus -Status 'already exists' -Resource "apartment type $($Definition.name)"
    return $existing
}

function Ensure-DemoApartment {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Token)
    $apartments = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $Token
    $existing = $apartments | Where-Object { $_.name -ieq $Definition.name } | Select-Object -First 1
    if ($null -eq $existing) {
        $created = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $Token -Body $Definition
        Write-LocalDemoStatus -Status 'created' -Resource "apartment $($Definition.name)"
        return $created
    }
    if (-not $existing.active) {
        throw "Demo apartment $($Definition.name) is inactive. The public API cannot reactivate a deactivated apartment."
    }
    Write-LocalDemoStatus -Status 'already exists' -Resource "apartment $($Definition.name)"
    return $existing
}

function Ensure-DemoExpenseCategory {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Token)
    $categories = Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/expense-categories' -Token $Token
    $existing = $categories | Where-Object { $_.name -ieq $Definition.name } | Select-Object -First 1
    if ($null -eq $existing) {
        $created = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/expense-categories' -Token $Token -Body $Definition
        Write-LocalDemoStatus -Status 'created' -Resource "expense category $($Definition.name)"
        return $created
    }
    if (-not $existing.active -or $existing.description -ne $Definition.description) {
        $updated = Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path "/expense-categories/$($existing.expenseCategoryId)" -Token $Token -Body @{
            name = $Definition.name; description = $Definition.description; active = $true
        }
        Write-LocalDemoStatus -Status 'updated' -Resource "expense category $($Definition.name)"
        return $updated
    }
    Write-LocalDemoStatus -Status 'already exists' -Resource "expense category $($Definition.name)"
    return $existing
}

try {
    $ApiBaseUrl = Resolve-LocalDemoApiBaseUrl -ApiBaseUrl $ApiBaseUrl
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = Get-LocalDemoValue -Value $ManagerEmail -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email'
    Write-Host "Target confirmed: local demo API $ApiBaseUrl"

    $login = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{ email = $ManagerEmail; password = $DemoPassword }
    $token = $login.token
    if ([string]::IsNullOrWhiteSpace($token) -or $login.role -ne 'MANAGER') {
        throw 'Bootstrap manager login did not return a manager session.'
    }
    Write-LocalDemoStatus -Status 'already exists' -Resource "bootstrap manager $ManagerEmail (MANAGER)"

    $specializations = @()
    foreach ($specializationResponse in @(Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path '/specializations' -Token $token)) {
        $specializations += @($specializationResponse)
    }
    $requiredCodes = @('CLEANING', 'ELECTRICAL', 'PLUMBING', 'GENERAL_MAINTENANCE', 'INSPECTION', 'APARTMENT_PREPARATION')
    $specializationIds = @{}
    foreach ($code in $requiredCodes) {
        $specialization = $specializations | Where-Object { $_.code -eq $code } | Select-Object -First 1
        if ($null -eq $specialization) { throw "Required specialization $code is missing from the Flyway catalog." }
        $specializationIds[$code] = [int]($specialization.id)
    }

    $accounts = @(
        @{ email = 'demo.agent.one@bluestars.local'; password = $DemoPassword; name = 'Demo'; surname = 'Agent One'; jmbg = '1000000000001'; address = 'Demo Street 1'; phoneNumber = '+387 65 100 001'; role = 'AGENT'; specializationIds = @() },
        @{ email = 'demo.agent.two@bluestars.local'; password = $DemoPassword; name = 'Demo'; surname = 'Agent Two'; jmbg = '1000000000002'; address = 'Demo Street 2'; phoneNumber = '+387 65 100 002'; role = 'AGENT'; specializationIds = @() }
    )
    $workerNumber = 3
    foreach ($code in $requiredCodes) {
        $accounts += @{ email = "demo.worker.$($code.ToLowerInvariant())@bluestars.local"; password = $DemoPassword; name = 'Demo'; surname = "Worker $workerNumber"; jmbg = "100000000000$workerNumber"; address = "Demo Street $workerNumber"; phoneNumber = "+387 65 100 00$workerNumber"; role = 'OPERATIONAL_WORKER'; specializationIds = @($specializationIds[$code]) }
        $workerNumber++
    }
    foreach ($account in $accounts) { [void](Ensure-DemoUser -Definition $account -Token $token) }

    $typeDefinitions = @(
        @{ name = 'Demo Studio'; description = 'Local demo studio for one guest.'; capacity = 1; defaultNightlyRate = '65.00' },
        @{ name = 'Demo Double'; description = 'Local demo double room.'; capacity = 2; defaultNightlyRate = '95.00' },
        @{ name = 'Demo Family'; description = 'Local demo family apartment.'; capacity = 4; defaultNightlyRate = '145.00' }
    )
    $typeIds = @{}
    foreach ($type in $typeDefinitions) {
        $savedType = Ensure-DemoApartmentType -Definition $type -Token $token
        $typeIds[$type.name] = [int]($savedType.apartmentTypeId)
    }
    $apartmentDefinitions = @(
        @{ name = 'Demo A101'; address = 'Demo Street 10'; floor = 1; apartmentTypeId = $typeIds['Demo Studio'] },
        @{ name = 'Demo A102'; address = 'Demo Street 10'; floor = 1; apartmentTypeId = $typeIds['Demo Studio'] },
        @{ name = 'Demo B201'; address = 'Demo Street 10'; floor = 2; apartmentTypeId = $typeIds['Demo Double'] },
        @{ name = 'Demo B202'; address = 'Demo Street 10'; floor = 2; apartmentTypeId = $typeIds['Demo Double'] },
        @{ name = 'Demo B203'; address = 'Demo Street 10'; floor = 2; apartmentTypeId = $typeIds['Demo Double'] },
        @{ name = 'Demo C301'; address = 'Demo Street 10'; floor = 3; apartmentTypeId = $typeIds['Demo Family'] },
        @{ name = 'Demo C302'; address = 'Demo Street 10'; floor = 3; apartmentTypeId = $typeIds['Demo Family'] },
        @{ name = 'Demo C303'; address = 'Demo Street 10'; floor = 3; apartmentTypeId = $typeIds['Demo Family'] }
    )
    foreach ($apartment in $apartmentDefinitions) { [void](Ensure-DemoApartment -Definition $apartment -Token $token) }

    foreach ($category in @(
        @{ name = 'Demo Cleaning Supplies'; description = 'Consumable supplies for local demo analytics.' },
        @{ name = 'Demo Utilities'; description = 'Utility category for local demo analytics.' },
        @{ name = 'Demo Maintenance'; description = 'Maintenance category for local demo analytics.' },
        @{ name = 'Demo Laundry'; description = 'Laundry category for local demo analytics.' }
    )) { [void](Ensure-DemoExpenseCategory -Definition $category -Token $token) }

    $profile = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path '/hotel-profile' -Token $token
    $profileDefinition = @{ name = 'BlueStars Local Demo'; legalName = 'BlueStars Local Demo Hotel'; address = 'Demo Street 10'; city = 'Banja Luka'; countryCode = 'BA'; phoneNumber = '+38751000000'; email = 'demo.hotel@bluestars.local'; taxId = 'LOCAL-DEMO' }
    $profileChanged = @($profileDefinition.Keys | Where-Object { $profile.$_ -ne $profileDefinition[$_] }).Count -gt 0
    if ($profileChanged) {
        [void](Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path '/hotel-profile' -Token $token -Body $profileDefinition)
        Write-LocalDemoStatus -Status 'updated' -Resource 'hotel profile'
    } else { Write-LocalDemoStatus -Status 'already exists' -Resource 'hotel profile' }

    $accountsForLogin = @($accounts)
    $accountsForLogin += @{ email = $ManagerEmail; role = 'MANAGER' }
    foreach ($account in $accountsForLogin) {
        $accountLogin = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path '/auth/login' -Body @{ email = $account.email; password = $DemoPassword }
        if ([string]::IsNullOrWhiteSpace($accountLogin.token) -or $accountLogin.role -ne $account.role) { throw "Login verification failed for $($account.email)." }
    }
    Write-Host 'Demo accounts (password intentionally not shown):'
    Write-Host "  $ManagerEmail - MANAGER"
    foreach ($account in $accounts) { Write-Host "  $($account.email) - $($account.role)" }
    Write-Host 'Local demo seed completed successfully.'
} catch {
    Write-LocalDemoStatus -Status 'failed' -Resource 'local demo seed'
    Write-Error $_.Exception.Message
    exit 1
} finally {
    $token = $null
    $DemoPassword = $null
}
