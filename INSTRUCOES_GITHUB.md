# Instruções para Push no GitHub

## Opção 1: Usar o script automatizado (RECOMENDADO)

Execute no terminal:
```bash
./push_to_github.sh
```

## Opção 2: Comandos manuais

Execute estes comandos um por um no terminal:

```bash
# 1. Configurar suas credenciais
git config --global user.email "fabiorod001@gmail.com"
git config --global user.name "Fabio Rodrigues"

# 2. Remover locks se existirem
rm -f .git/index.lock
rm -f .git/config.lock

# 3. Configurar o repositório remoto
git remote remove origin
git remote add origin https://fabiorod001:${GITHUB_TOKEN}@github.com/fabiorod001/property-manager.git

# 4. Adicionar todos os arquivos
git add -A

# 5. Criar commit
git commit -m "Sistema completo de gestão de propriedades - checkpoint"

# 6. Fazer push forçado
git push -f origin main
```

## Repositórios disponíveis:

1. **property-manager** (recomendado): https://github.com/fabiorod001/property-manager
2. **gestao-imoveis**: https://github.com/fabiorod001/gestao-imoveis

## Importante:

- O token GITHUB_TOKEN já está configurado nas variáveis de ambiente
- O push será forçado (-f) para sobrescrever o conteúdo existente
- Todo o sistema será enviado, incluindo:
  - Frontend React completo
  - Backend Express com todas as APIs
  - Configurações do banco de dados
  - Todos os dados e transações

## Verificação:

Após o push, verifique em:
https://github.com/fabiorod001/property-manager

O sistema estará 100% independente do Replit e poderá ser clonado e executado em qualquer ambiente.