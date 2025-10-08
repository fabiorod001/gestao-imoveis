# 🔍 RentManager - Audit Report: Backend API ↔️ Frontend UI Mapping

**Data:** October 8, 2025  
**Objetivo:** Identificar funcionalidades backend sem acesso via UI após refatoração mobile-first

---

## 📊 Resumo Executivo

### Estatísticas Gerais
- **Backend Endpoints:** 95 rotas mapeadas
- **Frontend Pages:** 42 páginas identificadas
- **Rotas com UI:** ~75%
- **Rotas Órfãs (Sem UI):** ~25% ⚠️

### Status de Conectividade
✅ **CONECTADAS** - Rotas acessíveis via UI  
⚠️ **ÓRFÃS** - Rotas backend sem UI correspondente  
🔧 **PARCIALMENTE CONECTADAS** - UI existe mas funcionalidade limitada

---

## 🎯 1. ANÁLISE POR FUNCIONALIDADE

### 1.1 🏠 PROPERTIES (Imóveis)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/properties` | ✅ CONECTADA | `/properties` |
| GET | `/api/properties/:id` | ✅ CONECTADA | `/properties/:id` |
| POST | `/api/properties` | ✅ CONECTADA | `/properties/new` |
| PUT | `/api/properties/:id` | ✅ CONECTADA | `/properties/:id/edit` |
| DELETE | `/api/properties/:id` | ✅ CONECTADA | `/properties/:id/edit` |
| GET | `/api/properties/:id/return-rate/:month/:year` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/properties/:id/expense-components` | ✅ CONECTADA | `/properties/:id` (expense config) |
| POST | `/api/properties/:id/expense-components` | ✅ CONECTADA | `/properties/:id` |
| POST | `/api/properties/:id/copy-expense-template` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/properties/:id/transactions` | ✅ CONECTADA | `/properties/:id` |

**Funcionalidades Órfãs:**
- ❌ **Taxa de Retorno Mensal** - Cálculo existe no backend mas não há UI
- ❌ **Copiar Template de Despesas** - Feature completa no backend sem UI

---

### 1.2 💰 TRANSACTIONS (Transações)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/transactions` | ✅ CONECTADA | `/revenues`, `/expenses` |
| GET | `/api/transactions/suggestions/:category` | ✅ CONECTADA | Forms com smart suggestions |
| GET | `/api/transactions/property/:propertyId` | ✅ CONECTADA | `/properties/:id` |
| POST | `/api/transactions` | ✅ CONECTADA | Vários forms |
| PUT | `/api/transactions/:id` | ✅ CONECTADA | Edit dialogs |
| DELETE | `/api/transactions/:id` | ✅ CONECTADA | Edit dialogs |
| POST | `/api/transactions/composite` | ✅ CONECTADA | Composite expense forms |
| DELETE | `/api/cleanup/transactions` | ⚠️ ÓRFÃ | **SEM UI** |

**Funcionalidades Órfãs:**
- ❌ **Cleanup de Transações** - Limpeza em batch de transações

---

### 1.3 📊 ANALYTICS (Análises)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/analytics/summary` | 🔧 PARCIAL | `/dashboard` (summary básico) |
| GET | `/api/analytics/monthly/:year` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/property-distribution` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/pivot-table` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/transactions-by-periods` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/available-months` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/pivot-with-ipca` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/single-month-detailed` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/analytics/cash-flow` | ✅ CONECTADA | `/` (Cash Flow page) |
| GET | `/api/analytics/cash-flow-stats` | ✅ CONECTADA | `/` (Cash Flow page) |
| GET | `/api/analytics/cash-flow-projection` | 🔧 PARCIAL | Implementação incompleta |
| GET | `/api/analytics/cash-flow-health` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/ipca/calculate` | ⚠️ ÓRFÃ | **SEM UI** |

**Funcionalidades Órfãs - Analytics:**
- ❌ **Relatório Mensal por Ano** - Dados mensais consolidados por ano
- ❌ **Distribuição por Status de Imóvel** - Análise de portfólio
- ❌ **Tabela Pivot** - Análise cruzada de dados
- ❌ **Transações por Períodos** - Comparação entre meses
- ❌ **Pivot com IPCA** - Correção monetária automática
- ❌ **Detalhamento de Mês Único** - Deep dive em um mês específico
- ❌ **Análise de Saúde do Cash Flow** - Indicadores de risco
- ❌ **Calculadora IPCA** - Correção monetária manual

