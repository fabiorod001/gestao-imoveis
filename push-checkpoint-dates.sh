#!/bin/bash

echo "================================================"
echo "📌 CHECKPOINT: Ordenação cronológica das datas"
echo "================================================"
echo ""

# Adicionar todas as mudanças
git add -A

# Criar commit
git commit -m "Fix: Ordenação cronológica das datas na tabela pivot - Datas agora aparecem em ordem cronológica (set/2023 → ago/2025) - 13/08/2025 11:04"

# Fazer push
git push origin main

echo ""
echo "================================================"
echo "✅ CHECKPOINT CRIADO E ENVIADO AO GITHUB!"
echo "================================================"