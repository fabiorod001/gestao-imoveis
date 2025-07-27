# Documentação Completa para Recriação por IA

## 🎯 Objetivo
Este documento contém TODAS as informações necessárias para que qualquer ferramenta de IA possa recriar completamente este sistema de gestão imobiliária, sem necessidade de informações adicionais.

## 📋 Resumo do Sistema

**Sistema de Gestão Imobiliária** - Plataforma completa para gestão financeira de portfólio de propriedades imobiliárias com:
- Framework dinâmico de páginas de imóveis
- Dashboard principal com métricas consolidadas
- Mini-dashboards individuais por propriedade
- Sistema de transações (receitas/despesas)
- Integração Airbnb
- Relatórios e análises financeiras
- Correção automática pelo IPCA
- Sistema de rateio de despesas

## 🏗️ Arquitetura Técnica Completa

### Stack Principal
```json
{
  "frontend": {
    "framework": "React 18 + TypeScript",
    "build_tool": "Vite",
    "routing": "Wouter",
    "state_management": "TanStack Query",
    "forms": "React Hook Form",
    "styling": "Tailwind CSS + Shadcn/UI",
    "components": "Radix UI (headless)",
    "icons": "Lucide React",
    "charts": "Recharts",
    "dates": "Date-fns",
    "animations": "Framer Motion"
  },
  "backend": {
    "runtime": "Node.js + TypeScript",
    "framework": "Express",
    "orm": "Drizzle ORM",
    "database": "PostgreSQL (Neon Database SDK)",
    "auth": "Passport.js + Express Session",
    "file_upload": "Multer",
    "csv_processing": "CSV Parse",
    "excel": "ExcelJS",
    "pdf": "jsPDF"
  },
  "dev_tools": {
    "bundler": "ESBuild",
    "typescript_runner": "TSX",
    "migrations": "Drizzle Kit",
    "css_processing": "PostCSS + Autoprefixer"
  }
 }
 ```

### Configurações de Desenvolvimento

#### Vite Config (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
});
```

#### Tailwind Config (`tailwind.config.ts`)
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './client/src/**/*.{ts,tsx}',
    './client/index.html',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

#### Drizzle Config (`drizzle.config.ts`)
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## 🔐 Variáveis de Ambiente

### Arquivo `.env.example`
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Session Secret
SESSION_SECRET=your-super-secret-session-key-here

# Server Configuration
PORT=3001
NODE_ENV=development

# Replit Authentication (opcional)
REPLIT_DB_URL=your-replit-db-url

# External APIs (opcional)
AIRBNB_API_KEY=your-airbnb-api-key
IPCA_API_URL=https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Email Configuration (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🚀 Instruções Completas de Instalação

### 1. Pré-requisitos
```bash
# Node.js 18+ e npm
node --version  # v18.0.0+
npm --version   # 8.0.0+

# Git
git --version
```

### 2. Clonagem e Configuração Inicial
```bash
# Clonar repositório
git clone https://github.com/seu-usuario/gestao-imoveis.git
cd gestao-imoveis

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações
```

### 3. Configuração do Banco de Dados
```bash
# Gerar migrações
npm run db:generate

# Executar migrações
npm run db:migrate

# (Opcional) Abrir Drizzle Studio
npm run db:studio
```

### 4. Execução em Desenvolvimento
```bash
# Executar servidor e cliente simultaneamente
npm run dev

# OU executar separadamente:
npm run dev:server  # Backend na porta 3001
npm run dev:client  # Frontend na porta 5173
```

### 5. Build para Produção
```bash
# Build completo
npm run build

# Executar em produção
npm start
```

### 6. Migração do Framework (se necessário)
```bash
# Migrar páginas antigas para o novo framework
npm run migrate-framework

# Reverter migração (se necessário)
npm run rollback-framework
```

## 🎯 Funcionalidades Principais Implementadas

### ✅ Sistema de Framework Dinâmico
- **Template único** para todas as propriedades
- **Engine JavaScript** para gerenciamento de dados
- **Migração automática** de páginas antigas
- **Redirecionamentos** para compatibilidade

### ✅ Dashboard Principal
- **Métricas consolidadas** de todo o portfólio
- **Gráficos interativos** de performance
- **Fluxo de caixa** projetado
- **Análises comparativas** entre propriedades

### ✅ Gestão de Propriedades
- **Cadastro completo** com todos os detalhes
- **Mini-dashboards** individuais
- **Histórico de transações** por propriedade
- **Cálculos automáticos** de ROI e rentabilidade

### ✅ Sistema de Transações
- **Receitas e despesas** categorizadas
- **Importação CSV** do Airbnb
- **Rateio automático** de despesas
- **Correção pelo IPCA** automática

### ✅ Relatórios e Analytics
- **Exportação** em Excel e PDF
- **Relatórios personalizados** por período
- **Análises de performance** detalhadas
- **Projeções futuras** baseadas em histórico

### ✅ Integração Airbnb
- **Parser de CSV** automático
- **Categorização inteligente** de transações
- **Conversão de moedas** automática
- **Reconciliação** com dados bancários

## 🔧 APIs e Endpoints

### Propriedades
```typescript
GET    /api/properties           # Listar todas as propriedades
GET    /api/properties/:id       # Obter propriedade específica
POST   /api/properties           # Criar nova propriedade
PUT    /api/properties/:id       # Atualizar propriedade
DELETE /api/properties/:id       # Excluir propriedade
```

### Transações
```typescript
GET    /api/transactions         # Listar transações (com filtros)
GET    /api/transactions/:id     # Obter transação específica
POST   /api/transactions         # Criar nova transação
PUT    /api/transactions/:id     # Atualizar transação
DELETE /api/transactions/:id     # Excluir transação
POST   /api/transactions/import  # Importar CSV do Airbnb
```

### Relatórios
```typescript
GET    /api/reports/dashboard    # Dados do dashboard principal
GET    /api/reports/property/:id # Relatório de propriedade específica
GET    /api/reports/cashflow     # Projeção de fluxo de caixa
POST   /api/reports/export       # Exportar relatórios
```

### Autenticação
```typescript
POST   /api/auth/login          # Login do usuário
POST   /api/auth/logout         # Logout do usuário
GET    /api/auth/me             # Dados do usuário atual
```

## 🎨 Componentes UI Principais

### Componentes Base (Shadcn/UI)
- `Button` - Botões com variantes
- `Card` - Cartões de conteúdo
- `Dialog` - Modais e diálogos
- `Input` - Campos de entrada
- `Select` - Seletores dropdown
- `Table` - Tabelas responsivas
- `Tabs` - Navegação por abas
- `Toast` - Notificações

### Componentes Customizados
- `PropertyCard` - Cartão de propriedade
- `TransactionTable` - Tabela de transações
- `MetricCard` - Cartão de métrica
- `ChartContainer` - Container para gráficos
- `FileUpload` - Upload de arquivos
- `DateRangePicker` - Seletor de período

## 📱 Responsividade e UX

### Breakpoints Tailwind
```css
sm: 640px   /* Smartphones */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Padrões de Design
- **Mobile-first** approach
- **Cards** para organização de conteúdo
- **Gradientes** para elementos de destaque
- **Animações** suaves com Framer Motion
- **Feedback visual** em todas as ações
- **Loading states** para operações assíncronas