---

### 1.4 💸 EXPENSES (Despesas)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/expenses/dashboard` | ✅ CONECTADA | `/expenses` |
| GET | `/api/expenses/management/:id` | ✅ CONECTADA | `/expenses/management` |
| POST | `/api/expenses/management` | ✅ CONECTADA | `/expenses/management` |
| PUT | `/api/expenses/management/:id` | ✅ CONECTADA | `/expenses/management` |
| POST | `/api/expenses/distributed` | ✅ CONECTADA | Distributed expense forms |
| POST | `/api/expenses/distributed/preview` | ✅ CONECTADA | Preview before create |
| POST | `/api/expenses/company` | ✅ CONECTADA | Company expense forms |
| POST | `/api/expenses/cleaning-batch` | ✅ CONECTADA | `/expenses/cleaning` |
| POST | `/api/expenses/mauricio` | ✅ CONECTADA | `/expenses/mauricio` |
| POST | `/api/expenses/cleaning-detailed` | 🔧 PARCIAL | Implementação incompleta |

**Status:** ✅ Bem conectada - A maioria das rotas de despesas tem UI correspondente

---

### 1.5 🧹 CLEANING (Limpeza)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| POST | `/api/cleaning/import` | ✅ CONECTADA | `/cleaning/import` |
| POST | `/api/cleaning/ocr` | 🔧 PARCIAL | OCR test page exists |
| POST | `/api/cleaning/match` | ✅ CONECTADA | `/cleaning/import` |
| POST | `/api/cleaning/mapping` | ✅ CONECTADA | `/cleaning/import` |
| GET | `/api/cleaning/property/:id` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/cleaning/batches` | ✅ CONECTADA | `/expenses/cleaning` |
| GET | `/api/cleaning/batch/:id` | ⚠️ ÓRFÃ | **SEM UI** |
| DELETE | `/api/cleaning/batch/:id` | ⚠️ ÓRFÃ | **SEM UI** |
| POST | `/api/cleaning/parse-pdf` | ✅ CONECTADA | `/cleaning/import` |
| POST | `/api/cleaning/import-pdf` | ✅ CONECTADA | `/cleaning/import` |

**Funcionalidades Órfãs:**
- ❌ **Visualizar Limpezas por Imóvel** - Histórico de limpeza
- ❌ **Detalhes de Batch** - Ver detalhes completos de um lote
- ❌ **Deletar Batch de Limpeza** - Remover lote importado

---

### 1.6 💼 TAXES (Impostos)

#### Backend Routes - Tax Payments
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| POST | `/api/taxes/simple` | ✅ CONECTADA | `/taxes` |
| POST | `/api/taxes/preview` | ✅ CONECTADA | `/taxes` |
| POST | `/api/taxes/calculate-pis-cofins` | ✅ CONECTADA | `/taxes` |
| POST | `/api/taxes/import/excel` | 🔧 PARCIAL | Import exists, needs UI |
| POST | `/api/taxes/import/csv` | 🔧 PARCIAL | Import exists, needs UI |
| POST | `/api/taxes/payments` | ✅ CONECTADA | `/taxes` |
| GET | `/api/taxes/payments` | ✅ CONECTADA | `/taxes` |
| PUT | `/api/taxes/payments/:id/pay` | ✅ CONECTADA | `/taxes` |
| GET | `/api/taxes/summary/:year` | ⚠️ ÓRFÃ | **SEM UI** |

#### Backend Routes - Tax Settings & Advanced
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| POST | `/api/taxes/initialize` | ✅ CONECTADA | `/settings/taxes` |
| GET | `/api/taxes/settings` | ✅ CONECTADA | `/settings/taxes` |
| PUT | `/api/taxes/settings/:taxType` | ✅ CONECTADA | `/settings/taxes` |
| POST | `/api/taxes/calculate` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/taxes/projections` | ⚠️ ÓRFÃ | **SEM UI** |
| PATCH | `/api/taxes/projections/:id` | ⚠️ ÓRFÃ | **SEM UI** |
| POST | `/api/taxes/projections/:id/confirm` | ⚠️ ÓRFÃ | **SEM UI** |
| POST | `/api/taxes/recalculate` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/taxes/cash-flow-projections` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/taxes/report/:year` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/taxes/period` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/taxes/distribution` | ⚠️ ÓRFÃ | **SEM UI** |
| GET | `/api/taxes/monthly-comparison/:year` | ⚠️ ÓRFÃ | **SEM UI** |
| POST | `/api/taxes/projections-enhanced` | ⚠️ ÓRFÃ | **SEM UI** |

