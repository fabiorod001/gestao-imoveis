# 🔑 RESOLVER AUTENTICAÇÃO GITHUB

## Problema Identificado
GitHub removeu suporte a senha normal em 2021. Precisa de Personal Access Token.

## ✅ SOLUÇÃO RÁPIDA

### 1. Criar Personal Access Token no GitHub

1. **Acesse**: https://github.com/settings/tokens
2. **Clique**: "Generate new token" → "Generate new token (classic)"
3. **Nome**: "Replit - Gestão Imóveis"
4. **Permissões**: Marque apenas "repo" (acesso completo ao repositório)
5. **Clique**: "Generate token"
6. **COPIE O TOKEN** (você só verá uma vez!)

### 2. Execute no Shell do Replit:

```bash
# Configurar credencial com token
git remote set-url origin https://fabiorod001:SEU_TOKEN_AQUI@github.com/fabiorod001/gestao-imoveis.git
```

**Substitua "SEU_TOKEN_AQUI" pelo token que você copiou!**

### 3. Fazer o push:

```bash
git push -u origin main
```

## 🚀 ALTERNATIVA: SSH (Mais Seguro)

Se preferir usar SSH:

```bash
# Mudar para SSH
git remote set-url origin git@github.com:fabiorod001/gestao-imoveis.git

# Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "fabiorod001@gmail.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Adicionar no GitHub: Settings → SSH and GPG keys → New SSH key
```

## 🎯 OPÇÃO MAIS SIMPLES

Execute este comando substituindo pelo seu token:

```bash
git remote set-url origin https://fabiorod001:TOKEN_AQUI@github.com/fabiorod001/gestao-imoveis.git && git push -u origin main
```

**O token fica tipo: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx**