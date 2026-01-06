# Script para construir y subir la imagen Docker del frontend (ERP Snabbit - React/Vite)
# Uso básico:
#   .\build-and-push-frontend.ps1
# Personalizado:
#   .\build-and-push-frontend.ps1 -Registry contenedores.snabbit.cl -ImageName erpsnabbit-frontend -ViteApiUrl https://apiv1.snabbit.cl
# Flags:
#   -UseOptimized   (si tienes un Dockerfile.optimized en frontend/)
#   -NoCache        (fuerza docker build sin usar cache)
#
# Nota: Vite solo expone variables al build si empiezan con VITE_.
# Este script pasa VITE_API_URL como build-arg opcional.

param(
    [string]$Registry = 'contenedores.snabbit.cl',
    [string]$ImageName = 'erpsnabbit-frontend',
    [string]$ViteApiUrl = '',
    [switch]$UseOptimized = $false,
    [switch]$NoCache = $false
)

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
    Write-Host ('=' * 65) -ForegroundColor Cyan
    Write-Host $title -ForegroundColor Yellow
    Write-Host ''
}

function Fail($msg) {
    Write-Host "[ERROR] $msg" -ForegroundColor Red
    exit 1
}

Write-Host ('=' * 65) -ForegroundColor Cyan
Write-Host '  BUILD Y PUSH FRONTEND (ERP SNABBIT - React/Vite)' -ForegroundColor Cyan
Write-Host ('=' * 65) -ForegroundColor Cyan
Write-Host ''
Write-Host 'Configuración:' -ForegroundColor Yellow
Write-Host "  Registro: $Registry" -ForegroundColor White
Write-Host "  Imagen:   $ImageName" -ForegroundColor White
$DATE = Get-Date -Format 'ddMMyyyy-HHmm'
Write-Host "  Tag:      $DATE" -ForegroundColor White
if ($ViteApiUrl) { Write-Host "  VITE_API_URL: $ViteApiUrl" -ForegroundColor White }
Write-Host "  Dockerfile: $(if ($UseOptimized) { 'Dockerfile.optimized' } else { 'Dockerfile' })" -ForegroundColor White
Write-Host ''

# Verificar raíz (existencia de Dockerfile en frontend)
if (-not (Test-Path './frontend/Dockerfile')) {
    Fail 'Debes ejecutar este script desde la raíz del monorepo (donde está la carpeta frontend/)'
}
if ($UseOptimized -and -not (Test-Path './frontend/Dockerfile.optimized')) {
    Fail 'Se indicó -UseOptimized pero no existe frontend/Dockerfile.optimized'
}

Write-Section 'Paso 1: Build imagen'

$dockerfilePath = if ($UseOptimized) { './frontend/Dockerfile.optimized' } else { './frontend/Dockerfile' }

$buildArgs = @('build', '-t', "${ImageName}:dev", '-f', $dockerfilePath)
if ($NoCache) { $buildArgs += '--no-cache' }
if ($ViteApiUrl) { $buildArgs += @('--build-arg', "VITE_API_URL=$ViteApiUrl") }
$buildArgs += './frontend'

Write-Host "Ejecutando: docker $($buildArgs -join ' ')" -ForegroundColor Cyan

try {
    docker @buildArgs
} catch {
    Fail "Fallo en docker build: $($_.Exception.Message)"
}

if ($LASTEXITCODE -ne 0) { Fail 'docker build retornó código distinto de 0' }
Write-Host '[OK] Build completado' -ForegroundColor Green
Write-Host ''

# Tamaño de imagen
$imageSize = docker images "${ImageName}:dev" --format '{{.Size}}'
Write-Host "Tamaño imagen dev: $imageSize" -ForegroundColor Cyan
Write-Host ''

Write-Section 'Paso 2: Creando tags'

$timestampTag = "${Registry}/${ImageName}:${DATE}"
$latestTag    = "${Registry}/${ImageName}:latest"

try {
    docker tag "${ImageName}:dev" $timestampTag
    docker tag "${ImageName}:dev" $latestTag
} catch {
    Fail "Error creando tags: $($_.Exception.Message)"
}

Write-Host "  [OK] $timestampTag" -ForegroundColor Green
Write-Host "  [OK] $latestTag" -ForegroundColor Green
Write-Host ''

Write-Section 'Paso 3: Login al registro'

$ErrorActionPreference = 'Continue'
$loginOutput = docker login $Registry 2>&1 | Out-String
$ErrorActionPreference = 'Stop'

if ($loginOutput -match 'Login Succeeded' -or $loginOutput -match 'Authenticating with existing credentials') {
    Write-Host "[OK] Autenticado en $Registry" -ForegroundColor Green
} else {
    Write-Host $loginOutput -ForegroundColor Red
    Fail 'Error de autenticación (revisa credenciales docker login)'
}
Write-Host ''

Write-Section 'Paso 4: Push de imágenes'

Write-Host 'Pusheando tag con timestamp...' -ForegroundColor Cyan
try { docker push $timestampTag } catch { Fail "Error push timestamp: $($_.Exception.Message)" }
if ($LASTEXITCODE -ne 0) { Fail 'docker push (timestamp) retornó código distinto de 0' }
Write-Host '[OK] Push timestamp completado' -ForegroundColor Green
Write-Host ''

Write-Host 'Pusheando tag latest...' -ForegroundColor Cyan
try { docker push $latestTag } catch { Write-Host '[WARNING] Error push latest (timestamp ya subido)' -ForegroundColor Yellow }
if ($LASTEXITCODE -eq 0) { Write-Host '[OK] Push latest completado' -ForegroundColor Green } else { Write-Host '[WARNING] Falló push latest (continuar)' -ForegroundColor Yellow }
Write-Host ''

Write-Host ('=' * 65) -ForegroundColor Green
Write-Host '  PROCESO FRONTEND COMPLETADO' -ForegroundColor Green
Write-Host ('=' * 65) -ForegroundColor Green
Write-Host ''
Write-Host 'Tags disponibles:' -ForegroundColor Yellow
Write-Host "  - $timestampTag" -ForegroundColor White
Write-Host "  - $latestTag" -ForegroundColor White
Write-Host ''
Write-Host 'Para usar en Kubernetes/Deployment:' -ForegroundColor Yellow
Write-Host "  image: $timestampTag" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Ejemplos:' -ForegroundColor Yellow
Write-Host "  .\\build-and-push-frontend.ps1" -ForegroundColor White
Write-Host "  .\\build-and-push-frontend.ps1 -ViteApiUrl https://apiv1.snabbit.cl" -ForegroundColor White
Write-Host "  .\\build-and-push-frontend.ps1 -Registry contenedores.snabbit.cl -NoCache" -ForegroundColor White
Write-Host "  .\\build-and-push-frontend.ps1 -UseOptimized -ViteApiUrl https://apiv1.snabbit.cl" -ForegroundColor White
Write-Host ''