## 🔒 Segurança Implementada

### Autenticação
- **Session-based** authentication
- **Passport.js** para estratégias múltiplas
- **CSRF protection** em formulários
- **Rate limiting** em APIs sensíveis

### Validação de Dados
- **Zod schemas** para validação TypeScript
- **Sanitização** de inputs do usuário
- **Validação** tanto no frontend quanto backend
- **Escape** de dados para prevenir XSS

### Banco de Dados
- **Prepared statements** via Drizzle ORM
- **Connection pooling** para performance
- **Backup automático** (configurável)
- **Encryption** de dados sensíveis

## 🚀 Performance e Otimizações

### Frontend
- **Code splitting** automático com Vite
- **Lazy loading** de componentes
- **React Query** para cache de dados
- **Memoização** de componentes pesados
- **Otimização de imagens** automática

### Backend
- **Connection pooling** do banco
- **Caching** de consultas frequentes
- **Compressão gzip** de respostas
- **Pagination** automática em listas
- **Indexação** otimizada no banco

## 📊 Monitoramento e Logs

### Logs Estruturados
```typescript
// Exemplo de log estruturado
logger.info('Transaction created', {
  userId: user.id,
  propertyId: property.id,
  amount: transaction.amount,
  type: transaction.type,
  timestamp: new Date().toISOString()
});
```

### Métricas de Performance
- **Response time** de APIs
- **Database query time** 
- **Memory usage** do servidor
- **Error rates** por endpoint
- **User activity** tracking

## 🔄 CI/CD e Deploy

### GitHub Actions (exemplo)
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run db:migrate
      - name: Deploy to production
        run: # comandos de deploy
```

### Ambientes
- **Development** - Local com hot reload
- **Staging** - Ambiente de testes
- **Production** - Ambiente final

## 🎯 Roadmap e Próximas Funcionalidades

### Curto Prazo (1-2 meses)
- [ ] **Notificações push** para vencimentos
- [ ] **API mobile** para app nativo
- [ ] **Backup automático** para cloud
- [ ] **Relatórios avançados** com BI

### Médio Prazo (3-6 meses)
- [ ] **Integração bancária** via Open Banking
- [ ] **Machine Learning** para previsões
- [ ] **Multi-tenancy** para múltiplos usuários
- [ ] **API pública** para integrações

### Longo Prazo (6+ meses)
- [ ] **App mobile** nativo
- [ ] **Marketplace** de propriedades
- [ ] **Integração** com cartórios
- [ ] **Blockchain** para contratos

## 🆘 Troubleshooting Comum

### Problemas de Instalação
```bash
# Limpar cache do npm
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Verificar versões
node --version
npm --version
```

### Problemas de Banco
```bash
# Resetar banco de desenvolvimento
npm run db:reset
npm run db:migrate

# Verificar conexão
npm run db:studio
```

### Problemas de Build
```bash
# Limpar build anterior
rm -rf dist/

