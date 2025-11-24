#!/bin/bash

# Script de instalación de dependencias para todos los servicios

set -e

echo "🚀 Instalando dependencias de la plataforma..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para instalar dependencias de un servicio
install_service() {
    local service=$1
    if [ -d "services/$service" ] && [ -f "services/$service/package.json" ]; then
        echo -e "${BLUE}📦 Instalando dependencias de $service...${NC}"
        cd "services/$service"
        npm install
        cd ../..
        echo -e "${GREEN}✅ $service instalado${NC}"
    else
        echo -e "⚠️  $service no encontrado o sin package.json"
    fi
}

# Instalar dependencias de cada servicio
echo -e "\n${BLUE}=== Instalando microservicios ===${NC}\n"

install_service "order-service"
install_service "auth-service"
install_service "restaurant-service"
install_service "delivery-service"
install_service "notification-service"
install_service "api-gateway"

echo -e "\n${GREEN}🎉 ¡Todas las dependencias instaladas!${NC}\n"

