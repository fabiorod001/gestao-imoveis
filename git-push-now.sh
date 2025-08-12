#!/bin/bash

echo "====================================="
echo "PREPARANDO PUSH PARA O GITHUB"
echo "====================================="
echo ""

# Verificar status atual
echo "📊 Status atual do Git:"
git status --short
echo ""

# Adicionar todos os arquivos
echo "📦 Adicionando todos os arquivos..."
git add -A
echo ""

# Criar commit com data e hora
COMMIT_MSG="Update $(date '+%Y-%m-%d %H:%M:%S') - Importação completa Airbnb (histórico e futuro)"
echo "💾 Criando commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"
echo ""

# Fazer push
echo "🚀 Fazendo push para o GitHub..."
git push origin main

echo ""
echo "====================================="
echo "✅ PUSH CONCLUÍDO COM SUCESSO!"
echo "====================================="
echo ""
echo "Seu código foi enviado para o GitHub!"
echo "Checkpoint criado automaticamente pelo Replit."