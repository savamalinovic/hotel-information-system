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

function Get-JavaMajorVersion {
    $javaVersion = (& $env:ComSpec /d /c 'java -version 2>&1' | Select-Object -First 1).ToString()
    if ($javaVersion -notmatch 'version "17(?:\.|\")') {
        throw "JDK 17 is required; java reported: $javaVersion"
    }
}

$ready = $false
try {
    Assert-LocalDemoHost -HostName $PostgresHost
    $DatabaseName = Assert-LocalDemoDatabaseName -DatabaseName $DatabaseName
    $PostgresUser = Get-LocalDemoValue -Value $PostgresUser -EnvironmentName 'POSTGRES_USER' -Label 'PostgreSQL user'
    $PostgresPassword = Get-LocalDemoValue -Value $PostgresPassword -EnvironmentName 'POSTGRES_PASSWORD' -Label 'PostgreSQL password'
    $JwtSecret = Get-LocalDemoValue -Value $JwtSecret -EnvironmentName 'EFIKAS_JWT_SECRET' -Label 'JWT secret'
    $DemoPassword = Get-LocalDemoValue -Value $DemoPassword -EnvironmentName 'BLUESTARS_DEMO_PASSWORD' -Label 'Demo password'
    $ManagerEmail = Get-LocalDemoValue -Value $ManagerEmail -EnvironmentName 'BLUESTARS_DEMO_MANAGER_EMAIL' -Label 'Demo manager email'
    $ManagerName = Get-LocalDemoValue -Value $ManagerName -EnvironmentName 'BLUESTARS_DEMO_MANAGER_NAME' -Label 'Demo manager name'
    $ManagerSurname = Get-LocalDemoValue -Value $ManagerSurname -EnvironmentName 'BLUESTARS_DEMO_MANAGER_SURNAME' -Label 'Demo manager surname'
    $ManagerJmbg = Get-LocalDemoValue -Value $ManagerJmbg -EnvironmentName 'BLUESTARS_DEMO_MANAGER_JMBG' -Label 'Demo manager JMBG'
    $ManagerAddress = Get-LocalDemoValue -Value $ManagerAddress -EnvironmentName 'BLUESTARS_DEMO_MANAGER_ADDRESS' -Label 'Demo manager address'
    $ManagerPhone = Get-LocalDemoValue -Value $ManagerPhone -EnvironmentName 'BLUESTARS_DEMO_MANAGER_PHONE' -Label 'Demo manager phone'
    Get-JavaMajorVersion

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
        POSTGRES_USER = $PostgresUser; POSTGRES_PASSWORD = $PostgresPassword; EFIKAS_JWT_SECRET = $JwtSecret
        EFIKAS_BOOTSTRAP_MANAGER_ENABLED = 'true'; EFIKAS_BOOTSTRAP_MANAGER_EMAIL = $ManagerEmail
        EFIKAS_BOOTSTRAP_MANAGER_PASSWORD = $DemoPassword; EFIKAS_BOOTSTRAP_MANAGER_NAME = $ManagerName
        EFIKAS_BOOTSTRAP_MANAGER_SURNAME = $ManagerSurname; EFIKAS_BOOTSTRAP_MANAGER_JMBG = $ManagerJmbg
        EFIKAS_BOOTSTRAP_MANAGER_ADDRESS = $ManagerAddress; EFIKAS_BOOTSTRAP_MANAGER_PHONE = $ManagerPhone
        SERVER_PORT = "$ServerPort"
        SPRING_CONFIG_ADDITIONAL_LOCATION = "file:$exampleConfig"
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
                exit 0
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
