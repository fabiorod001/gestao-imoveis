# Guia Passo a Passo - Push no GitHub (01/02/2025)

## Pré-requisitos
- Git instalado no seu computador
- Acesso ao repositório no GitHub
- Terminal/Git Bash aberto na pasta do projeto

## Passos para fazer o Push

### 1. Verifique o status atual
```bash
git status
```
Este comando mostra quais arquivos foram modificados.

### 2. Adicione os arquivos modificados
```bash
git add .
```
Ou adicione arquivos específicos:
```bash
git add QUICK_START.md replit.md
git add client/src/components/EditTransactionDialog.tsx
git add client/src/components/expenses/EditExpenseDialog.tsx
git add client/src/pages/expenses.tsx
git add client/src/pages/expenses/maintenance-detail.tsx
```

### 3. Faça o commit com uma mensagem descritiva
```bash
git commit -m "feat: Implementa Editor Universal de Transações

- Cria componente EditTransactionDialog para edição unificada
- Permite editar qualquer transação (receita ou despesa) 
- Adiciona formulário completo com todos os campos
- Implementa botão Eliminar entrada para excluir registros
- Integra editor em todas as páginas do sistema
- Atualiza documentação em QUICK_START.md e replit.md"
```

### 4. Verifique o branch atual
```bash
git branch
```
Você deve estar no branch `main` ou `master`.

### 5. Faça o push para o GitHub
```bash
git push origin main
```
Ou se o branch principal for `master`:
```bash
git push origin master
```

### 6. Se pedir credenciais
- **Username**: Seu nome de usuário do GitHub
- **Password**: Use um Personal Access Token (não a senha)
  - Para criar um token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token

## Comandos Alternativos

### Se houver conflitos
```bash
git pull origin main --rebase
git push origin main
```

### Para forçar o push (USE COM CUIDADO)
```bash
git push -f origin main
```

### Para ver o histórico de commits
```bash
git log --oneline -5
```

## Arquivos Modificados Nesta Sessão

1. **Novos arquivos criados:**
   - `client/src/components/EditTransactionDialog.tsx` - Componente universal de edição

2. **Arquivos modificados:**
   - `client/src/components/expenses/EditExpenseDialog.tsx` - Atualizado para novo design
   - `client/src/pages/expenses.tsx` - Integração com editor universal
   - `client/src/pages/expenses/maintenance-detail.tsx` - Integração com editor universal
   - `QUICK_START.md` - Documentação atualizada
   - `replit.md` - Arquitetura atualizada

## Resumo das Mudanças

✅ **Editor Universal de Transações**
- Formulário unificado para editar qualquer tipo de transação
- Funciona em todas as páginas do sistema
- Layout profissional estilo Dashboard Financeiro
- Campos completos editáveis
- Botão para eliminar entradas
- Salvamento sem duplicação

## Problemas Comuns

### "fatal: not a git repository"
```bash
git init
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
```

### "error: failed to push some refs"
```bash
git pull origin main
# Resolva conflitos se houver
git push origin main
```

### "Permission denied (publickey)"
Configure SSH ou use HTTPS:
```bash
git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
```

## Sucesso!
Após o push bem-sucedido, você verá uma mensagem como:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), Y bytes | Z KiB/s, done.
Total X (delta Y), reused 0 (delta 0)
To https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   abc1234..def5678  main -> main
```

---
**Dica**: Salve este guia para referência futura!