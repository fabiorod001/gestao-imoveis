# Como Rodar o Property Manager Localmente

## Pré-requisitos

1. **Node.js** (versão 18 ou superior)
   - Baixe em: https://nodejs.org/

2. **PostgreSQL** (versão 14 ou superior)
   - Opção 1: Instalar localmente: https://www.postgresql.org/download/
   - Opção 2: Usar Neon (grátis): https://neon.tech/

## Passo a Passo

### 1. Clonar o Projeto do GitHub

```bash
git clone https://github.com/fabiorod001/property-manager.git
cd property-manager
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar o Banco de Dados

#### Opção A: Usando PostgreSQL Local

1. Crie um banco de dados:
```sql
CREATE DATABASE property_manager;
```

2. Atualize o arquivo `.env`:
```
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/property_manager
```

#### Opção B: Usando Neon (Recomendado - Mais Fácil)

1. Crie uma conta gratuita em https://neon.tech/
2. Crie um novo projeto
3. Copie a connection string
4. Cole no arquivo `.env`:
```
DATABASE_URL=postgresql://usuario:senha@endpoint.neon.tech/nomedobanco?sslmode=require
```

### 4. Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL=sua_url_postgresql_aqui

# Configuração da Aplicação
NODE_ENV=development
PORT=5000
SESSION_SECRET=uma-senha-muito-segura-mude-isso

# Desabilitar autenticação Replit
REPLIT_AUTH_ENABLED=false

# URL do Frontend
VITE_API_URL=http://localhost:5000
```

### 5. Executar Migrações do Banco

```bash
npm run db:push
```

### 6. Rodar o Sistema

```bash
npm run dev
```

O sistema estará disponível em: http://localhost:5000

## Solucionando Problemas Comuns

### Erro: "Cannot find module"
```bash
npm install
```

### Erro: "Database connection failed"
- Verifique se o PostgreSQL está rodando
- Confirme a URL do banco no `.env`
- Se usar Neon, adicione `?sslmode=require` no final da URL

### Erro: "Port already in use"
- Mude a porta no `.env` para outra (ex: PORT=3000)

### Erro no Windows: "npm command not found"
- Reinstale o Node.js
- Ou use o terminal do VS Code/Cursor

## Diferenças do Replit

1. **Autenticação**: Sistema usa autenticação local simples (não precisa login)
2. **Uploads**: Arquivos são salvos em `/tmp` localmente
3. **Variáveis**: Todas configuradas via `.env`

## Importando Dados Existentes

Se você tem dados no Replit e quer migrar:

1. No Replit, exporte os dados:
   - Vá em Configurações > Exportar Dados
   - Baixe o backup SQL

2. Localmente, importe:
```bash
psql -U seu_usuario -d property_manager < backup.sql
```

## Suporte

- Problemas? Abra uma issue no GitHub
- O sistema foi otimizado para funcionar tanto no Replit quanto localmente
- A versão local tem as mesmas funcionalidades da versão Replit