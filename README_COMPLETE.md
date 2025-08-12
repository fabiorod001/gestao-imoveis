# Sistema de Gestão de Imóveis - RentManager

## 📋 Descrição Completa

Sistema profissional de gestão financeira para propriedades imobiliárias com funcionalidades avançadas de importação de dados (Airbnb, Excel), análise financeira, gestão de múltiplas propriedades e relatórios detalhados.

## 🚀 Funcionalidades Principais

### ✅ Gestão de Propriedades
- Cadastro de múltiplas propriedades
- Categorização por tipo (Airbnb, Aluguel Mensal, etc.)
- Status de disponibilidade
- Histórico completo de transações

### ✅ Importação de Dados
- **Airbnb**: Importação de CSVs de payouts e reservas futuras
- **Excel**: Importação de dados históricos
- Processamento inteligente e limpeza de dados
- Mapeamento automático de propriedades

### ✅ Gestão Financeira
- Receitas e despesas categorizadas
- Fluxo de caixa detalhado
- Análise de rentabilidade por propriedade
- Gestão de impostos (PIS, COFINS, CSLL, IRPJ, IPTU)

### ✅ Dashboard Analítico
- Visão geral em tempo real
- Gráficos interativos
- Tabelas dinâmicas com filtros avançados
- Exportação para Excel e PDF

### ✅ Relatórios
- Relatórios mensais/anuais
- Análise comparativa entre propriedades
- Projeções de receita
- Relatórios fiscais

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** para build rápido
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **Recharts** para gráficos
- **React Hook Form** + **Zod** para formulários

### Backend
- **Node.js** com Express
- **TypeScript**
- **PostgreSQL** como banco de dados
- **Drizzle ORM** para queries type-safe
- **JWT** para autenticação

### Infraestrutura
- **Docker** ready (opcional)
- **GitHub Actions** para CI/CD
- Suporte a múltiplos ambientes

## 📦 Instalação Completa

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 14+
- Git

### Passo a Passo

1. **Clone o repositório**
```bash
git clone https://github.com/fabiorod001/gestao-imoveis.git
cd gestao-imoveis
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**

Crie um arquivo `.env` na raiz:
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/gestao_imoveis
NODE_ENV=development
JWT_SECRET=sua-chave-secreta-aqui
PORT=5000
```

4. **Execute as migrações**
```bash
npm run db:push
```

5. **Inicie o sistema**
```bash
npm run dev
```

O sistema estará disponível em:
- Frontend: http://localhost:5000
- API: http://localhost:5000/api

## 🔧 Configuração Detalhada

### Banco de Dados PostgreSQL

1. **Instalação Local**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Baixe o instalador em https://www.postgresql.org/download/windows/
```

2. **Criar banco de dados**
```sql
CREATE DATABASE gestao_imoveis;
CREATE USER seu_usuario WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE gestao_imoveis TO seu_usuario;
```

### Variáveis de Ambiente

Crie um arquivo `.env` com todas as configurações:

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/gestao_imoveis

# Servidor
PORT=5000
NODE_ENV=development

# Autenticação
JWT_SECRET=chave-secreta-muito-segura-mude-isso
SESSION_SECRET=outra-chave-secreta-segura

# Opcional - Para produção
CORS_ORIGIN=https://seu-dominio.com
```

## 📂 Estrutura do Projeto

```
gestao-imoveis/
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilitários
│   └── index.html
├── server/               # Backend Express
│   ├── routes.ts         # Rotas da API
│   ├── storage.ts        # Camada de dados
│   └── index.ts          # Entry point
├── shared/               # Código compartilhado
│   └── schema.ts         # Schemas do banco
├── components/           # Componentes UI
│   └── ui/              # shadcn/ui components
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

## 🎯 Como Usar

### 1. Cadastrar Propriedades
- Acesse "Imóveis" no menu
- Clique em "Nova Propriedade"
- Preencha os dados e salve

### 2. Importar Dados do Airbnb
- Acesse "Importar Dados"
- Selecione o arquivo CSV do Airbnb
- Mapeie as propriedades
- Confirme a importação

### 3. Registrar Transações
- Acesse "Receitas" ou "Despesas"
- Clique em "Nova Transação"
- Preencha os dados
- Associe à propriedade

### 4. Visualizar Relatórios
- Acesse "Dashboard" para visão geral
- Use "Fluxo de Caixa" para análise temporal
- Exporte relatórios em Excel ou PDF

## 🔍 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Dados do usuário

### Propriedades
- `GET /api/properties` - Listar propriedades
- `POST /api/properties` - Criar propriedade
- `PUT /api/properties/:id` - Atualizar
- `DELETE /api/properties/:id` - Deletar

### Transações
- `GET /api/transactions` - Listar transações
- `POST /api/transactions` - Criar transação
- `PUT /api/transactions/:id` - Atualizar
- `DELETE /api/transactions/:id` - Deletar

### Analytics
- `GET /api/analytics/dashboard` - Dados do dashboard
- `GET /api/analytics/cash-flow` - Fluxo de caixa
- `GET /api/analytics/reports` - Relatórios

### Importação
- `POST /api/airbnb/import` - Importar CSV Airbnb
- `POST /api/excel/import` - Importar Excel

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
```bash
# Verifique se o PostgreSQL está rodando
sudo service postgresql status

# Teste a conexão
psql -U seu_usuario -d gestao_imoveis
```

### Erro de dependências
```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

### Porta já em uso
```bash
# Mude a porta no .env
PORT=3001
```

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev           # Inicia frontend e backend
npm run dev:server    # Apenas backend
npm run dev:client    # Apenas frontend

# Build
npm run build         # Build completo
npm run build:server  # Build do backend
npm run build:client  # Build do frontend

# Banco de dados
npm run db:push       # Aplica schema ao banco
npm run db:generate   # Gera migrações
npm run db:studio     # Interface visual do banco

# Testes e Qualidade
npm run lint          # Verifica código
npm run type-check    # Verifica tipos TypeScript
```

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

## 👤 Autor

**Fabio Rodrigues**
- GitHub: [@fabiorod001](https://github.com/fabiorod001)
- Email: fabiorod001@gmail.com

## 🆘 Suporte

Para suporte, envie email para fabiorod001@gmail.com

## 🔄 Versão

Versão atual: 1.0.0 (Agosto 2025)

---

**IMPORTANTE**: Este README contém TODAS as informações necessárias para rodar o projeto do zero, sem dependências do Replit.