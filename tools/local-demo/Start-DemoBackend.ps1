[CmdletBinding()]
param(
    [string]$DatabaseName = 'bluestars_demo',
    [string]$PostgresHost = 'localhost',
    [ValidateRange(1, 65535)][int]$PostgresPort = 5432,
    [string]$PostgresUser,
    [string]$PostgresPassword,
    [string]$JwtSecret,
    [string]$DemoPassword,
    [string]$ManagerEmail,
    [string]$ManagerName,
    [string]$ManagerSurname,
    [string]$ManagerJmbg,
    [string]$ManagerAddress,
    [string]$ManagerPhone,
    [ValidateRange(1, 65535)][int]$ServerPort = 8080,
    [ValidateRange(10, 300)][int]$ReadinessTimeoutSeconds = 90
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'LocalDemo.Common.ps1')

function Resolve-Jdk17Home {
    $candidatePaths = @()
    foreach ($command in @(Get-Command java.exe -CommandType Application -ErrorAction SilentlyContinue)) {
        if ($command.PSObject.Properties['Source'] -and -not [string]::IsNullOrWhiteSpace([string]$command.Source)) { $candidatePaths += [string]$command.Source }
        elseif ($command.PSObject.Properties['Path'] -and -not [string]::IsNullOrWhiteSpace([string]$command.Path)) { $candidatePaths += [string]$command.Path }
    }
    $javaRoot = Join-Path $env:ProgramFiles 'Java'
    if (Test-Path -LiteralPath $javaRoot -PathType Container) {
        $candidatePaths += @(Get-ChildItem -LiteralPath $javaRoot -Directory | ForEach-Object {
            $candidate = Join-Path $_.FullName 'bin\java.exe'
            if (Test-Path -LiteralPath $candidate -PathType Leaf) { (Resolve-Path -LiteralPath $candidate).Path }
        })
    }
    $candidatePaths = @($candidatePaths | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { if (Test-Path -LiteralPath $_ -PathType Leaf) { (Resolve-Path -LiteralPath $_).Path } } | Sort-Object -Unique)
    foreach ($javaPath in $candidatePaths) {
        $javaVersion = (& $env:ComSpec /d /c "`"$javaPath`" -version 2>&1" | Select-Object -First 1).ToString()
        if ($javaVersion -match 'version "17(?:\.|\")') {
            $binDirectory = Split-Path -Parent $javaPath
            return Split-Path -Parent $binDirectory
        }
    }
    throw 'JDK 17 is required but no java.exe candidate reported major version 17.'
}

$ready = $false
try {
    Assert-LocalDemoHost -HostName $PostgresHost
    $DatabaseName = Assert-LocalDemoDatabaseName -DatabaseName $DatabaseName
    $PostgresUser = Get-LocalDemoValue -Value $PostgresUser -EnvironmentName 'POSTGRES_USER' -Label 'PostgreSQL user'
    $PostgresPassword = Get-LocalDemoValue -Value $PostgresPassword -EnvironmentName 'POSTGRES_PASSWORD' -Label 'PostgreSQL password'
    $JwtSecret = Get-LocalDemoValue -Value $JwtSecret -EnvironmentName 'BLUESTARS_JWT_SECRET' -Label 'JWT secret'
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = Get-LocalDemoValue -Value $ManagerEmail -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email'
    $ManagerName = Get-LocalDemoValue -Value $ManagerName -EnvironmentName 'BLUESTARS_DEMO_MANAGER_NAME' -Label 'Demo manager name'
    $ManagerSurname = Get-LocalDemoValue -Value $ManagerSurname -EnvironmentName 'BLUESTARS_DEMO_MANAGER_SURNAME' -Label 'Demo manager surname'
    $ManagerJmbg = Get-LocalDemoValue -Value $ManagerJmbg -EnvironmentName 'BLUESTARS_DEMO_MANAGER_JMBG' -Label 'Demo manager JMBG'
    $ManagerAddress = Get-LocalDemoValue -Value $ManagerAddress -EnvironmentName 'BLUESTARS_DEMO_MANAGER_ADDRESS' -Label 'Demo manager address'
    $ManagerPhone = Get-LocalDemoValue -Value $ManagerPhone -EnvironmentName 'BLUESTARS_DEMO_MANAGER_PHONE' -Label 'Demo manager phone'
    $jdk17Home = Resolve-Jdk17Home

    if (Get-NetTCPConnection -LocalPort $ServerPort -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $ServerPort is already in use. Stop the existing process before starting the local demo backend."
    }

    $repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $backendPath = Join-Path $repositoryRoot 'Projektovanje\backend\blueStars'
    $mavenWrapper = Join-Path $backendPath 'mvnw.cmd'
    $exampleConfig = Join-Path $backendPath 'src\main\resources\application.example.properties'
    if (-not (Test-Path -LiteralPath $mavenWrapper) -or -not (Test-Path -LiteralPath $exampleConfig)) {
        throw 'The backend Maven wrapper or example configuration could not be found relative to this script.'
    }

    $environmentUpdates = @{
        POSTGRES_HOST = $PostgresHost; POSTGRES_PORT = "$PostgresPort"; POSTGRES_DB = $DatabaseName
        POSTGRES_USER = $PostgresUser; POSTGRES_PASSWORD = $PostgresPassword; BLUESTARS_JWT_SECRET = $JwtSecret
        BLUESTARS_BOOTSTRAP_MANAGER_ENABLED = 'true'; BLUESTARS_BOOTSTRAP_MANAGER_EMAIL = $ManagerEmail
        BLUESTARS_BOOTSTRAP_MANAGER_PASSWORD = $DemoPassword; BLUESTARS_BOOTSTRAP_MANAGER_NAME = $ManagerName
        BLUESTARS_BOOTSTRAP_MANAGER_SURNAME = $ManagerSurname; BLUESTARS_BOOTSTRAP_MANAGER_JMBG = $ManagerJmbg
        BLUESTARS_BOOTSTRAP_MANAGER_ADDRESS = $ManagerAddress; BLUESTARS_BOOTSTRAP_MANAGER_PHONE = $ManagerPhone
        SERVER_PORT = "$ServerPort"
        SPRING_CONFIG_ADDITIONAL_LOCATION = "file:$exampleConfig"
        JAVA_HOME = $jdk17Home
        Path = "$jdk17Home\bin;$env:Path"
    }
    $previousEnvironment = @{}
    foreach ($item in $environmentUpdates.GetEnumerator()) {
        $previousEnvironment[$item.Key] = [Environment]::GetEnvironmentVariable($item.Key, 'Process')
        [Environment]::SetEnvironmentVariable($item.Key, $item.Value, 'Process')
    }

    try {
        $logPath = Join-Path ([IO.Path]::GetTempPath()) 'bluestars-local-demo-backend.out.log'
        $errorLogPath = Join-Path ([IO.Path]::GetTempPath()) 'bluestars-local-demo-backend.err.log'
        $process = Start-Process -FilePath $mavenWrapper -ArgumentList @('spring-boot:run') -WorkingDirectory $backendPath -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
        $state = Initialize-LocalDemoProcessState -LauncherProcessId $process.Id -ServerPort $ServerPort
    } finally {
        foreach ($item in $previousEnvironment.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($item.Key, $item.Value, 'Process')
        }
    }

    $deadline = (Get-Date).AddSeconds($ReadinessTimeoutSeconds)
    do {
        Start-Sleep -Seconds 2
        try {
            Update-LocalDemoProcessStateTree -State $state
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ServerPort/v3/api-docs/v1" -TimeoutSec 3 -ErrorAction Stop
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                $ready = $true
                Write-Host "Local demo backend is ready at http://127.0.0.1:$ServerPort/api/v1 (launcher PID $($process.Id))."
                Write-Host "Flyway ran through the normal Spring Boot startup path. Output: $logPath ; errors: $errorLogPath"
                return
            }
        } catch {
            if ($process.HasExited) {
                throw "Backend process stopped before readiness. Review $logPath and $errorLogPath."
            }
        }
    } while ((Get-Date) -lt $deadline)
    throw "Backend did not become ready within $ReadinessTimeoutSeconds seconds. Review $logPath and $errorLogPath."
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    if (-not $ready) { [void](Stop-LocalDemoOwnedProcess -ServerPort $ServerPort) }
}
