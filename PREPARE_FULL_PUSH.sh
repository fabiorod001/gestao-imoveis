#!/bin/bash
# Script para preparar e fazer push completo do projeto no GitHub

echo "=== PREPARAÇÃO COMPLETA PARA GITHUB ==="
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Configurar git
git config --global user.email "fabiorod001@gmail.com"
git config --global user.name "fabiorod001"

# Verificar e limpar arquivos desnecessários
echo "📋 Limpando arquivos temporários..."
rm -rf node_modules/.cache 2>/dev/null
rm -rf .next 2>/dev/null
rm -rf dist 2>/dev/null
rm -rf build 2>/dev/null

# Verificar .gitignore
echo "📝 Verificando .gitignore..."
if [ ! -f .gitignore ]; then
    echo "Criando .gitignore padrão..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Database
*.db
*.db-shm
*.db-wal
data/*.db
data/*.db-shm
data/*.db-wal

# Backups
backups/
*.backup
*.bak

# Temporary files
tmp/
temp/
*.tmp

# Logs
logs/
*.log

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
Thumbs.db
EOF
fi

# Adicionar todos os arquivos importantes
echo ""
echo "📦 Adicionando arquivos ao git..."
git add -A

# Verificar status
echo ""
echo "📊 Status do repositório:"
git status --short | head -20
TOTAL_FILES=$(git status --short | wc -l)
echo "Total de arquivos modificados: $TOTAL_FILES"

# Criar commit
echo ""
echo "💾 Criando commit completo..."
git commit -m "Push completo: Sistema de gestão de imóveis 100% funcional - $(date '+%Y-%m-%d %H:%M')" \
         -m "- Sistema completo de gestão financeira de imóveis" \
         -m "- Importação de dados Airbnb e Excel" \
         -m "- Dashboard com analytics avançado" \
         -m "- Gestão de receitas e despesas" \
         -m "- Fluxo de caixa detalhado" \
         -m "- Múltiplas propriedades" \
         -m "- Relatórios e exportação" \
         -m "- Interface responsiva" \
         -m "- Banco de dados PostgreSQL" \
         -m "- Autenticação completa"

# Verificar branch atual
BRANCH=$(git branch --show-current)
echo ""
echo "🌿 Branch atual: $BRANCH"

# Fazer push
echo ""
echo "🚀 Enviando para GitHub..."
echo "Digite suas credenciais quando solicitado:"
echo "Username: fabiorod001"
echo "Password: [seu Personal Access Token]"
echo ""
git push origin $BRANCH --force-with-lease

echo ""
echo "✅ Push completo realizado!"
echo ""
echo "📌 Para verificar no GitHub:"
echo "https://github.com/fabiorod001/gestao-imoveis"
echo ""
echo "📥 Para clonar em outro lugar:"
echo "git clone https://github.com/fabiorod001/gestao-imoveis.git"