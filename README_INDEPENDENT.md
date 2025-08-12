# 🏢 Property Manager - Sistema Independente de Gestão Imobiliária

## 🎯 Visão Geral

Sistema completo de gestão financeira para portfólio imobiliário, 100% independente e portável. Especializado em análise inteligente de dados Airbnb, gestão multi-propriedade e relatórios financeiros avançados.

## ✅ Características Principais

### 📊 Dashboard Financeiro Avançado
- **Tabela Pivot Excel-like** com filtros dinâmicos
- **Análise por Propriedade** com drill-down detalhado
- **Cálculo de Margem IPCA** automático
- **Exportação Excel/PDF** profissional

### 🏨 Integração Airbnb Inteligente
- **Import CSV Automático** com mapeamento de propriedades
- **Processamento de Payouts** históricos
- **Gestão de Reservas Futuras** para projeções
- **Distribuição Proporcional** entre propriedades

### 💰 Gestão Financeira Completa
- **Sistema de Despesas Hierárquico** (7 categorias principais)
- **Rateio Inteligente** de custos compartilhados
- **Fluxo de Caixa** com projeções diárias
- **Gestão de Impostos** com parcelamento

### 🔧 Características Técnicas
- **100% Portável** - funciona em qualquer ambiente
- **PostgreSQL Universal** - compatível com qualquer provedor
- **Autenticação Simples** - sem dependências proprietárias
- **TypeScript Full-Stack** - type-safe end-to-end

## 🚀 Instalação Rápida

### 1. Clone e Configure
```bash
git clone https://github.com/fabiorod001/gestao-imoveis.git
cd gestao-imoveis
npm install
```

### 2. Configure o Banco
```bash
# Copie as variáveis de ambiente
cp .env.example .env

# Configure sua DATABASE_URL no .env
DATABASE_URL=postgresql://user:pass@localhost:5432/property_manager
```

### 3. Execute as Migrações
```bash
npm run db:push
```

### 4. Inicie o Sistema
```bash
npm run dev
# Acesse: http://localhost:5000
```

## 📋 Estrutura do Projeto

```
property-manager/
├── client/                 # Frontend React + TypeScript
│   ├── src/components/     # Componentes reutilizáveis
│   ├── src/pages/         # Páginas da aplicação
│   └── src/lib/           # Utilitários e configurações
├── server/                # Backend Express + TypeScript
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Camada de dados
│   ├── simpleAuth.ts      # Autenticação independente
│   └── db-independent.ts  # Conexão PostgreSQL universal
├── shared/                # Schemas e tipos compartilhados
│   └── schema.ts          # Definições Drizzle ORM
└── package.independent.json # Dependências independentes
```

## 🎯 Funcionalidades Implementadas

### ✅ Sistema de Propriedades
- 10 propriedades cadastradas e funcionais
- Gestão completa de endereços e detalhes
- Status tracking (Ativo, Decoração, Financiamento, Inativo)
- Cálculos de valor de aquisição com correção IPCA

### ✅ Dashboard Pivot Table
- Filtros avançados (meses, propriedades, categorias)
- Ordenação e redimensionamento de colunas
- Cálculo automático de médias mensais
- Exportação Excel/PDF com formatação

### ✅ Integração Airbnb
- Parser CSV robusto para relatórios oficiais
- Mapeamento automático de listings para propriedades
- Processamento de payouts com distribuição proporcional
- Gestão de reservas futuras para planning

### ✅ Sistema de Despesas
- 7 categorias principais: Impostos, Condomínio, Gestão, Manutenção, Financiamento, Limpeza, Despesas Gerais
- Rateio proporcional para custos compartilhados
- Edição inline de transações
- Drill-down hierárquico (Categoria → Propriedade → Transações)

### ✅ Relatórios e Analytics
- Fluxo de caixa com 4 períodos de visualização
- Cálculo de margem com correção IPCA
- Separação receitas confirmadas vs previstas
- Exportação profissional (Excel/PDF)

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + TypeScript
- **Vite** para build otimizado
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** para state management
- **Wouter** para roteamento

### Backend
- **Express.js** + TypeScript
- **Drizzle ORM** com PostgreSQL
- **Multer** para upload de arquivos
- **ExcelJS** para processamento de planilhas
- **Session-based auth** independente

### Database
- **PostgreSQL** (qualquer provedor)
- **Drizzle Kit** para migrações
- **Connection pooling** configurado

## 🔒 Segurança e Portabilidade

### ✅ Características de Independência
- **Sem dependências proprietárias** - roda em qualquer ambiente
- **PostgreSQL universal** - compatível com todos os provedores
- **Autenticação simples** - session-based, sem OAuth externo
- **Build standard** - sem plugins específicos de plataforma

### 🚀 Deploy em Qualquer Lugar
- **Vercel/Netlify** - deploy frontend + serverless functions
- **Railway/Render** - deploy full-stack
- **Docker** - containerização completa
- **VPS Tradicional** - instalação direta

## 📊 Dados de Exemplo

O sistema vem com dados reais de 10 propriedades:
- **Portfolio total**: R$ 1.921.899,41 em receitas
- **Cash flow atual**: R$ 1.152.305,63
- **Propriedades ativas**: MaxHaus Berrini, Málaga M07, Sevilha 307, Sevilha G07, Next Haddock Lobo, Thera by You, Casa Ibirapuera, Living Full Faria Lima, Salas Brasal

## 🛡️ Backup e Recuperação

### Backup Completo
```bash
# Backup do banco
pg_dump $DATABASE_URL > backup.sql

# Backup dos arquivos
tar -czf property-manager-backup.tar.gz ./
```

### Restauração
```bash
# Restaurar banco
psql $DATABASE_URL < backup.sql

# Restaurar arquivos
tar -xzf property-manager-backup.tar.gz
```

## 📞 Suporte

Sistema desenvolvido para gestão profissional de portfólio imobiliário com foco em:
- **Independência total** de plataformas proprietárias
- **Portabilidade completa** entre ambientes
- **Escalabilidade** para qualquer tamanho de portfólio
- **Precisão financeira** com dados reais

## 🏆 Status do Projeto

**✅ SISTEMA 100% FUNCIONAL E INDEPENDENTE**
- Testado em produção com dados reais
- Todos os endpoints funcionando
- Dashboard responsivo e completo
- Integração Airbnb validada
- Exports Excel/PDF operacionais
- Zero dependências proprietárias

---

*Desenvolvido com TypeScript, React e PostgreSQL para máxima portabilidade e performance.*