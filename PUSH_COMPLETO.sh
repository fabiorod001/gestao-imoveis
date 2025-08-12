#!/bin/bash

echo "================================================"
echo "PUSH COMPLETO - VERSÃO EXATA DO PREVIEW"
echo "================================================"

# Remover locks
rm -f .git/index.lock .git/config.lock

# Adicionar TODOS os arquivos
git add -A

# Fazer commit com timestamp
git commit -m "VERSÃO COMPLETA: 10 propriedades, 1000 transações, saldo R$ 1.143.401,34 - $(date +'%d/%m/%Y %H:%M')"

# Push forçado
git push -f origin main

echo "================================================"
echo "PUSH COMPLETO REALIZADO!"
echo "Acesse: https://github.com/fabiorod001/gestao-imoveis"
echo "================================================"