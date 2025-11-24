# Script de instalación de dependencias para Windows PowerShell

Write-Host "🚀 Instalando dependencias de la plataforma..." -ForegroundColor Cyan

function Install-Service {
    param($ServiceName)
    
    $servicePath = "services\$ServiceName"
    
    if (Test-Path $servicePath) {
        if (Test-Path "$servicePath\package.json") {
            Write-Host "📦 Instalando dependencias de $ServiceName..." -ForegroundColor Blue
            Set-Location $servicePath
            npm install
            Set-Location ..\..
            Write-Host "✅ $ServiceName instalado" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $ServiceName no tiene package.json" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  $ServiceName no encontrado" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Instalando microservicios ===`n" -ForegroundColor Blue

Install-Service "order-service"
Install-Service "auth-service"
Install-Service "restaurant-service"
Install-Service "delivery-service"
Install-Service "notification-service"
Install-Service "api-gateway"

Write-Host "`n🎉 ¡Todas las dependencias instaladas!`n" -ForegroundColor Green

