# INSTALAÇÃO 100% INDEPENDENTE DO SISTEMA

## ✅ SISTEMA COMPLETAMENTE PORTÁVEL

Este sistema é **100% INDEPENDENTE** e pode ser executado em:
- ✅ Localhost (Windows/Mac/Linux)
- ✅ VPS (DigitalOcean, Linode, etc.)
- ✅ Cloud (AWS, Google Cloud, Azure)
- ✅ Docker
- ✅ Qualquer servidor Node.js

## REQUISITOS MÍNIMOS

1. **Node.js** 18+ (ou 20+)
2. **PostgreSQL** 14+ (qualquer instância)
3. **NPM** ou Yarn

## INSTALAÇÃO PASSO A PASSO

### 1. Clone o repositório
```bash
git clone [seu-repositorio]
cd [pasta-do-projeto]
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados PostgreSQL

**Opção A - PostgreSQL Local:**
```bash
# Instale PostgreSQL na sua máquina
# Ubuntu/Debian
sudo apt-get install postgresql

# Mac
brew install postgresql

# Windows - baixe o instalador em postgresql.org
```

**Opção B - PostgreSQL Cloud (100% grátis):**
- Supabase: https://supabase.com (free tier)
- Neon: https://neon.tech (free tier)
- ElephantSQL: https://elephantsql.com (free tier)

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
# Copie o exemplo
cp .env.example .env

# Edite com suas configurações
nano .env  # ou use seu editor preferido
```

**Conteúdo do .env:**
```env
# Conexão com PostgreSQL (local ou cloud)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/rentmanager

# Ambiente
NODE_ENV=development

# Porta (opcional, padrão 5173)
PORT=5173

# Segurança - gere uma chave aleatória
SESSION_SECRET=sua-chave-secreta-aqui-32-caracteres-min
```

### 5. Inicialize o banco de dados
```bash
# Crie as tabelas
npm run db:push
```

### 6. Execute o sistema
```bash
# Modo desenvolvimento
npm run dev

# Acesse: http://localhost:5173
```

## DEPLOY EM PRODUÇÃO

### Opção 1 - VPS (DigitalOcean, Linode, etc.)

```bash
# No servidor
git clone [repositorio]
cd [projeto]
npm install
npm run build
NODE_ENV=production npm start
```

### Opção 2 - Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "start"]
```

```bash
docker build -t rentmanager .
docker run -p 5173:5173 \
  -e DATABASE_URL=postgresql://... \
  -e SESSION_SECRET=... \
  rentmanager
```

### Opção 3 - PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start npm --name "rentmanager" -- start
pm2 save
pm2 startup
```

## VARIÁVEIS DE AMBIENTE

| Variável | Obrigatória | Descrição | Exemplo |
|----------|------------|-----------|---------|
| DATABASE_URL | ✅ Sim | Conexão PostgreSQL | postgresql://user:pass@host:5432/db |
| NODE_ENV | ❌ Não | Ambiente (development/production) | production |
| PORT | ❌ Não | Porta do servidor | 5173 |
| SESSION_SECRET | ✅ Sim | Chave de sessão (32+ chars) | abc123xyz789... |

## TROUBLESHOOTING

### Erro: "Cannot find module pg"
```bash
npm install pg @types/pg
```

### Erro: "DATABASE_URL not set"
Verifique seu arquivo .env e confirme que DATABASE_URL está configurado

### Erro de conexão com PostgreSQL
- Verifique se PostgreSQL está rodando
- Confirme usuário/senha/porta
- Teste conexão: `psql -U usuario -d banco`

## GARANTIA DE INDEPENDÊNCIA

✅ **ZERO dependências Replit**
✅ **Usa PostgreSQL padrão (driver 'pg')**
✅ **Autenticação local simples**
✅ **Funciona em QUALQUER ambiente Node.js**

## SUPORTE

Sistema 100% open source e independente.
Funciona em qualquer lugar sem amarras proprietárias.