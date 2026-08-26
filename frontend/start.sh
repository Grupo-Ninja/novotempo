#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== JP Agro — Setup ==="

# Install dependencies
echo "📦 Instalando dependências..."
npm install

# Build
echo "🏗️  Fazendo build..."
npm run build

echo ""
echo "✅ Sistema pronto!"
echo "🚀 Para iniciar: npm start"
echo ""
echo "Credenciais:"
echo "  Admin: admin@novotempo.com / admin123"
echo "  Leitura: leitura@novotempo.com / leitura123"

