# Script para construir y subir backend (ERP Snabbit) a un registro Docker privado
# Uso:
#   .\build-and-push-backend.ps1
#   .\build-and-push-backend.ps1 -Registry contenedores.snabbit.cl -ImageName erpsnabbit-backend
#   .\build-and-push-backend.ps1 -UseOptimized

param(
    [string]$Registry = "contenedores.snabbit.cl",
    [string]$ImageName = "erpsnabbit-backend",
    [switch]$UseOptimized = $false
)

$ErrorActionPreference = "Stop"

# Configuracion
$DATE = Get-Date -Format 'ddMMyyyy-HHmm'

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  BUILD Y PUSH BACKEND ERP SNABBIT" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuracion:" -ForegroundColor Yellow
Write-Host "  Registro: $Registry" -ForegroundColor White
Write-Host "  Imagen: $ImageName" -ForegroundColor White
Write-Host "  Tag versión: $DATE" -ForegroundColor White
Write-Host "  Dockerfile: $(if ($UseOptimized) { 'Dockerfile.optimized' } else { 'Dockerfile' })" -ForegroundColor White
Write-Host ""

# Verificar que estamos en la raiz del monorepo
if (-not (Test-Path ".\backend\Dockerfile")) {
    Write-Host "[ERROR] Debes ejecutar este script desde la raiz del monorepo" -ForegroundColor Red
    exit 1
}

if ($UseOptimized -and -not (Test-Path ".\backend\Dockerfile.optimized")) {
    Write-Host "[ERROR] Se indicó -UseOptimized pero no existe .\backend\Dockerfile.optimized" -ForegroundColor Red
    exit 1
}

# Paso 1: Build
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Paso 1: Construyendo imagen..." -ForegroundColor Yellow
Write-Host ""

if ($UseOptimized) {
    docker build -f .\backend\Dockerfile.optimized -t ${ImageName}:dev .\backend\
} else {
    docker build -t ${ImageName}:dev .\backend\
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error en build" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Build completado" -ForegroundColor Green
Write-Host ""

# Verificar tamanio
$imageSize = docker images ${ImageName}:dev --format "{{.Size}}"
Write-Host "Tamanio de imagen: $imageSize" -ForegroundColor Cyan
Write-Host ""

# Paso 2: Tags
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Paso 2: Creando tags..." -ForegroundColor Yellow
Write-Host ""

$timestampTag = "${Registry}/${ImageName}:${DATE}"
$latestTag = "${Registry}/${ImageName}:latest"

docker tag ${ImageName}:dev $timestampTag
docker tag ${ImageName}:dev $latestTag

Write-Host "  [OK] $timestampTag" -ForegroundColor Green
Write-Host "  [OK] $latestTag" -ForegroundColor Green
Write-Host ""

# Paso 3: Login (si es necesario)
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Paso 3: Verificando autenticacion..." -ForegroundColor Yellow
Write-Host ""

# Capturar salida y error juntos, sin detener el script
$ErrorActionPreference = "Continue"
$loginOutput = docker login $Registry 2>&1 | Out-String
$ErrorActionPreference = "Stop"

if ($loginOutput -match "Login Succeeded" -or $loginOutput -match "Authenticating with existing credentials") {
    Write-Host "[OK] Autenticado en $Registry" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Error de autenticacion" -ForegroundColor Red
    Write-Host $loginOutput -ForegroundColor Red
    exit 1
}
Write-Host ""

# Paso 4: Push
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Paso 4: Subiendo imágenes al registro..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Pusheando versión con timestamp ($DATE)..." -ForegroundColor Cyan
docker push $timestampTag

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al pushear imagen con timestamp" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "  1. Limite de tamanio del registro (413 Request Entity Too Large)" -ForegroundColor White
    Write-Host "  2. Problemas de red o timeout" -ForegroundColor White
    Write-Host "  3. Permisos insuficientes en el registro" -ForegroundColor White
    Write-Host ""
    Write-Host "Soluciones:" -ForegroundColor Yellow
    Write-Host "  - Si es limite de tamanio: ejecuta con -UseOptimized" -ForegroundColor White
    Write-Host "  - Contacta al equipo de infraestructura para aumentar limites" -ForegroundColor White
    Write-Host "  - Verifica permisos en el registro" -ForegroundColor White
    exit 1
}

Write-Host "[OK] Push con timestamp completado" -ForegroundColor Green
Write-Host ""

Write-Host "Pusheando latest..." -ForegroundColor Cyan
docker push $latestTag

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Error al pushear latest (pero timestamp ya esta)" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Push latest completado" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  PROCESO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Imagenes disponibles en el registro:" -ForegroundColor Yellow
Write-Host "  - $timestampTag" -ForegroundColor White
Write-Host "  - $latestTag" -ForegroundColor White
Write-Host ""
Write-Host "Para desplegar en Kubernetes, usa:" -ForegroundColor Yellow
Write-Host "  image: $timestampTag" -ForegroundColor Cyan
Write-Host ""