**Funcionalidades Órfãs - Sistema Avançado de Impostos:**
- ❌ **Projeções de Impostos** - Sistema completo de projeção futura
- ❌ **Confirmação de Projeções** - Converter projeção em transação
- ❌ **Recálculo Automático** - Atualizar projeções
- ❌ **Impostos para Cash Flow** - Integração com fluxo de caixa
- ❌ **Relatório Anual de Impostos** - Report consolidado
- ❌ **Análise por Período** - Filtros avançados
- ❌ **Distribuição por Imóvel** - Proporcionalidade
- ❌ **Comparação Mensal** - Tendências ao longo do ano
- ❌ **Projeções Avançadas** - Com sazonalidade

---

### 1.7 📥 IMPORT (Importação)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| POST | `/api/import/historical` | ✅ CONECTADA | `/import` |
| POST | `/api/import/airbnb-csv/analyze` | ✅ CONECTADA | `/import` |
| POST | `/api/import/airbnb-csv` | ✅ CONECTADA | `/import` |
| POST | `/api/import/airbnb-pending` | ✅ CONECTADA | `/import` |

**Status:** ✅ Todas as rotas de importação conectadas

---

### 1.8 📍 MARCO ZERO (Zero Point)

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/marco-zero/active` | ✅ CONECTADA | `/marco-zero` |
| GET | `/api/marco-zero/history` | ✅ CONECTADA | `/marco-zero` |
| POST | `/api/marco-zero` | ✅ CONECTADA | `/marco-zero` |
| GET | `/api/reconciliation` | ⚠️ ÓRFÃ | **SEM UI** |
| POST | `/api/reconciliation` | ⚠️ ÓRFÃ | **SEM UI** |
| DELETE | `/api/reconciliation/:id` | ⚠️ ÓRFÃ | **SEM UI** |

**Funcionalidades Órfãs:**
- ❌ **Ajustes de Reconciliação** - Sistema de ajustes manuais completo sem UI

---

### 1.9 🏢 CONDOMINIUM OCR

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| POST | `/api/condominium/ocr` | 🔧 PARCIAL | `/condominium/ocr-test` (test page only) |

**Status:** 🔧 Existe página de teste mas não integrada ao fluxo principal

---

### 1.10 💳 ACCOUNTS & CASH FLOW

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/accounts` | ✅ CONECTADA | `/` (Cash Flow), `/marco-zero` |
| GET | `/api/cash-flow/summary` | ✅ CONECTADA | `/` (Cash Flow page) |

**Status:** ✅ Conectado

---

### 1.11 🔐 AUTHENTICATION

#### Backend Routes
| Método | Endpoint | Status | UI Page |
|--------|----------|--------|---------|
| GET | `/api/auth/user` | ✅ CONECTADA | Auto-loaded on app start |

**Status:** ✅ Conectado

---

## 📄 2. FRONTEND PAGES INVENTORY

