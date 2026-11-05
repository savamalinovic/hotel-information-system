$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\DemoCatalog.Common.ps1')
. (Join-Path $PSScriptRoot '..\DemoMedia.Common.ps1')

function Require([bool]$Value, [string]$Message) { if (-not $Value) { throw $Message } }
function Reject([scriptblock]$Action, [string]$Message) { try { & $Action } catch { return }; throw $Message }
function Write-LocalDemoStatus { }
$script:ApiBaseUrl = 'https://example.up.railway.app/api/v1'
$script:rows = @()
$script:writes = 0
function Get-LocalDemoPagedContent { return $script:rows }
function Invoke-LocalDemoApi {
    param([string]$Method,[string]$ApiBaseUrl,[string]$Path,[string]$Token,[hashtable]$Body)
    if ($Method -eq 'GET' -and $Path -like '/apartments/*') { return [pscustomobject]@{ pictures=@($script:pictures) } }
    $script:writes++
    $values = @{ apartmentTypeId=41; apartmentId=51; expenseCategoryId=61; active=$true }
    foreach ($key in $Body.Keys) { $values[$key] = $Body[$key] }
    $row = [pscustomobject]$values
    if ($Body.ContainsKey('apartmentTypeId')) { $row | Add-Member type ([pscustomobject]@{apartmentTypeId=$Body.apartmentTypeId}) }
    $script:rows = @($row)
    return $row
}

$type = (Get-DemoTypeDefinitions)[0]
[void](Ensure-DemoApartmentType $type 'private-test-value')
[void](Ensure-DemoApartmentType $type 'private-test-value')
Require ($script:writes -eq 1 -and $script:rows[0].name -ceq 'Studio') 'Fresh repeated catalog seed duplicated a type.'

$legacy = [pscustomobject]@{ apartmentTypeId=41; name=$type.legacyName; description=$type.legacyDescription; capacity=1; defaultNightlyRate='65.00'; active=$true }
$script:rows = @($legacy)
$script:writes = 0
$saved = Ensure-DemoApartmentType $type 'private-test-value'
[void](Ensure-DemoApartmentType $type 'private-test-value')
Require ($script:writes -eq 1 -and $saved.apartmentTypeId -eq 41) 'Legacy type migration did not preserve identity or repeat safely.'
$script:rows += $legacy
Reject { Ensure-DemoApartmentType $type 'private-test-value' } 'Ambiguous legacy and canonical identities were accepted.'
Require ($script:writes -eq 1) 'Ambiguous migration wrote data.'
$legacy.description='Unrelated edited property'
$script:rows=@($legacy)
Reject { Ensure-DemoApartmentType $type 'private-test-value' } 'Edited legacy data was overwritten.'
$legacy.description=$type.legacyDescription
$legacy.active=$false
Reject { Ensure-DemoApartmentType $type 'private-test-value' } 'Inactive legacy data was reactivated.'

$apartment = @(Get-DemoApartmentDefinitions @{'Studio'=41;'Standardni dvokrevetni apartman'=42;'Porodični apartman'=43})[0]
$script:rows = @([pscustomobject]@{ apartmentId=51; name='Demo A101'; address='Demo Street 10'; floor=1; active=$true; type=[pscustomobject]@{apartmentTypeId=99} })
Reject { Ensure-DemoApartment $apartment 'private-test-value' } 'Incompatible apartment type was overwritten.'
$script:rows[0].type.apartmentTypeId=41
$script:writes=0
$saved=Ensure-DemoApartment $apartment 'private-test-value'
[void](Ensure-DemoApartment $apartment 'private-test-value')
Require ($saved.apartmentId -eq 51 -and $script:writes -eq 1 -and $saved.name -ceq 'A101') 'Apartment migration failed to preserve identity.'

Require (@(Get-DemoTypeDefinitions).Count -eq 3) 'Expected three final apartment types.'
Require (@(Get-DemoCategoryDefinitions).Count -eq 8) 'Expected eight final expense categories.'
$sources = Get-DemoSourceMedia
Require ($sources.Count -eq 5) 'Expected five valid optimized source photos.'
Require (@(Get-DemoApartmentMedia 'C301').Count -eq 3) 'C301 gallery must have three images.'
foreach($name in @('A101','A102','B201','B202','B203','C302','C303')) { Require (@(Get-DemoApartmentMedia $name).Count -eq 1) "Missing media for $name." }
Reject { Assert-DemoMediaUrl 'https://example.com/photo.jpg' } 'Public unsigned media was accepted.'
Reject { Assert-DemoMediaUrl 'http://a123.r2.cloudflarestorage.com/a?X-Amz-Signature=x&X-Amz-Expires=600' } 'Cleartext remote media was accepted.'
Reject { Assert-DemoMediaUrl 'https://evil.example/a?X-Amz-Signature=x&X-Amz-Expires=600' } 'Unapproved remote storage was accepted.'

