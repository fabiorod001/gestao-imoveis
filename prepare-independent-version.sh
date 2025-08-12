#!/bin/bash

# Script para preparar versão independente do Property Manager
echo "🚀 Preparando versão independente do Property Manager..."

# Criar diretório independente
mkdir -p property-manager-independent
cd property-manager-independent

# Copiar arquivos essenciais (sem dependências Replit)
echo "📁 Copiando estrutura de arquivos..."

# Copiar client completo
cp -r ../client ./

# Copiar shared completo
cp -r ../shared ./

# Criar server independente
mkdir -p server
cp ../server/index.ts ./server/
cp ../server/storage.ts ./server/
cp ../server/csvParser.ts ./server/
cp ../server/vite.ts ./server/
cp ../server/simpleAuth.ts ./server/
cp ../server/db-independent.ts ./server/db.ts

# Copiar routes.ts com importações corrigidas
cp ../server/routes.ts ./server/routes-temp.ts
sed 's/import { setupAuth, isAuthenticated } from ".\/replitAuth";/import { setupAuth, isAuthenticated, getUserId } from ".\/simpleAuth";/' ../server/routes.ts > ./server/routes.ts
sed -i 's/import { db } from ".\/db";/import { db } from ".\/db";/' ./server/routes.ts

# Copiar arquivos de configuração independentes
cp ../package.independent.json ./package.json
cp ../vite.config.independent.ts ./vite.config.ts
cp ../drizzle.config.ts ./
cp ../tsconfig.json ./
cp ../tailwind.config.ts ./
cp ../postcss.config.js ./
cp ../components.json ./

# Copiar documentação
cp ../README_INDEPENDENT.md ./README.md
cp ../.env.example ./
cp ../.gitignore ./

# Criar scripts de instalação
cat > ./install.sh << 'EOL'
#!/bin/bash
echo "🏢 Instalando Property Manager - Versão Independente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar .env
if [ ! -f .env ]; then
    echo "⚠️  Copiando arquivo .env de exemplo..."
    cp .env.example .env
    echo "🔧 CONFIGURE sua DATABASE_URL no arquivo .env!"
fi

echo "✅ Instalação concluída!"
echo ""
echo "🚀 Próximos passos:"
echo "1. Configure DATABASE_URL no arquivo .env"
echo "2. Execute: npm run db:push"
echo "3. Execute: npm run dev"
echo "4. Acesse: http://localhost:5000"
EOL

chmod +x ./install.sh

# Remover dependências Replit do package.json
echo "🧹 Removendo dependências proprietárias..."
npm pkg delete dependencies.@replit/vite-plugin-cartographer
npm pkg delete dependencies.@replit/vite-plugin-runtime-error-modal
npm pkg delete dependencies.openid-client
npm pkg delete dependencies.passport
npm pkg delete dependencies.passport-local
npm pkg delete dependencies.memoizee

# Adicionar dependência pg para PostgreSQL padrão
npm pkg set dependencies.pg="^8.11.3"
npm pkg set devDependencies.@types/pg="^8.10.9"

echo "✅ Versão independente criada em: property-manager-independent/"
echo ""
echo "🎯 O que foi feito:"
echo "   • Removidas todas as dependências Replit"
echo "   • Adicionada autenticação simples"
echo "   • Configurado PostgreSQL universal"
echo "   • Criados scripts de instalação"
echo ""
echo "🚀 Para usar:"
echo "   cd property-manager-independent"
echo "   ./install.sh"