### 2.1 Páginas Principais (In Use)
| Path | File | Connected Routes | Status |
|------|------|-----------------|--------|
| `/` | `cash-flow.tsx` | `/api/analytics/cash-flow`, `/api/accounts` | ✅ Active |
| `/dashboard` | `dashboard.tsx` | `/api/analytics/summary` | ✅ Active |
| `/properties` | `properties.tsx` | `/api/properties` | ✅ Active |
| `/properties/new` | `property-new.tsx` | `POST /api/properties` | ✅ Active |
| `/properties/:id` | `property-details.tsx` | `/api/properties/:id` | ✅ Active |
| `/properties/:id/edit` | `edit-property.tsx` | `PUT /api/properties/:id` | ✅ Active |
| `/revenues` | `revenues.tsx` | `/api/transactions?type=revenue` | ✅ Active |
| `/expenses` | `expenses.tsx` | `/api/expenses/dashboard` | ✅ Active |
| `/expenses/management` | `expenses/management.tsx` | `/api/expenses/management` | ✅ Active |
| `/expenses/mauricio` | `expenses/mauricio.tsx` | `POST /api/expenses/mauricio` | ✅ Active |
| `/expenses/cleaning` | `expenses/cleaning.tsx` | `/api/cleaning/batches` | ✅ Active |
| `/expenses/condominium` | `expenses/condominium.tsx` | Composite expense | ✅ Active |
| `/expenses/others` | `expenses/others.tsx` | Various expense types | ✅ Active |
| `/taxes` | `taxes.tsx` | `/api/taxes/*` (payments) | ✅ Active |
| `/settings/taxes` | `tax-settings.tsx` | `/api/taxes/settings` | ✅ Active |
| `/import` | `import.tsx` | `/api/import/*` | ✅ Active |
| `/reports` | `reports.tsx` | Various analytics | ✅ Active |
| `/marco-zero` | `marco-zero.tsx` | `/api/marco-zero/*` | ✅ Active |
| `/cleaning/import` | `cleaning-import.tsx` | `/api/cleaning/parse-pdf` | ✅ Active |
| `/settings` | `settings.tsx` | General settings | ✅ Active |

### 2.2 Páginas de Detalhe de Despesas
| Path | File | Purpose |
|------|------|---------|
| `/expenses/category/:category` | `expenses/category-detail.tsx` | Generic category details |
| `/expenses/taxes-detail` | `expenses/taxes-detail.tsx` | Tax expense details |
| `/expenses/condominium-detail` | `expenses/condominium-detail.tsx` | Condo expense details |
| `/expenses/management-detail` | `expenses/management-detail.tsx` | Management details |
| `/expenses/utilities-detail` | `expenses/utilities-detail.tsx` | Utilities details |
| `/expenses/maintenance-detail` | `expenses/maintenance-detail.tsx` | Maintenance details |
| `/expenses/cleaning-detail` | `expenses/cleaning-detail.tsx` | Cleaning details |
| `/expenses/financing-detail` | `expenses/financing-detail.tsx` | Financing details |
| `/expenses/other-detail` | `expenses/other-detail.tsx` | Other expenses details |

### 2.3 Páginas de Teste/Debug (Non-Production)
| Path | File | Status |
|------|------|--------|
| `/condominium/ocr-test` | `condominium-ocr-test.tsx` | 🧪 Test page |
| `properties-table.tsx` | - | 🗑️ Alternative view (unused?) |
| `properties-OLD.tsx` | - | 🗑️ Old version |
| `dashboard-OLD.tsx` | - | 🗑️ Old version |
| `cash-flow-OLD.tsx` | - | 🗑️ Old version |
| `transaction-new.tsx` | - | ❓ Unused? |
| `transactions-list.tsx` | - | ❓ Unused? |
| `property-form.tsx` | - | ❓ Component or page? |
| `analytics.tsx` | - | ❓ Unused? |
| `analytics-dashboard.tsx` | - | ❓ Unused? |
| `airbnb-review.tsx` | - | ❓ Nested in import? |

---

## 🚨 3. FUNCIONALIDADES CRÍTICAS SEM UI

### 3.1 Analytics Avançado ⚠️ ALTO IMPACTO
**Problema:** Sistema completo de analytics no backend sem UI correspondente

**Rotas Órfãs:**
- `/api/analytics/monthly/:year` - Dados mensais consolidados
- `/api/analytics/property-distribution` - Análise de portfólio
- `/api/analytics/pivot-table` - Tabela pivot com múltiplas dimensões
- `/api/analytics/pivot-with-ipca` - Correção monetária IPCA
- `/api/analytics/single-month-detailed` - Deep dive mensal
- `/api/analytics/transactions-by-periods` - Comparação entre períodos

**Impacto:** Usuário perde acesso a análises financeiras avançadas implementadas

**Recomendação:** Criar página `/analytics` ou `/reports/advanced` conectando estas funcionalidades

---

### 3.2 Sistema de Projeções de Impostos ⚠️ ALTO IMPACTO
**Problema:** Sistema completo de projeção e gestão de impostos sem UI

