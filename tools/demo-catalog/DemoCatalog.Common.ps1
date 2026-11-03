Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-DemoTypeDefinitions {
    return @(
        @{ name='Studio'; description='Udoban studio apartman za jednu osobu.'; capacity=1; defaultNightlyRate='65.00'; legacyName='Demo Studio'; legacyDescription='Local demo studio for one guest.' },
        @{ name='Standardni dvokrevetni apartman'; description='Dvokrevetni apartman sa prostorom za odmor.'; capacity=2; defaultNightlyRate='95.00'; legacyName='Demo Double'; legacyDescription='Local demo double room.' },
        @{ name='Porodični apartman'; description='Prostran apartman za porodicu do četiri osobe.'; capacity=4; defaultNightlyRate='145.00'; legacyName='Demo Family'; legacyDescription='Local demo family apartment.' }
    )
}

function Get-DemoCategoryDefinitions {
    return @(
        @{ name='Sredstva za čišćenje'; description='Sredstva za higijenu i čišćenje hotelskih prostora.'; legacyName='Demo Cleaning Supplies'; legacyDescription='Consumable supplies for local demo analytics.' },
        @{ name='Komunalni troškovi'; description='Električna energija, voda, grijanje i komunalne usluge.'; legacyName='Demo Utilities'; legacyDescription='Utility category for local demo analytics.' },
        @{ name='Održavanje i popravke'; description='Servisi, popravke i održavanje hotelske opreme.'; legacyName='Demo Maintenance'; legacyDescription='Maintenance category for local demo analytics.' },
        @{ name='Vešeraj i posteljina'; description='Pranje, peglanje i nabavka posteljine i peškira.'; legacyName='Demo Laundry'; legacyDescription='Laundry category for local demo analytics.' },
        @{ name='Potrošni materijal i oprema'; description='Potrošni materijal i sitna hotelska oprema.' },
        @{ name='Administrativni troškovi'; description='Kancelarijski materijal i administrativne usluge.' },
        @{ name='Pretplate i vanjske usluge'; description='Softverske pretplate i usluge vanjskih saradnika.' },
        @{ name='Ostalo'; description='Ostali operativni troškovi hotela.' }
    )
}

function Get-DemoApartmentDefinitions {
    param([Parameter(Mandatory)][hashtable]$TypeIds)
    foreach ($name in @('A101','A102','B201','B202','B203','C301','C302','C303')) {
        $typeName = if ($name.StartsWith('A')) { 'Studio' } elseif ($name.StartsWith('B')) { 'Standardni dvokrevetni apartman' } else { 'Porodični apartman' }
        @{ name=$name; address='Kralja Petra I Karađorđevića 10'; floor=[int]$name.Substring(1,1); apartmentTypeId=$TypeIds[$typeName]; legacyName="Demo $name"; legacyAddress='Demo Street 10' }
    }
}

function ConvertTo-DemoCatalogBody {
    param([Parameter(Mandatory)][hashtable]$Definition)
    $body = @{}
    foreach ($key in $Definition.Keys) { if ($key -notlike 'legacy*') { $body[$key] = $Definition[$key] } }
    return $body
}

function Assert-DemoCatalogDefinition {
    param([Parameter(Mandatory)]$Existing, [Parameter(Mandatory)][hashtable]$Definition)
    if (-not $Existing.active) { throw "Catalog item $($Definition.name) is inactive; refusing to reactivate or duplicate it." }
    $legacy = $Definition.ContainsKey('legacyName') -and $Existing.name -ieq $Definition.legacyName
    $body = ConvertTo-DemoCatalogBody $Definition
    foreach ($key in $body.Keys) {
        $expected = if ($legacy -and $key -eq 'name') { $Definition.legacyName } elseif ($legacy -and $key -eq 'description') { $Definition.legacyDescription } elseif ($legacy -and $key -eq 'address') { $Definition.legacyAddress } else { $body[$key] }
        $actual = if ($key -eq 'apartmentTypeId') { $Existing.type.apartmentTypeId } else { $Existing.$key }
        $equal = if ($key -eq 'defaultNightlyRate') { [decimal]$actual -eq [decimal]$expected } else { $actual -ceq $expected }
        if (-not $equal) { throw "Catalog item $($Definition.name) conflicts with the expected $key; no change was made to it." }
    }
    return $legacy
}

