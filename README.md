# Sistema de Gestão Imobiliária

Sistema completo de gestão financeira para portfólio de propriedades imobiliárias com integração Airbnb, análise de fluxo de caixa e relatórios detalhados.

## 🏗️ Arquitetura

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **UI**: Tailwind CSS + Shadcn/UI
- **State Management**: TanStack Query

## 🚀 Instalação Local

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 12+
- Git

### 1. Clone o Repositório
```bash
git clone https://github.com/fabiorod001/gestao-imoveis.git
cd gestao-imoveis
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure o Banco de Dados
```bash
# Crie um banco PostgreSQL
createdb gestao_imoveis

# Configure as variáveis de ambiente
cp .env.example .env
```

### 4. Configure o .env
```env
DATABASE_URL=postgresql://user:password@localhost:5432/gestao_imoveis
NODE_ENV=development
```

### 5. Execute as Migrações
```bash
npm run db:push
```

### 6. Inicie o Servidor
```bash
npm run dev
```

Acesse: http://localhost:5173

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   └── lib/           # Utilitários e configurações
├── server/                # Backend Express
│   ├── routes.ts          # Rotas da API
│   ├── storage.ts         # Interface de dados
│   └── localAuth.ts       # Autenticação local
├── shared/                # Código compartilhado
│   └── schema.ts          # Esquemas Drizzle
└── package.json           # Dependências e scripts
```

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento (frontend + backend)
npm run build        # Build para produção
npm run db:push      # Atualizar schema do banco
npm run db:studio    # Interface visual do banco
```

## 🏠 Funcionalidades Principais

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

## 💾 Estrutura do Banco de Dados

### Tabelas Principais

**properties** - Propriedades imobiliárias
```sql
- id, name, nickname, address, purchase_price, purchase_date
- property_type, rental_type, status
- market_value, market_evaluation_date
```

**transactions** - Transações financeiras
```sql
- id, property_id, amount, date, type (revenue/expense)
- category, description, supplier, cpf_cnpj
```

**tax_payments** - Pagamentos de impostos
```sql
- id, tax_type, amount, payment_date, competence_month
- property_ids, parent_transaction_id
```

## 🔐 Autenticação

### Ambiente Local
O sistema detecta automaticamente o ambiente local e usa autenticação simplificada (session-based) sem necessidade de login.

### Ambiente Replit
Integração automática com Replit Auth via OpenID Connect.

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

## 🔧 Manutenção

### Backup do Banco
```bash
pg_dump gestao_imoveis > backup.sql
```

### Restaurar Backup
```bash
psql gestao_imoveis < backup.sql
```

### Logs
```bash
npm run dev 2>&1 | tee app.log
```

## 📱 Suporte a Dispositivos

- Design responsivo mobile-first
- Interface otimizada para desktop e tablet
- Touch-friendly para dispositivos móveis

## 🆘 Solução de Problemas

### Erro de Conexão com Banco
1. Verifique se PostgreSQL está rodando
2. Confirme as credenciais no .env
3. Teste a conexão: `psql $DATABASE_URL`

### Dependências Não Instaladas
1. Limpe cache: `npm cache clean --force`
2. Reinstale: `rm -rf node_modules && npm install`

### Problemas de Build
1. Verifique Node.js: `node --version` (deve ser 18+)
2. TypeScript: `npm run build` para verificar erros

## 🏗️ Desenvolvimento

### Adicionando Nova Propriedade
1. Acesse "Propriedades" → "Nova Propriedade"
2. Preencha dados básicos e endereço
3. Configure categorias de despesa específicas

### Importando Dados Airbnb
1. Baixe relatório CSV do Airbnb
2. Acesse "Importar" → "Airbnb"
3. Selecione tipo (histórico ou futuro)
4. Confirme mapeamento de propriedades

### Configurando Impostos
1. Acesse categoria "Impostos"
2. Clique "Cadastrar Impostos"
3. Selecione propriedades e tipo
4. Sistema calcula rateio automático

## 📞 Suporte Técnico

Para questões técnicas:
1. Verifique logs do servidor
2. Teste conexão com banco
3. Valide estrutura de dados

## 🔄 Atualizações

Sistema preparado para:
- Novos tipos de propriedade
- Categorias de despesa customizadas
- Integrações adicionais
- Relatórios personalizados

---

**Sistema desenvolvido com foco em independência e portabilidade - funciona em qualquer ambiente com Node.js e PostgreSQL.** 
