# Sistema de Gestão Imobiliária - Documentação Técnica

## 📋 Visão Geral

Sistema completo de gestão financeira para portfólio de propriedades imobiliárias com integração Airbnb, análise de fluxo de caixa e relatórios detalhados.

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica

#### Frontend
- **React 18** - Biblioteca principal para interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Wouter** - Roteamento client-side
- **TanStack Query** - Gerenciamento de estado do servidor
- **React Hook Form** - Gerenciamento de formulários
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn/UI** - Componentes de interface
- **Radix UI** - Componentes headless acessíveis
- **Lucide React** - Ícones
- **Recharts** - Gráficos e visualizações
- **Date-fns** - Manipulação de datas
- **Framer Motion** - Animações

#### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Tipagem estática
- **Drizzle ORM** - ORM type-safe
- **Neon Database SDK** - Driver serverless para PostgreSQL
- **PostgreSQL** - Banco de dados principal
- **Express Session** - Gerenciamento de sessões
- **Passport.js** - Autenticação
- **Multer** - Upload de arquivos
- **CSV Parse** - Processamento de CSV
- **ExcelJS** - Manipulação de planilhas
- **jsPDF** - Geração de PDFs

#### Ferramentas de Desenvolvimento
- **ESBuild** - Bundler para produção
- **TSX** - Execução TypeScript
- **Drizzle Kit** - Migrações de banco
- **PostCSS** - Processamento CSS
- **Autoprefixer** - Prefixos CSS automáticos

## 📁 Estrutura do Projeto

```
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── ui/            # Componentes base (Shadcn/UI)
│   │   │   └── layout/        # Componentes de layout
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilitários e configurações
│   └── index.html             # Template HTML
├── server/                     # Backend Express
│   ├── index.ts               # Servidor principal
│   ├── routes.ts              # Rotas da API
│   ├── storage.ts             # Interface de dados
│   ├── db.ts                  # Configuração do banco
│   ├── replitAuth.ts          # Autenticação Replit
│   ├── simpleAuth.ts          # Autenticação local
│   └── csvParser.ts           # Parser de CSV Airbnb
├── shared/                     # Código compartilhado
│   └── schema.ts              # Esquemas Drizzle
├── package.json               # Dependências e scripts
├── vite.config.ts             # Configuração Vite
├── tailwind.config.ts         # Configuração Tailwind
├── tsconfig.json              # Configuração TypeScript
├── drizzle.config.ts          # Configuração Drizzle
└── components.json            # Configuração Shadcn/UI
```

## 🗄️ Configuração do Banco de Dados

### Tecnologia Utilizada
- **Neon Database SDK**: `@neondatabase/serverless` v0.10.4
- **Driver**: `drizzle-orm/neon-serverless`
- **Protocolo**: PostgreSQL compatível
- **Conexões**: Pool com WebSocket support
- **Compatibilidade**: Funciona com Neon Database, PostgreSQL local, AWS RDS, etc.

### Configuração de Conexão
```typescript
// server/db.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Configuração WebSocket para Neon
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;

// Pool de conexões
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

### Vantagens da Configuração Atual
- **Serverless Optimized**: Ideal para ambientes serverless
- **Connection Pooling**: Gerenciamento automático de conexões
- **WebSocket Support**: Conexões mais eficientes
- **Portabilidade**: Compatível com qualquer PostgreSQL
- **Auto-scaling**: Escala automaticamente com a demanda

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `users`
- Armazenamento de usuários do sistema
- Campos: id, email, firstName, lastName, profileImageUrl
- Suporte a autenticação OAuth e local

#### `properties`
- Propriedades imobiliárias
- Campos detalhados:
  - Identificação: name, nickname, registrationNumber, iptuCode
  - Endereço completo: condominiumName, street, number, tower, unit, neighborhood, city, state, country, zipCode
  - Detalhes: type, status, rentalType, bedrooms, bathrooms, area
  - Custos de aquisição: purchasePrice, commissionValue, taxesAndRegistration, renovationAndDecoration, otherInitialValues
  - Financiamento: isFullyPaid, financingAmount
  - Avaliação: marketValue, marketValueDate

#### `transactions`
- Transações financeiras (receitas e despesas)
- Campos: type, category, description, amount, date, propertyId
- Suporte a transações recorrentes
- Informações de fornecedor: supplier, cpfCnpj, phone, email, pixKey
- Suporte a despesas compostas

#### `taxPayments`
- Pagamentos de impostos (PIS, COFINS, CSLL, IRPJ)
- Campos: taxType, totalAmount, paymentDate, competencyPeriodStart, competencyPeriodEnd
- Suporte a parcelamento
- Seleção de propriedades por pagamento

#### `cleaningServiceDetails`
- Detalhes de serviços de limpeza
- Vinculação com transações e propriedades

#### `expenseComponents`
- Componentes de despesas compostas
- Configuração por propriedade

#### `exchangeRates`
- Taxas de câmbio para conversão de moedas

#### `cashFlowSettings`
- Configurações de fluxo de caixa por usuário

#### `sessions`
- Armazenamento de sessões de usuário

## 🔐 Sistema de Autenticação

### Ambiente Local
- Autenticação simplificada baseada em sessão
- Usuário padrão criado automaticamente em desenvolvimento
- Credenciais: admin/admin

### Ambiente Replit
- Integração com Replit Auth via OpenID Connect
- Suporte a OAuth automático
- Gerenciamento de sessões com PostgreSQL

## 🚀 Funcionalidades Principais

### Dashboard Principal
- Tabela dinâmica de receitas/despesas por propriedade
- Filtros avançados por mês, propriedade e categoria
- Cálculo de margem IPCA para análise de rentabilidade
- Exportação para Excel e PDF

### Gestão de Propriedades
- Cadastro completo com endereço detalhado
- Acompanhamento de status (ativo, decoração, financiamento)
- Dados de aquisição com correção IPCA automática
- Páginas individuais com mini-dashboard financeiro

### Sistema de Transações
- Cadastro de receitas (aluguel, Airbnb, outras)
- Gestão de despesas por categoria:
  - Impostos (PIS, COFINS, CSLL, IRPJ, IPTU)
  - Condomínio
  - Gestão (com rateio proporcional)
  - Manutenção
  - Financiamento
  - Limpezas
  - Despesas Gerais
- Edição inline de transações
- Histórico detalhado por propriedade

### Integração Airbnb
- Importação automática de payouts históricos
- Processamento de reservas futuras para previsão
- Distribuição proporcional entre propriedades
- Mapeamento automático de anúncios

### Analytics Avançado
- Fluxo de caixa diário com projeções
- Análise de rentabilidade com correção IPCA
- Relatórios por categoria de despesa
- Visualizações gráficas interativas

## 📊 Relatórios e Exportação

### Dashboards Disponíveis
- **Principal**: Visão geral por propriedade/mês
- **Fluxo de Caixa**: Projeções diárias com saldo acumulado
- **Categorias**: Análise detalhada por tipo de despesa
- **Propriedades**: Mini-dashboard individual

### Funcionalidades de Export
- Excel (.xlsx) com formatação profissional
- PDF com layout otimizado
- Dados filtráveis e personalizáveis

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 12+ (ou Neon Database)
- Git

### Variáveis de Ambiente
```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/gestao_imoveis