function Ensure-DemoCatalogItem {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$IdProperty, [Parameter(Mandatory)][string]$Token)
    $names = @($Definition.name)
    if ($Definition.ContainsKey('legacyName')) { $names += $Definition.legacyName }
    $matches = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path $Path -Token $Token | Where-Object { $_.name -in $names })
    if ($matches.Count -gt 1) { throw "Ambiguous or duplicate catalog item $($Definition.name); refusing to merge identities." }
    $body = ConvertTo-DemoCatalogBody $Definition
    if ($matches.Count -eq 0) {
        $result = Invoke-LocalDemoApi -Method POST -ApiBaseUrl $ApiBaseUrl -Path $Path -Token $Token -Body $body
        Write-LocalDemoStatus -Status 'created' -Resource "catalog item $($Definition.name)"
        return $result
    }
    $existing = $matches[0]
    $legacy = Assert-DemoCatalogDefinition -Existing $existing -Definition $Definition
    if ($legacy) {
        if ($Path -eq '/expense-categories') { $body.active = $true }
        $result = Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path "$Path/$($existing.$IdProperty)" -Token $Token -Body $body
        Write-LocalDemoStatus -Status 'updated' -Resource "catalog item $($Definition.name)"
        return $result
    }
    Write-LocalDemoStatus -Status 'already exists' -Resource "catalog item $($Definition.name)"
    return $existing
}

function Assert-DemoCatalogs {
    param([Parameter(Mandatory)]$Types, [Parameter(Mandatory)]$Apartments, [Parameter(Mandatory)]$Categories)
    $typeIds = @{}
    foreach ($definition in @(Get-DemoTypeDefinitions)) {
        $matches = @($Types | Where-Object name -ceq $definition.name)
        if ($matches.Count -ne 1) { throw "Expected exactly one apartment type $($definition.name)." }
        [void](Assert-DemoCatalogDefinition $matches[0] $definition)
        $typeIds[$definition.name] = $matches[0].apartmentTypeId
    }
    foreach ($definition in @(Get-DemoApartmentDefinitions $typeIds)) {
        $matches = @($Apartments | Where-Object name -ceq $definition.name)
        if ($matches.Count -ne 1) { throw "Expected exactly one apartment $($definition.name)." }
        [void](Assert-DemoCatalogDefinition $matches[0] $definition)
    }
    foreach ($definition in @(Get-DemoCategoryDefinitions)) {
        $matches = @($Categories | Where-Object name -ceq $definition.name)
        if ($matches.Count -ne 1) { throw "Expected exactly one expense category $($definition.name)." }
        [void](Assert-DemoCatalogDefinition $matches[0] $definition)
    }
    $legacyNames = @((Get-DemoTypeDefinitions).legacyName) + @((Get-DemoCategoryDefinitions | Where-Object { $_.ContainsKey('legacyName') }).legacyName) + @('Demo A101','Demo A102','Demo B201','Demo B202','Demo B203','Demo C301','Demo C302','Demo C303')
    if (@(@($Types)+@($Apartments)+@($Categories) | Where-Object { $_.name -in $legacyNames }).Count -gt 0) { throw 'Legacy demo catalog names remain.' }
}