**Rotas Órfãs:**
- `/api/taxes/projections` - Listar projeções
- `/api/taxes/calculate` - Calcular projeções
- `/api/taxes/projections/:id/confirm` - Confirmar e criar transação
- `/api/taxes/recalculate` - Recalcular automático
- `/api/taxes/cash-flow-projections` - Integração com cash flow
- `/api/taxes/period` - Análise por período
- `/api/taxes/distribution` - Distribuição por imóvel
- `/api/taxes/monthly-comparison/:year` - Comparação mensal

**Impacto:** Sistema avançado de impostos inacessível - apenas pagamento manual disponível

**Recomendação:** Expandir página `/taxes` com aba de projeções ou criar `/taxes/projections`

---

### 3.3 Taxa de Retorno de Imóveis ⚠️ MÉDIO IMPACTO
**Problema:** Cálculo de rentabilidade implementado mas não acessível

**Rota Órfã:**
- `/api/properties/:id/return-rate/:month/:year`

**Impacto:** Métrica importante de performance por imóvel não visível

**Recomendação:** Adicionar à página `/properties/:id` (Property Details)

---

### 3.4 Ajustes de Reconciliação (Marco Zero) ⚠️ MÉDIO IMPACTO
**Problema:** Sistema de ajustes manuais implementado sem UI

**Rotas Órfãs:**
- `GET /api/reconciliation`
- `POST /api/reconciliation`
- `DELETE /api/reconciliation/:id`

**Impacto:** Impossível fazer ajustes manuais de conciliação

**Recomendação:** Adicionar à página `/marco-zero`

---

### 3.5 Gestão Avançada de Limpeza ⚠️ BAIXO IMPACTO
**Rotas Órfãs:**
- `/api/cleaning/property/:id` - Histórico de limpeza por imóvel
- `/api/cleaning/batch/:id` - Detalhes de batch
- `DELETE /api/cleaning/batch/:id` - Deletar batch

**Recomendação:** Adicionar detalhes à página `/expenses/cleaning`

---

### 3.6 Copiar Template de Despesas ⚠️ BAIXO IMPACTO
**Rota Órfã:**
- `POST /api/properties/:id/copy-expense-template`

**Impacto:** Funcionalidade de produtividade não acessível

**Recomendação:** Adicionar botão em Property Details ou Settings

---

### 3.7 Cleanup de Transações ⚠️ BAIXO IMPACTO
**Rota Órfã:**
- `DELETE /api/cleanup/transactions`

**Impacto:** Função de manutenção administrativa

**Recomendação:** Adicionar a Settings como função admin

---

### 3.8 Calculadora IPCA ⚠️ BAIXO IMPACTO
**Rota Órfã:**
- `GET /api/ipca/calculate`

**Impacto:** Ferramenta útil de correção monetária

**Recomendação:** Adicionar como utility em Reports ou Settings

---

## 📋 4. PÁGINAS CANDIDATAS A REMOÇÃO

### 4.1 Arquivos OLD (Claramente Obsoletos)
```
client/src/pages/properties-OLD.tsx
client/src/pages/dashboard-OLD.tsx
client/src/pages/cash-flow-OLD.tsx
```
**Recomendação:** ✅ **DELETAR** - Backups antigos já substituídos

### 4.2 Páginas Potencialmente Não Usadas
```
client/src/pages/transaction-new.tsx
client/src/pages/transactions-list.tsx
client/src/pages/analytics.tsx
client/src/pages/analytics-dashboard.tsx
```
**Recomendação:** ⚠️ **INVESTIGAR** - Verificar se estão em uso antes de remover

### 4.3 Componentes vs Pages Ambíguos
```
client/src/pages/property-form.tsx
```
**Recomendação:** ⚠️ **VERIFICAR** - Se é component, mover para `/components`

---

## ✅ 5. RECOMENDAÇÕES PRIORITÁRIAS

### Prioridade ALTA 🔴
1. **Criar página de Analytics Avançado** (`/analytics` ou `/reports/advanced`)
   - Conectar: pivot tables, IPCA, comparações, distribuições
   - Impacto: Restaura funcionalidades analíticas perdidas

2. **Expandir Sistema de Impostos** (adicionar aba Projeções em `/taxes`)
   - Conectar: todo o sistema de projeções, confirmações, recálculos
   - Impacto: Automação de gestão tributária

