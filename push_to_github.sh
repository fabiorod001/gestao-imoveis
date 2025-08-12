#!/bin/bash

# Script para fazer push do Property Manager para o GitHub
# Autor: Fabio Rodrigues
# Data: 12/08/2025

echo "================================================"
echo "Push para GitHub - Property Manager"
echo "================================================"

# Configurar credenciais
echo "Configurando Git..."
git config --global user.email "fabiorod001@gmail.com"
git config --global user.name "Fabio Rodrigues"

# Remover locks se existirem
rm -f .git/index.lock
rm -f .git/config.lock

# Configurar o repositório remoto
echo "Configurando repositório remoto..."
git remote remove origin 2>/dev/null
git remote add origin https://fabiorod001:${GITHUB_TOKEN}@github.com/fabiorod001/property-manager.git

# Adicionar todos os arquivos
echo "Adicionando arquivos..."
git add -A

# Fazer commit
echo "Criando commit..."
git commit -m "Sistema completo de gestão de propriedades - versão checkpoint $(date +'%d/%m/%Y %H:%M')"

# Fazer push
echo "Enviando para GitHub..."
git push -f origin main

echo "================================================"
echo "Push concluído com sucesso!"
echo "Acesse: https://github.com/fabiorod001/property-manager"
echo "================================================"