function Assert-DemoCatalogPlan {
    param([Parameter(Mandatory)][string]$Token)
    $typeIds = @{}
    foreach ($group in @(
        @{ path='/apartment-types'; definitions=@(Get-DemoTypeDefinitions) },
        @{ path='/expense-categories'; definitions=@(Get-DemoCategoryDefinitions) }
    )) {
        $rows = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path $group.path -Token $Token)
        foreach ($definition in $group.definitions) {
            $names = @($definition.name)
            if ($definition.ContainsKey('legacyName')) { $names += $definition.legacyName }
            $matches = @($rows | Where-Object { $_.name -in $names })
            if ($matches.Count -gt 1) { throw "Ambiguous catalog item $($definition.name); no catalog writes were made." }
            if ($matches.Count -eq 1) {
                [void](Assert-DemoCatalogDefinition $matches[0] $definition)
                if ($group.path -eq '/apartment-types') { $typeIds[$definition.name] = $matches[0].apartmentTypeId }
            }
        }
    }
    $rows = @(Get-LocalDemoPagedContent -ApiBaseUrl $ApiBaseUrl -Path '/apartments' -Token $Token)
    foreach ($definition in @(Get-DemoApartmentDefinitions $typeIds)) {
        $matches = @($rows | Where-Object { $_.name -in @($definition.name,$definition.legacyName) })
        if ($matches.Count -gt 1) { throw "Ambiguous apartment $($definition.name); no catalog writes were made." }
        if ($matches.Count -eq 1) {
            if ($null -eq $definition.apartmentTypeId) { throw "Apartment $($definition.name) has no compatible catalog type; no catalog writes were made." }
            [void](Assert-DemoCatalogDefinition $matches[0] $definition)
        }
    }
}

function Ensure-DemoApartmentType {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Token)
    return Ensure-DemoCatalogItem $Definition '/apartment-types' 'apartmentTypeId' $Token
}

function Ensure-DemoApartment {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Token)
    return Ensure-DemoCatalogItem $Definition '/apartments' 'apartmentId' $Token
}

function Ensure-DemoExpenseCategory {
    param([Parameter(Mandatory)][hashtable]$Definition, [Parameter(Mandatory)][string]$Token)
    return Ensure-DemoCatalogItem $Definition '/expense-categories' 'expenseCategoryId' $Token
}

function Get-DemoHotelProfileDefinition {
    return @{ name='BlueStars'; legalName='BlueStars Hotel'; address='Kralja Petra I Karađorđevića 10'; city='Banja Luka'; countryCode='BA'; phoneNumber='+38751000000'; email='demo.hotel@bluestars.local'; taxId='DEMO' }
}

function Assert-DemoHotelProfile {
    param([Parameter(Mandatory)]$Profile)
    $canonical = Get-DemoHotelProfileDefinition
    $variants = @($canonical)
    foreach ($local in @($false,$true)) {
        $variant = @{} + $canonical
        $variant.name = if ($local) { 'BlueStars Local Demo' } else { 'BlueStars Demo' }
        $variant.legalName = if ($local) { 'BlueStars Local Demo Hotel' } else { 'BlueStars Demo Hotel' }
        $variant.address = 'Demo Street 10'
        $variant.taxId = if ($local) { 'LOCAL-DEMO' } else { 'DEMO' }
        $variants += $variant
    }
    foreach ($variant in $variants) {
        if (@($variant.Keys | Where-Object { $Profile.$_ -cne $variant[$_] }).Count -eq 0) { return }
    }
    $populatedFields = @($canonical.Keys | Where-Object { $_ -ne 'name' -and -not [string]::IsNullOrWhiteSpace($Profile.$_) })
    if ($Profile.name -ceq 'BlueStars Hotel' -and $populatedFields.Count -eq 0) { return }
    throw 'Existing hotel profile is not an exact recognized demo profile; refusing to overwrite it.'
}

function Ensure-DemoHotelProfile {
    param([Parameter(Mandatory)][string]$Token)
    $profile = Invoke-LocalDemoApi -Method GET -ApiBaseUrl $ApiBaseUrl -Path '/hotel-profile' -Token $Token
    Assert-DemoHotelProfile $profile
    $body = Get-DemoHotelProfileDefinition
    if (@($body.Keys | Where-Object { $profile.$_ -cne $body[$_] }).Count -gt 0) {
        [void](Invoke-LocalDemoApi -Method PUT -ApiBaseUrl $ApiBaseUrl -Path '/hotel-profile' -Token $Token -Body $body)
        Write-LocalDemoStatus -Status 'updated' -Resource 'hotel profile'
    } else { Write-LocalDemoStatus -Status 'already exists' -Resource 'hotel profile' }
}