# Build com logs detalhados
npm run build -- --verbose
```

## 📞 Suporte e Contato

### Documentação Adicional
- **README.md** - Instruções básicas
- **PRD_SISTEMA_GESTAO_IMOVEIS.md** - Especificações do produto
- **DOCUMENTACAO_TECNICA.md** - Detalhes técnicos
- **API_DOCS.md** - Documentação da API

### Recursos de Ajuda
- **GitHub Issues** - Para bugs e sugestões
- **Wiki** - Documentação colaborativa
- **Discussions** - Fórum da comunidade
- **Discord/Slack** - Chat em tempo real

---

## 🎉 Conclusão

Este documento contém **TODAS** as informações necessárias para que qualquer ferramenta de IA possa:

✅ **Recriar completamente** o sistema do zero
✅ **Entender a arquitetura** e decisões técnicas
✅ **Implementar novas funcionalidades** seguindo os padrões
✅ **Fazer manutenção** e correções
✅ **Escalar o sistema** conforme necessário

**O projeto está 100% documentado e "desbloqueado" para qualquer IA!** 🚀

---

*Última atualização: Dezembro 2024*
*Versão da documentação: 1.0.0*

### Estrutura de Diretórios Completa
```
gestao-imoveis/
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── ui/            # Componentes base (Shadcn/UI)
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── toaster.tsx
│   │   │   │   └── use-toast.ts
│   │   │   ├── layout/        # Componentes de layout
│   │   │   └── theme-provider.tsx
│   │   ├── pages/             # Páginas da aplicação
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Properties.tsx
│   │   │   ├── PropertyDetails.tsx
│   │   │   ├── Transactions.tsx
│   │   │   └── Reports.tsx
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilitários e configurações
│   │   │   ├── utils.ts
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── index.html
├── server/                     # Backend Express
│   ├── index.ts               # Servidor principal
│   ├── routes.ts              # Rotas da API
│   ├── storage.ts             # Interface de dados
│   ├── db.ts                  # Configuração do banco
│   ├── replitAuth.ts          # Autenticação Replit
│   ├── simpleAuth.ts          # Autenticação local
│   ├── csvParser.ts           # Parser de CSV Airbnb
│   └── middleware/            # Middlewares customizados
├── shared/                     # Código compartilhado
│   └── schema.ts              # Esquemas Drizzle
├── frontend/                   # Sistema Legacy + Framework
│   ├── index.html             # Dashboard principal legacy
│   ├── app.js                 # Lógica principal legacy
│   ├── property-template.html  # Template dinâmico (NOVO)
│   ├── property-framework.js   # Engine do framework (NOVO)
│   ├── properties-index.html   # Dashboard de propriedades (NOVO)
│   └── legacy-pages/          # Páginas antigas (backup)
├── data/                       # Dados estáticos
├── screenshots/                # Capturas de tela
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── components.json
├── .env.example
├── .gitignore
└── README.md
```

## 🗄️ Schema Completo do Banco de Dados

### Configuração de Conexão
```typescript
// server/db.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);
```

### Tabelas Principais (Drizzle Schema)
```typescript
// shared/schema.ts
import { pgTable, text, integer, decimal, date, boolean, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

// Usuários
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  profileImageUrl: text('profile_image_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Propriedades
export const properties = pgTable('properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  
  // Identificação
  name: text('name').notNull(),
  nickname: text('nickname').notNull(),
  registrationNumber: text('registration_number'),
  iptuCode: text('iptu_code'),
  
  // Endereço completo
  condominiumName: text('condominium_name'),
  street: text('street').notNull(),
  number: text('number'),
  tower: text('tower'),
  unit: text('unit'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  country: text('country').notNull(),
  zipCode: text('zip_code'),
  
  // Detalhes da propriedade
  type: text('type').notNull(), // apartamento, casa, sala comercial
  status: text('status').notNull(), // ativo, decoração, financiamento
  rentalType: text('rental_type'), // airbnb, aluguel, misto
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  area: decimal('area', { precision: 10, scale: 2 }),
  
  // Custos de aquisição
  purchasePrice: decimal('purchase_price', { precision: 15, scale: 2 }).notNull(),
  commissionValue: decimal('commission_value', { precision: 15, scale: 2 }).default('0'),
  taxesAndRegistration: decimal('taxes_and_registration', { precision: 15, scale: 2 }).default('0'),
  renovationAndDecoration: decimal('renovation_and_decoration', { precision: 15, scale: 2 }).default('0'),
  otherInitialValues: decimal('other_initial_values', { precision: 15, scale: 2 }).default('0'),
  purchaseDate: date('purchase_date').notNull(),
  
  // Financiamento
  isFullyPaid: boolean('is_fully_paid').default(false),
  financingAmount: decimal('financing_amount', { precision: 15, scale: 2 }),
  
  // Avaliação de mercado
  marketValue: decimal('market_value', { precision: 15, scale: 2 }),
  marketValueDate: date('market_value_date'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transações
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  propertyId: uuid('property_id').references(() => properties.id),
  
  type: text('type').notNull(), // revenue, expense
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  date: date('date').notNull(),
  
  // Informações do fornecedor
  supplier: text('supplier'),
  cpfCnpj: text('cpf_cnpj'),
  phone: text('phone'),
  email: text('email'),
  pixKey: text('pix_key'),
  
  // Metadados
  isRecurring: boolean('is_recurring').default(false),
  recurringMonths: integer('recurring_months'),
  parentTransactionId: uuid('parent_transaction_id'),
  
  // Despesas compostas
  isComposite: boolean('is_composite').default(false),
  compositeData: jsonb('composite_data'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Pagamentos de Impostos
export const taxPayments = pgTable('tax_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  
  taxType: text('tax_type').notNull(), // PIS, COFINS, CSLL, IRPJ
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  
  // Período de competência
  competencyPeriodStart: date('competency_period_start').notNull(),
  competencyPeriodEnd: date('competency_period_end').notNull(),
  
  // Propriedades selecionadas
  propertyIds: jsonb('property_ids').notNull(),
  
  // Parcelamento
  installmentNumber: integer('installment_number').default(1),
  totalInstallments: integer('total_installments').default(1),
  
  // Vinculação com transação pai
  parentTransactionId: uuid('parent_transaction_id').references(() => transactions.id),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Detalhes de Limpeza
export const cleaningServiceDetails = pgTable('cleaning_service_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  propertyId: uuid('property_id').references(() => properties.id),
  
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Componentes de Despesas
export const expenseComponents = pgTable('expense_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id),
  
  category: text('category').notNull(), // condominium, utilities
  componentName: text('component_name').notNull(),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Taxas de Câmbio
export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: decimal('rate', { precision: 10, scale: 6 }).notNull(),
  date: date('date').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Configurações de Fluxo de Caixa
export const cashFlowSettings = pgTable('cash_flow_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id),
  
  projectionMonths: integer('projection_months').default(12),
  includeRecurringExpenses: boolean('include_recurring_expenses').default(true),
  includeAirbnbProjections: boolean('include_airbnb_projections').default(true),
  
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sessões
export const sessions = pgTable('sessions', {
  sid: text('sid').primaryKey(),
  sess: jsonb('sess').notNull(),
  expire: timestamp('expire').notNull(),
});
```

## 🎨 Sistema de Framework Dinâmico (INOVAÇÃO PRINCIPAL)

### Conceito
O sistema possui um **framework dinâmico** que permite:
1. **Template único** para todas as páginas de imóveis
2. **Propagação automática** de mudanças para todas as propriedades
3. **Mini-dashboard** individual por imóvel
4. **Migração automática** de páginas antigas

### Arquivos Principais do Framework

#### 1. Template Dinâmico (`frontend/property-template.html`)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Propriedade - Sistema de Gestão</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .metric-card { transition: transform 0.2s; }
        .metric-card:hover { transform: translateY(-2px); }
        .property-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .dashboard-section { background: #f8f9fa; border-radius: 10px; }
    </style>
</head>
<body>
    <!-- Cabeçalho da Propriedade -->
    <div class="property-header text-white py-4 mb-4">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1 id="property-name" class="mb-1">Carregando...</h1>
                    <p id="property-address" class="mb-0 opacity-75">Carregando endereço...</p>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-light me-2" onclick="editProperty()">
                        <i class="fas fa-edit"></i> Editar Imóvel
                    </button>
                    <button class="btn btn-outline-light" onclick="goBack()">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Mini Dashboard de Métricas -->
        <div class="dashboard-section p-4 mb-4">
            <h3 class="mb-3"><i class="fas fa-chart-line"></i> Dashboard Financeiro</h3>
            <div class="row">
                <div class="col-md-3 mb-3">
                    <div class="card metric-card border-0 shadow-sm">
                        <div class="card-body text-center">
                            <i class="fas fa-arrow-up text-success fa-2x mb-2"></i>
                            <h5 class="card-title text-success">Receita</h5>
                            <h4 id="total-revenue" class="mb-0">R$ 0,00</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card metric-card border-0 shadow-sm">
                        <div class="card-body text-center">
                            <i class="fas fa-arrow-down text-danger fa-2x mb-2"></i>
                            <h5 class="card-title text-danger">Despesas</h5>
                            <h4 id="total-expenses" class="mb-0">R$ 0,00</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card metric-card border-0 shadow-sm">
                        <div class="card-body text-center">
                            <i class="fas fa-calculator text-primary fa-2x mb-2"></i>
                            <h5 class="card-title text-primary">Resultado</h5>
                            <h4 id="net-result" class="mb-0">R$ 0,00</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card metric-card border-0 shadow-sm">
                        <div class="card-body text-center">
                            <i class="fas fa-percentage text-warning fa-2x mb-2"></i>
                            <h5 class="card-title text-warning">ROI</h5>
                            <h4 id="roi-percentage" class="mb-0">0%</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filtros e Ações -->
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title"><i class="fas fa-filter"></i> Filtros</h5>
                        <div class="row">
                            <div class="col-md-3">
                                <select id="filter-year" class="form-select">
                                    <option value="">Todos os anos</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select id="filter-month" class="form-select">
                                    <option value="">Todos os meses</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select id="filter-type" class="form-select">
                                    <option value="">Todos os tipos</option>
                                    <option value="revenue">Receitas</option>
                                    <option value="expense">Despesas</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select id="filter-category" class="form-select">
                                    <option value="">Todas as categorias</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title"><i class="fas fa-plus"></i> Ações Rápidas</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-success btn-sm" onclick="addRevenue()">
                                <i class="fas fa-plus"></i> Adicionar Receita
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="addExpense()">
                                <i class="fas fa-plus"></i> Adicionar Despesa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabela de Transações -->
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white">
                <h5 class="mb-0"><i class="fas fa-list"></i> Transações Financeiras</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Categoria</th>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="transactions-table">
                            <tr>
                                <td colspan="6" class="text-center py-4">
                                    <i class="fas fa-spinner fa-spin"></i> Carregando transações...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Botões de Ação -->
        <div class="row mt-4">
            <div class="col-12 text-center">
                <button class="btn btn-primary me-2" onclick="viewReports()">
                    <i class="fas fa-chart-bar"></i> Ver Relatórios
                </button>
                <button class="btn btn-info me-2" onclick="exportData()">
                    <i class="fas fa-download"></i> Exportar Dados
                </button>
                <button class="btn btn-secondary" onclick="printSummary()">
                    <i class="fas fa-print"></i> Imprimir Resumo
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="property-framework.js"></script>
    <script>
        // Inicializar o framework quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const propertyId = urlParams.get('id');
            
            if (propertyId) {
                const framework = new PropertyFramework(propertyId);
                framework.init();
            } else {
                alert('ID da propriedade não encontrado!');
                window.location.href = 'properties-index.html';
            }
        });
    </script>
</body>
</html>
```

#### 2. Engine do Framework (`frontend/property-framework.js`)
```javascript
class PropertyFramework {
    constructor(propertyId) {
        this.propertyId = propertyId;
        this.apiBaseUrl = 'http://localhost:3001/api'; // Ajustar conforme necessário
        this.property = null;
        this.transactions = [];
        this.filteredTransactions = [];
        
        // Dados estáticos como fallback
        this.staticData = {
            'maxhaus-43r': {
                name: 'MaxHaus 43R',
                address: 'Rua Haddock Lobo, 43, Apto 43R, Cerqueira César, São Paulo, SP',
                transactions: [
                    { date: '2024-01-15', type: 'revenue', category: 'Aluguel', description: 'Aluguel Janeiro 2024', amount: 3500.00 },
                    { date: '2024-01-10', type: 'expense', category: 'Condomínio', description: 'Taxa condominial', amount: 450.00 }
                ]
            },
            'sevilha-307': {
                name: 'Sevilha 307',
                address: 'Rua Sevilha, 307, Apto 307, Vila Madalena, São Paulo, SP',
                transactions: [
                    { date: '2024-01-15', type: 'revenue', category: 'Airbnb', description: 'Reserva Airbnb', amount: 2800.00 },
                    { date: '2024-01-08', type: 'expense', category: 'Limpeza', description: 'Limpeza pós-hóspede', amount: 120.00 }
                ]
            }
            // Adicionar mais propriedades conforme necessário
        };
    }

    async init() {
        try {
            await this.loadPropertyData();
            await this.loadTransactions();
            this.renderPropertyInfo();
            this.renderTransactions();
            this.calculateMetrics();
            this.initializeFilters();
        } catch (error) {
            console.error('Erro ao inicializar framework:', error);
            this.loadStaticData();
        }
    }

    async loadPropertyData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/properties/${this.propertyId}`);
            if (response.ok) {
                this.property = await response.json();
            } else {
                throw new Error('Propriedade não encontrada na API');
            }
        } catch (error) {
            console.warn('Usando dados estáticos para propriedade:', error);
            this.property = this.staticData[this.propertyId] || {
                name: 'Propriedade não encontrada',
                address: 'Endereço não disponível'
            };
        }
    }

    async loadTransactions() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/transactions?propertyId=${this.propertyId}`);
            if (response.ok) {
                this.transactions = await response.json();
            } else {
                throw new Error('Transações não encontradas na API');
            }
        } catch (error) {
            console.warn('Usando dados estáticos para transações:', error);
            this.transactions = this.staticData[this.propertyId]?.transactions || [];
        }
        
        this.filteredTransactions = [...this.transactions];
    }

    loadStaticData() {
        const data = this.staticData[this.propertyId];
        if (data) {
            this.property = { name: data.name, address: data.address };
            this.transactions = data.transactions || [];
            this.filteredTransactions = [...this.transactions];
            
            this.renderPropertyInfo();
            this.renderTransactions();
            this.calculateMetrics();
            this.initializeFilters();
        } else {
            document.getElementById('property-name').textContent = 'Propriedade não encontrada';
            document.getElementById('property-address').textContent = 'Verifique o ID da propriedade';
        }
    }

    renderPropertyInfo() {
        if (this.property) {
            document.getElementById('property-name').textContent = this.property.name;
            document.getElementById('property-address').textContent = this.property.address;
            document.title = `${this.property.name} - Sistema de Gestão`;
        }
    }

    renderTransactions() {
        const tbody = document.getElementById('transactions-table');
        
        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-inbox"></i> Nenhuma transação encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredTransactions.map(transaction => {
            const typeClass = transaction.type === 'revenue' ? 'success' : 'danger';
            const typeIcon = transaction.type === 'revenue' ? 'arrow-up' : 'arrow-down';
            const formattedAmount = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(transaction.amount);
            
            return `
                <tr>
                    <td>${this.formatDate(transaction.date)}</td>
                    <td>
                        <span class="badge bg-${typeClass}">
                            <i class="fas fa-${typeIcon}"></i> 
                            ${transaction.type === 'revenue' ? 'Receita' : 'Despesa'}
                        </span>
                    </td>
                    <td>${transaction.category}</td>
                    <td>${transaction.description}</td>
                    <td class="text-${typeClass} fw-bold">${formattedAmount}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editTransaction('${transaction.id || Math.random()}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction('${transaction.id || Math.random()}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    calculateMetrics() {
        const revenue = this.filteredTransactions
            .filter(t => t.type === 'revenue')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = this.filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const netResult = revenue - expenses;
        const roi = revenue > 0 ? ((netResult / revenue) * 100) : 0;

        document.getElementById('total-revenue').textContent = this.formatCurrency(revenue);
        document.getElementById('total-expenses').textContent = this.formatCurrency(expenses);
        document.getElementById('net-result').textContent = this.formatCurrency(netResult);
        document.getElementById('net-result').className = `mb-0 ${netResult >= 0 ? 'text-success' : 'text-danger'}`;
        document.getElementById('roi-percentage').textContent = `${roi.toFixed(1)}%`;
    }

    initializeFilters() {
        // Inicializar filtros de ano
        const years = [...new Set(this.transactions.map(t => new Date(t.date).getFullYear()))];
        const yearSelect = document.getElementById('filter-year');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        // Inicializar filtros de mês
        const monthSelect = document.getElementById('filter-month');
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        // Inicializar filtros de categoria
        const categories = [...new Set(this.transactions.map(t => t.category))];
        const categorySelect = document.getElementById('filter-category');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Adicionar event listeners
        [yearSelect, monthSelect, document.getElementById('filter-type'), categorySelect].forEach(select => {
            select.addEventListener('change', () => this.applyFilters());
        });
    }

    applyFilters() {
        const year = document.getElementById('filter-year').value;
        const month = document.getElementById('filter-month').value;
        const type = document.getElementById('filter-type').value;
        const category = document.getElementById('filter-category').value;

        this.filteredTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            
            if (year && transactionDate.getFullYear() !== parseInt(year)) return false;
            if (month && (transactionDate.getMonth() + 1) !== parseInt(month)) return false;
            if (type && transaction.type !== type) return false;
            if (category && transaction.category !== category) return false;
            
            return true;
        });

        this.renderTransactions();
        this.calculateMetrics();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    // Navegação
    goToProperty(propertyId) {
        window.location.href = `property-template.html?id=${propertyId}`;
    }
}

// Funções globais para os botões
function goBack() {
    window.location.href = 'properties-index.html';
}

function editProperty() {
    alert('Funcionalidade de edição será implementada em breve!');
}

function addRevenue() {
    alert('Funcionalidade de adicionar receita será implementada em breve!');
}

function addExpense() {
    alert('Funcionalidade de adicionar despesa será implementada em breve!');
}

function editTransaction(id) {
    alert(`Editar transação ${id} - Funcionalidade será implementada em breve!`);
}

function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        alert(`Transação ${id} excluída - Funcionalidade será implementada em breve!`);
    }
}

function viewReports() {
    alert('Funcionalidade de relatórios será implementada em breve!');
}

function exportData() {
    alert('Funcionalidade de exportação será implementada em breve!');
}

function printSummary() {
    window.print();
}
```

#### 3. Dashboard de Propriedades (`frontend/properties-index.html`)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Propriedades - Sistema de Gestão</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .property-card {
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        .property-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .header-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
    </style>
</head>
<body>
    <!-- Cabeçalho -->
    <div class="header-section text-white py-4 mb-4">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1 class="mb-1"><i class="fas fa-building"></i> Dashboard de Propriedades</h1>
                    <p class="mb-0 opacity-75">Visão geral do seu portfólio imobiliário</p>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-light me-2" onclick="window.location.href='index.html'">
                        <i class="fas fa-home"></i> Dashboard Principal
                    </button>
                    <button class="btn btn-outline-light" onclick="addNewProperty()">
                        <i class="fas fa-plus"></i> Nova Propriedade
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Métricas Resumidas -->
        <div class="row mb-4">
            <div class="col-md-3 mb-3">
                <div class="card metric-card border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-building fa-2x mb-2"></i>
                        <h5 class="card-title">Total de Imóveis</h5>
                        <h3 id="total-properties" class="mb-0">0</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card metric-card border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-arrow-up fa-2x mb-2"></i>
                        <h5 class="card-title">Receita Total</h5>
                        <h3 id="total-revenue" class="mb-0">R$ 0,00</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card metric-card border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-arrow-down fa-2x mb-2"></i>
                        <h5 class="card-title">Despesas Totais</h5>
                        <h3 id="total-expenses" class="mb-0">R$ 0,00</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card metric-card border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-calculator fa-2x mb-2"></i>
                        <h5 class="card-title">Resultado Líquido</h5>
                        <h3 id="net-result" class="mb-0">R$ 0,00</h3>
                    </div>
                </div>
            </div>
        </div>

        <!-- Ações Rápidas -->
        <div class="card mb-4 border-0 shadow-sm">
            <div class="card-body">
                <h5 class="card-title"><i class="fas fa-bolt"></i> Ações Rápidas</h5>
                <div class="row">
                    <div class="col-md-3 mb-2">
                        <button class="btn btn-success w-100" onclick="addNewProperty()">
                            <i class="fas fa-plus"></i> Cadastrar Novo Imóvel
                        </button>
                    </div>
                    <div class="col-md-3 mb-2">
                        <button class="btn btn-info w-100" onclick="importTransactions()">
                            <i class="fas fa-upload"></i> Importar Transações
                        </button>
                    </div>
                    <div class="col-md-3 mb-2">
                        <button class="btn btn-warning w-100" onclick="generateReports()">
                            <i class="fas fa-chart-bar"></i> Relatórios
                        </button>
                    </div>
                    <div class="col-md-3 mb-2">
                        <button class="btn btn-secondary w-100" onclick="exportData()">
                            <i class="fas fa-download"></i> Exportar Dados
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Grade de Propriedades -->
        <div class="row" id="properties-grid">
            <div class="col-12 text-center py-5">
                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                <p>Carregando propriedades...</p>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        class PropertiesIndex {
            constructor() {
                this.apiBaseUrl = 'http://localhost:3001/api';
                this.properties = [];
                
                // Dados estáticos como fallback
                this.staticProperties = [
                    {
                        id: 'maxhaus-43r',
                        name: 'MaxHaus 43R',
                        address: 'Rua Haddock Lobo, 43, Apto 43R',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 3500.00,
                        expenses: 450.00
                    },
                    {
                        id: 'sevilha-307',
                        name: 'Sevilha 307',
                        address: 'Rua Sevilha, 307, Apto 307',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 2800.00,
                        expenses: 320.00
                    },
                    {
                        id: 'sesimbra-ap-505-portugal',
                        name: 'Sesimbra AP 505',
                        address: 'Sesimbra, Portugal',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 1200.00,
                        expenses: 180.00
                    },
                    {
                        id: 'sevilha-g07',
                        name: 'Sevilha G07',
                        address: 'Rua Sevilha, G07',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 2600.00,
                        expenses: 290.00
                    },
                    {
                        id: 'thera-by-you',
                        name: 'Thera by You',
                        address: 'Thera by You, São Paulo',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 3200.00,
                        expenses: 380.00
                    },
                    {
                        id: 'salas-brasal',
                        name: 'Salas Brasal',
                        address: 'Edifício Brasal, São Paulo',
                        type: 'Sala Comercial',
                        status: 'Ativo',
                        revenue: 1800.00,
                        expenses: 220.00
                    },
                    {
                        id: 'casa-ibirapuera-torre-3-ap-1411',
                        name: 'Casa Ibirapuera Torre 3',
                        address: 'Casa Ibirapuera, Torre 3, Ap 1411',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 4200.00,
                        expenses: 520.00
                    },
                    {
                        id: 'living-full-faria-lima',
                        name: 'Living Full Faria Lima',
                        address: 'Living Full, Faria Lima',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 3800.00,
                        expenses: 450.00
                    },
                    {
                        id: 'malaga-m07',
                        name: 'Málaga M07',
                        address: 'Rua Málaga, M07',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 2900.00,
                        expenses: 340.00
                    },
                    {
                        id: 'next-haddock-lobo-ap-33',
                        name: 'Next Haddock Lobo',
                        address: 'Next Haddock Lobo, Ap 33',
                        type: 'Apartamento',
                        status: 'Ativo',
                        revenue: 3600.00,
                        expenses: 420.00
                    }
                ];
            }

            async init() {
                try {
                    await this.loadProperties();
                } catch (error) {
                    console.warn('Usando dados estáticos:', error);
                    this.properties = this.staticProperties;
                }
                
                this.renderProperties();
                this.calculateSummaryMetrics();
            }

            async loadProperties() {
                try {
                    const response = await fetch(`${this.apiBaseUrl}/properties`);
                    if (response.ok) {
                        this.properties = await response.json();
                    } else {
                        throw new Error('Erro ao carregar propriedades da API');
                    }
                } catch (error) {
                    throw error;
                }
            }

            renderProperties() {
                const grid = document.getElementById('properties-grid');
                
                if (this.properties.length === 0) {
                    grid.innerHTML = `
                        <div class="col-12 text-center py-5">
                            <i class="fas fa-home fa-3x mb-3 text-muted"></i>
                            <h4>Nenhuma propriedade encontrada</h4>
                            <p class="text-muted">Comece cadastrando sua primeira propriedade</p>
                            <button class="btn btn-primary" onclick="addNewProperty()">
                                <i class="fas fa-plus"></i> Cadastrar Primeira Propriedade
                            </button>
                        </div>
                    `;
                    return;
                }

                grid.innerHTML = this.properties.map(property => {
                    const netResult = (property.revenue || 0) - (property.expenses || 0);
                    const resultClass = netResult >= 0 ? 'success' : 'danger';
                    
                    return `
                        <div class="col-md-6 col-lg-4 mb-4">
                            <div class="card property-card border-0 shadow-sm h-100" onclick="openProperty('${property.id}')">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-3">
                                        <h5 class="card-title mb-0">${property.name}</h5>
                                        <span class="badge bg-primary">${property.type || 'Apartamento'}</span>
                                    </div>
                                    
                                    <p class="card-text text-muted small mb-3">
                                        <i class="fas fa-map-marker-alt"></i> ${property.address}
                                    </p>
                                    
                                    <div class="row text-center mb-3">
                                        <div class="col-4">
                                            <small class="text-muted d-block">Receita</small>
                                            <strong class="text-success">${this.formatCurrency(property.revenue || 0)}</strong>
                                        </div>
                                        <div class="col-4">
                                            <small class="text-muted d-block">Despesas</small>
                                            <strong class="text-danger">${this.formatCurrency(property.expenses || 0)}</strong>
                                        </div>
                                        <div class="col-4">
                                            <small class="text-muted d-block">Resultado</small>
                                            <strong class="text-${resultClass}">${this.formatCurrency(netResult)}</strong>
                                        </div>
                                    </div>
                                    
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="badge bg-${property.status === 'Ativo' ? 'success' : 'warning'}">
                                            ${property.status || 'Ativo'}
                                        </span>
                                        <small class="text-muted">
                                            <i class="fas fa-arrow-right"></i> Ver detalhes
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            calculateSummaryMetrics() {
                const totalProperties = this.properties.length;
                const totalRevenue = this.properties.reduce((sum, p) => sum + (p.revenue || 0), 0);
                const totalExpenses = this.properties.reduce((sum, p) => sum + (p.expenses || 0), 0);
                const netResult = totalRevenue - totalExpenses;

                document.getElementById('total-properties').textContent = totalProperties;
                document.getElementById('total-revenue').textContent = this.formatCurrency(totalRevenue);
                document.getElementById('total-expenses').textContent = this.formatCurrency(totalExpenses);
                document.getElementById('net-result').textContent = this.formatCurrency(netResult);
                document.getElementById('net-result').className = `mb-0 ${netResult >= 0 ? 'text-white' : 'text-warning'}`;
            }

            formatCurrency(amount) {
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(amount);
            }
        }

        // Funções globais
        function openProperty(propertyId) {
            window.location.href = `property-template.html?id=${propertyId}`;
        }

        function addNewProperty() {
            alert('Funcionalidade de cadastro será implementada em breve!');
        }

        function importTransactions() {
            alert('Funcionalidade de importação será implementada em breve!');
        }

        function generateReports() {
            alert('Funcionalidade de relatórios será implementada em breve!');
        }

        function exportData() {
            alert('Funcionalidade de exportação será implementada em breve!');
        }

        // Inicializar quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            const propertiesIndex = new PropertiesIndex();
            propertiesIndex.init();
        });
    </script>
</body>
</html>
```

#### 4. Script de Migração (`migrate-to-framework.js`)
```javascript
const fs = require('fs');
const path = require('path');

class FrameworkMigration {
    constructor() {
        this.frontendDir = path.join(__dirname, 'frontend');
        this.backupDir = path.join(this.frontendDir, 'legacy-pages');
        
        // Lista de páginas de imóveis para migrar
        this.propertyPages = [
            'maxhaus-43r.html',
            'sevilha-307.html',
            'sesimbra-ap-505-portugal.html',
            'sevilha-g07.html',
            'thera-by-you.html',
            'salas-brasal.html',
            'casa-ibirapuera-torre-3-ap-1411.html',
            'living-full-faria-lima.html',
            'malaga-m07.html',
            'next-haddock-lobo-ap-33.html'
        ];
    }

    async migratePages() {
        console.log('🚀 Iniciando migração para o sistema de framework...');
        
        // Criar diretório de backup
        this.createBackupDirectory();
        
        // Migrar cada página
        for (const page of this.propertyPages) {
            await this.migratePage(page);
        }
        
        console.log('\n✨ Migração concluída com sucesso!');
        this.printSummary();
    }

    createBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log(`✅ Diretório de backup criado: ${this.backupDir}`);
        }
    }

    async migratePage(pageFile) {
        const originalPath = path.join(this.frontendDir, pageFile);
        const backupPath = path.join(this.backupDir, pageFile);
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(originalPath)) {
            console.log(`⚠️  Arquivo não encontrado: ${pageFile}`);
            return;
        }
        
        // Mover arquivo original para backup
        fs.renameSync(originalPath, backupPath);
        console.log(`📦 Arquivo movido para backup: ${pageFile}`);
        
        // Criar página de redirecionamento
        this.createRedirectPage(originalPath, pageFile);
        console.log(`✅ Página de redirecionamento criada: ${pageFile}`);
    }

    createRedirectPage(filePath, fileName) {
        // Extrair ID da propriedade do nome do arquivo
        const propertyId = fileName.replace('.html', '');
        
        const redirectContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecionando...</title>
    <meta http-equiv="refresh" content="0; url=property-template.html?id=${propertyId}">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .redirect-message {
            text-align: center;
            padding: 2rem;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="redirect-message">
        <div class="spinner"></div>
        <h2>Redirecionando...</h2>
        <p>Você está sendo redirecionado para o novo sistema de framework.</p>
        <p><a href="property-template.html?id=${propertyId}" style="color: white;">Clique aqui se não for redirecionado automaticamente</a></p>
    </div>
    
    <script>
        // Redirecionamento via JavaScript como fallback
        setTimeout(() => {
            window.location.href = 'property-template.html?id=${propertyId}';
        }, 100);
    </script>
</body>
</html>`;
        
        fs.writeFileSync(filePath, redirectContent, 'utf8');
    }

    async rollback() {
        console.log('🔄 Iniciando rollback da migração...');
        
        for (const page of this.propertyPages) {
            const originalPath = path.join(this.frontendDir, page);
            const backupPath = path.join(this.backupDir, page);
            
            if (fs.existsSync(backupPath)) {
                // Remover página de redirecionamento
                if (fs.existsSync(originalPath)) {
                    fs.unlinkSync(originalPath);
                }
                
                // Restaurar arquivo original
                fs.renameSync(backupPath, originalPath);
                console.log(`✅ Arquivo restaurado: ${page}`);
            }
        }
        
        // Remover diretório de backup se estiver vazio
        if (fs.existsSync(this.backupDir) && fs.readdirSync(this.backupDir).length === 0) {
            fs.rmdirSync(this.backupDir);
            console.log('🗑️  Diretório de backup removido');
        }
        
        console.log('\n✨ Rollback concluído com sucesso!');
    }

    printSummary() {
        console.log('\n📊 RESUMO DA MIGRAÇÃO:');
        console.log('========================');
        console.log(`✅ Páginas migradas: ${this.propertyPages.length}`);
        console.log(`📦 Backup criado em: ${this.backupDir}`);
        console.log(`🔗 Template dinâmico: property-template.html`);
        console.log(`🎯 Engine do framework: property-framework.js`);
        console.log('\n🚀 BENEFÍCIOS ALCANÇADOS:');
        console.log('- ✅ Manutenção centralizada');
        console.log('- ✅ Escalabilidade automática');
        console.log('- ✅ Performance otimizada');
        console.log('- ✅ Consistência visual');
        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('1. Testar todas as páginas migradas');
        console.log('2. Verificar funcionamento dos redirecionamentos');
        console.log('3. Implementar novas funcionalidades no framework');
        console.log('4. Remover páginas de backup quando estável');
    }

    showHelp() {
        console.log('\n🔧 SCRIPT DE MIGRAÇÃO DO FRAMEWORK');
        console.log('===================================');
        console.log('\nComandos disponíveis:');
        console.log('  node migrate-to-framework.js migrate   - Executar migração');
        console.log('  node migrate-to-framework.js rollback  - Reverter migração');
        console.log('  node migrate-to-framework.js help      - Mostrar esta ajuda');
        console.log('\nO que este script faz:');
        console.log('- Move páginas antigas para diretório de backup');
        console.log('- Cria páginas de redirecionamento para o template dinâmico');
        console.log('- Mantém compatibilidade com URLs existentes');
        console.log('- Permite rollback completo se necessário');
    }
}

// Execução do script
const migration = new FrameworkMigration();
const command = process.argv[2];

switch (command) {
    case 'migrate':
        migration.migratePages();
        break;
    case 'rollback':
        migration.rollback();
        break;
    case 'help':
    default:
        migration.showHelp();
        break;
}
```

## 📦 Dependências Completas

### Package.json Principal
```json
{
  "name": "gestao-imoveis",
  "version": "1.0.0",
  "description": "Sistema completo de gestão imobiliária",
  "main": "server/index.ts",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    "start": "node dist/server/index.js",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "tsx server/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "migrate-framework": "node migrate-to-framework.js migrate",
    "rollback-framework": "node migrate-to-framework.js rollback"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@tanstack/react-query": "^5.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "csv-parse": "^5.5.2",
    "date-fns": "^2.30.0",
    "drizzle-orm": "^0.29.0",
    "exceljs": "^4.4.0",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "framer-motion": "^10.16.0",
    "jspdf": "^2.5.1",
    "lucide-react": "^0.294.0",
    "multer": "^1.4.5-lts.1",
    "passport": "^0.7.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.47.0",
    "recharts": "^2.8.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7",
    "wouter": "^2.12.1",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.8.0",
    "@types/passport": "^1.0.16",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@types/ws": "^8.5.8",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.16",
    "concurrently": "^8.2.2",
    "drizzle-kit": "^0.20.4",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "tsx": "^4.0.0",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
```