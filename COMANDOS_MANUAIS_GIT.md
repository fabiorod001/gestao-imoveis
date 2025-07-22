# 🚨 COMANDOS MANUAIS PARA ENVIAR AO GITHUB

## O Problema
O Replit está bloqueando as operações git automáticas. Você precisa executar manualmente.

## ✅ SOLUÇÃO: Execute estes comandos no Shell do Replit

### 1. Abra o Shell do Replit
- Clique na aba "Shell" no painel inferior do Replit
- Ou use Ctrl+Shift+S

### 2. Execute estes comandos um por um:

```bash
# Corrigir remote (está mal configurado)
git remote remove origin
git remote add origin https://github.com/fabiorod001/gestao-imoveis.git

# Verificar se está correto
git remote -v
```

### 3. Configurar usuário (se necessário):
```bash
git config user.name "Fabio Rodrigues"
git config user.email "fabiorod001@gmail.com"
```

### 4. Adicionar arquivos principais:
```bash
git add client/ server/ shared/
git add package.json package-lock.json
git add tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js
git add drizzle.config.ts components.json
git add README.md .env.example replit.md
git add .gitignore
```

### 5. Fazer commit:
```bash
git commit -m "feat: Sistema completo de gestão imobiliária - Backup 12

- Dashboard financeiro com análise por propriedade
- Integração Airbnb com importação automática  
- Sistema de despesas hierárquico por categoria
- Fluxo de caixa com projeções futuras
- Relatórios Excel/PDF profissionais
- Cálculo de margem com correção IPCA
- Sistema 100% portável e independente"
```

### 6. Enviar para GitHub:
```bash
git branch -M main
git push -u origin main
```

## 🔍 Se der erro de autenticação:

1. **Erro de senha**: Use Personal Access Token do GitHub
2. **Acesse**: GitHub → Settings → Developer settings → Personal access tokens
3. **Crie um token** com permissões de repositório
4. **Use o token como senha** quando pedir

## ✅ Verificação Final

Após o push, vá ao GitHub e verifique se aparecem:
- Pastas: client/, server/, shared/
- Arquivos: package.json, README.md, .env.example

## 🎯 Por que fazer manual?

O Replit protege operações git para evitar problemas. É normal fazer manualmente.

**EXECUTE UM COMANDO POR VEZ NO SHELL DO REPLIT!**