# Ambiente
NODE_ENV=development

# Aplicação
PORT=5173

# Segurança
SESSION_SECRET=your-session-secret

# Opcional: Replit (auto-detectado)
REPL_ID=
REPLIT_DOMAIN=

# Opcional: Serviços Externos
OPENID_CLIENT_ID=
OPENID_CLIENT_SECRET=
OPENID_ISSUER=
```

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento (frontend + backend)
npm run build        # Build para produção
npm run start        # Produção
npm run check        # Verificação TypeScript
npm run db:push      # Atualizar schema do banco
```

## 🔧 Dependências Críticas

### Dependências Críticas

#### Produção
- `@neondatabase/serverless` - SDK Neon Database para conexões serverless
- `drizzle-orm` - ORM type-safe com driver neon-serverless
- `@tanstack/react-query` - Gerenciamento de estado
- `@radix-ui/*` - Componentes UI acessíveis
- `react-hook-form` - Formulários
- `express` - Servidor web
- `passport` - Autenticação
- `multer` - Upload de arquivos
- `exceljs` - Manipulação Excel
- `jspdf` - Geração PDF
- `ws` - WebSocket para conexões Neon

### Desenvolvimento
- `vite` - Build tool
- `tsx` - Execução TypeScript
- `drizzle-kit` - Migrações
- `@types/*` - Tipagens TypeScript
- `tailwindcss` - CSS framework
- `esbuild` - Bundler produção

## 🛡️ Segurança

### Medidas Implementadas
- Autenticação baseada em sessão
- Validação de dados com Zod
- Sanitização de uploads
- Proteção CSRF via sessões
- Validação de propriedade por usuário
- Logs de auditoria

### Boas Práticas
- Nunca expor secrets em logs
- Validação server-side obrigatória
- Sanitização de inputs
- Limitação de upload de arquivos
- Timeouts de sessão

## 📱 Responsividade

- Design mobile-first
- Interface otimizada para desktop e tablet
- Touch-friendly para dispositivos móveis
- Breakpoints Tailwind CSS
- Componentes adaptativos

## 🔄 Fluxo de Dados

1. **Frontend** → TanStack Query → **API Routes**
2. **API Routes** → Validação Zod → **Storage Layer**
3. **Storage Layer** → Drizzle ORM → **PostgreSQL**
4. **PostgreSQL** → Drizzle ORM → **Storage Layer**
5. **Storage Layer** → **API Routes** → **Frontend**

## 🚨 Pontos de Atenção

### Limitações Conhecidas
- Dependência de PostgreSQL (não suporta SQLite em produção)
- Integração Airbnb requer formato CSV específico
- Autenticação local apenas para desenvolvimento
- Correção IPCA requer dados externos

### Melhorias Futuras
- Suporte a múltiplas moedas
- Integração com APIs bancárias
- Notificações automáticas
- Backup automático
- API REST documentada
- Testes automatizados

## 📞 Suporte e Manutenção

### Logs
```bash
npm run dev 2>&1 | tee app.log
```

### Backup do Banco
```bash
pg_dump gestao_imoveis > backup.sql
```

### Restaurar Backup
```bash
psql gestao_imoveis < backup.sql
```

### Monitoramento
- Logs de aplicação via console
- Métricas de performance via TanStack Query
- Monitoramento de sessões via PostgreSQL

---

**Versão**: 1.0.0  
**Última Atualização**: Janeiro 2025  
**Licença**: MIT  
**Autor**: Sistema de Gestão Imobiliária