$script:pictures=@([pscustomobject]@{url='unrelated'})
$script:uploads=0
function Get-DemoMediaHash { param([string]$Url); return $Url }
function Send-DemoApartmentPicture {
    param([int]$ApartmentId,[string]$FilePath,[string]$Token)
    $script:uploads++
    $hash = Get-DemoBytesHash ([IO.File]::ReadAllBytes($FilePath))
    $picture=[pscustomobject]@{url=$hash}
    $script:pictures += $picture
    return $picture
}
$family=[pscustomobject]@{apartmentId=57;name='C301'}
Confirm-DemoApartmentPictures -Apartment $family -Sources $sources -Token 'private-test-value' -UploadMissing
Confirm-DemoApartmentPictures -Apartment $family -Sources $sources -Token 'private-test-value' -UploadMissing
Confirm-DemoApartmentPictures -Apartment $family -Sources $sources -Token 'private-test-value'
Require ($script:uploads -eq 3 -and $script:pictures.Count -eq 4) 'Repeated media seed duplicated images or removed unrelated content.'
$script:pictures=@()
Reject { Confirm-DemoApartmentPictures -Apartment $family -Sources $sources -Token 'private-test-value' } 'Read-only verification accepted missing photos.'
Require ($script:uploads -eq 3) 'Read-only verification performed an upload.'

# A committed upload whose response was lost must be found on the next run.
$studio=[pscustomobject]@{apartmentId=51;name='A101'}
function Send-DemoApartmentPicture {
    param([int]$ApartmentId,[string]$FilePath,[string]$Token)
    $script:uploads++
    $script:pictures += [pscustomobject]@{url=(Get-DemoBytesHash ([IO.File]::ReadAllBytes($FilePath)))}
    throw 'Simulated lost upload response.'
}
Reject { Confirm-DemoApartmentPictures -Apartment $studio -Sources $sources -Token 'private-test-value' -UploadMissing } 'Lost upload response unexpectedly succeeded.'
Confirm-DemoApartmentPictures -Apartment $studio -Sources $sources -Token 'private-test-value' -UploadMissing
Require ($script:uploads -eq 4 -and $script:pictures.Count -eq 1) 'Retry duplicated an upload after an ambiguous network result.'

function New-CatalogRow([hashtable]$Definition, [int]$Id) {
    $body=ConvertTo-DemoCatalogBody $Definition
    $body.active=$true
    $body.apartmentTypeId=$Id
    $body.apartmentId=$Id
    $body.expenseCategoryId=$Id
    if ($Definition.ContainsKey('apartmentTypeId')) { $body.type=[pscustomobject]@{apartmentTypeId=$Definition.apartmentTypeId} }
    return [pscustomobject]$body
}
$types=@(); $categories=@(); $apartments=@(); $typeIds=@{}; $nextId=0
foreach($definition in @(Get-DemoTypeDefinitions)) { $nextId++; $types+=New-CatalogRow $definition $nextId; $typeIds[$definition.name]=$nextId }
foreach($definition in @(Get-DemoCategoryDefinitions)) { $nextId++; $categories+=New-CatalogRow $definition $nextId }
foreach($definition in @(Get-DemoApartmentDefinitions $typeIds)) { $nextId++; $apartments+=New-CatalogRow $definition $nextId }
Assert-DemoCatalogs -Types $types -Apartments $apartments -Categories $categories
$script:groups=@{'/apartment-types'=$types;'/expense-categories'=$categories;'/apartments'=$apartments}
function Get-LocalDemoPagedContent { param($ApiBaseUrl,$Path,$Token); return $script:groups[$Path] }
Assert-DemoCatalogPlan -Token 'private-test-value'
$before=$script:writes
$types[0].capacity=9
Reject { Assert-DemoCatalogPlan -Token 'private-test-value' } 'Preflight accepted an incompatible catalog.'
Require ($before -eq $script:writes) 'Preflight wrote data before rejecting a conflict.'
$script:groups=@{'/apartment-types'=@();'/expense-categories'=@();'/apartments'=@()}
Assert-DemoCatalogPlan -Token 'private-test-value'

$profile=[pscustomobject](Get-DemoHotelProfileDefinition)
Assert-DemoHotelProfile $profile
$profile.name='Unrelated Hotel'
Reject { Assert-DemoHotelProfile $profile } 'Edited hotel identity was accepted.'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
foreach($file in @(Get-ChildItem -LiteralPath $root -Filter '*.ps1' -File -Recurse)) {
    $tokens=$null; $errors=$null
    [void][Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$errors)
    Require ($errors.Count -eq 0) "Parser errors in $($file.Name)."
}
Write-Host 'PASS: canonical catalogs, safe identity-preserving migration, conflict rejection, source hashes, private URL guards, media idempotency and lost-response recovery.'
