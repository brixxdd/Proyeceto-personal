#!/bin/bash

# Script para instalar solo order-service

set -e

echo "🚀 Instalando dependencias de order-service..."

cd services/order-service

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado"
    exit 1
fi

echo "📦 Ejecutando npm install..."
npm install

echo "✅ Dependencias instaladas correctamente"
echo ""
echo "📝 Próximos pasos:"
echo "1. Copia env.example a .env: cp env.example .env"
echo "2. Edita .env con tus configuraciones"
echo "3. Ejecuta: npm run dev"