### Prioridade MÉDIA 🟡
3. **Adicionar Taxa de Retorno em Property Details**
   - Conectar: `/api/properties/:id/return-rate/:month/:year`
   - Impacto: Métrica chave de performance

4. **Expandir Marco Zero com Reconciliação**
   - Conectar: CRUD de ajustes de reconciliação
   - Impacto: Precisão de saldos

5. **Melhorar Gestão de Limpeza**
   - Conectar: histórico por imóvel, detalhes de batch, delete
   - Impacto: Visibilidade de custos recorrentes

### Prioridade BAIXA 🟢
6. **Adicionar Copiar Template de Despesas**
   - Local: Property Details ou Settings
   - Impacto: Produtividade

7. **Cleanup de Transações em Settings**
   - Local: Settings como admin tool
   - Impacto: Manutenção do sistema

8. **Calculadora IPCA**
   - Local: Reports ou Settings como utility
   - Impacto: Ferramenta adicional

### Limpeza de Código 🧹
9. **Remover arquivos OLD**
   - Deletar: `*-OLD.tsx`
   - Impacto: Organização

10. **Investigar páginas não usadas**
    - Verificar: `transaction-new.tsx`, `transactions-list.tsx`, etc.
    - Impacto: Codebase mais limpo

---

## 📊 6. MATRIZ DE COBERTURA

### Por Categoria (% de rotas com UI)

| Categoria | Total Routes | Conectadas | Órfãs | % Cobertura |
|-----------|--------------|------------|-------|-------------|
| Properties | 10 | 8 | 2 | 80% |
| Transactions | 8 | 7 | 1 | 87% |
| Analytics | 13 | 3 | 10 | **23%** ⚠️ |
| Expenses | 10 | 9 | 1 | 90% |
| Cleaning | 10 | 7 | 3 | 70% |
| Taxes - Basic | 9 | 8 | 1 | 89% |
| Taxes - Advanced | 14 | 0 | 14 | **0%** ⚠️ |
| Import | 4 | 4 | 0 | 100% ✅ |
| Marco Zero | 6 | 3 | 3 | 50% |
| Condominium OCR | 1 | 0.5 | 0.5 | 50% |
| Accounts | 2 | 2 | 0 | 100% ✅ |
| Auth | 1 | 1 | 0 | 100% ✅ |

**TOTAL GERAL:** ~75% conectadas, ~25% órfãs

---

## 🎯 7. PLANO DE AÇÃO SUGERIDO

### Sprint 1: Funcionalidades Críticas (1-2 semanas)
- [ ] Criar `/analytics` ou `/reports/advanced`
  - [ ] Pivot tables
  - [ ] Comparações mensais
  - [ ] Análise com IPCA
  - [ ] Distribuições
  
- [ ] Expandir `/taxes` com sistema de projeções
  - [ ] Aba "Projeções"
  - [ ] Calcular e visualizar
  - [ ] Confirmar projeções
  - [ ] Integração com cash flow

### Sprint 2: Melhorias Importantes (1 semana)
- [ ] Adicionar Taxa de Retorno em Property Details
- [ ] Expandir Marco Zero com ajustes de reconciliação
- [ ] Melhorar UI de Cleaning (histórico, batch details)

### Sprint 3: Utilitários e Limpeza (3-5 dias)
- [ ] Copiar Template de Despesas
- [ ] Cleanup de Transações em Settings
- [ ] Calculadora IPCA
- [ ] Remover arquivos OLD
- [ ] Investigar e remover páginas não usadas

---

## 📝 8. NOTAS FINAIS

### Pontos Positivos ✅
- Sistema de importação 100% conectado
- Gestão básica de despesas bem coberta
- Autenticação e contas funcionais
- CRUD de imóveis completo

### Pontos de Atenção ⚠️
- **Analytics avançado**: Grande gap entre backend e frontend
- **Sistema de impostos**: Projeções automáticas não acessíveis
- **Arquivos obsoletos**: Vários `-OLD.tsx` para limpar

### Observações Técnicas
- Sistema backend robusto e bem estruturado
- Frontend mobile-first bem implementado
- Algumas funcionalidades foram "perdidas" na refatoração
- Oportunidade de restaurar features valiosas

---

**Gerado em:** October 8, 2025  
**Próxima Revisão:** Após implementação das prioridades ALTA
