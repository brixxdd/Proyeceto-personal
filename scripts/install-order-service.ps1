# Script para instalar solo order-service (Windows PowerShell)

Write-Host "🚀 Instalando dependencias de order-service..." -ForegroundColor Cyan

$servicePath = "services\order-service"

if (-not (Test-Path $servicePath)) {
    Write-Host "❌ Error: Directorio order-service no encontrado" -ForegroundColor Red
    exit 1
}

Set-Location $servicePath

if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Ejecutando npm install..." -ForegroundColor Blue
npm install

Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Copia env.example a .env: Copy-Item env.example .env"
Write-Host "2. Edita .env con tus configuraciones"
Write-Host "3. Ejecuta: npm run dev"

Set-Location ..\..

