# PRD - Sistema de Gestão de Imóveis

## Visão Geral
Sistema completo para gestão financeira de portfólio de imóveis com foco em rentabilidade individual, fluxo de caixa e análise gerencial detalhada.

## 1. GESTÃO DE IMÓVEIS

### 1.1 Cadastro Expandido
- **Identificação:**
  - Apelido (usado em todo o sistema)
  - Nome oficial do empreendimento
  - Endereço completo estruturado:
    - Nome do Condomínio
    - Logradouro, Número, Torre, Unidade
    - Bairro, Cidade, Estado, País, CEP
    - Formato de exibição: "Nome Condomínio, Logradouro, número, Torre, Unidade\nBairro, Cidade, Estado, País, CEP"

- **Documentação:**
  - Matrícula do Imóvel
  - Cadastro IPTU

- **Valores de Aquisição:**
  - Valor de compra
  - Comissões
  - Taxas e impostos
  - Reformas e decorações
  - Outros valores
  - **Total:** Soma automática = Valor de Aquisição
  - Data de aquisição
  - **Valor Atualizado IPCA:** Cálculo automático usando índice oficial do Banco Central

### 1.2 Rastreamento Individual
- Análise de rentabilidade por imóvel
- Lucro líquido mensal
- ROI baseado no valor atualizado pelo IPCA
- Dados gerenciais detalhados

## 2. SISTEMA DE RECEITAS

### 2.1 Importação Airbnb
**Prioridade 1: API Airbnb (se possível)**
- Integração direta para dados ACTUAL e PENDING
- Atualização automática

**Prioridade 2: Importação CSV**
- **Relatório ACTUAL:** Reservas já realizadas
- **Relatório PENDING:** Reservas futuras confirmadas

**Lógica de Sobreescrita:**
1. ACTUAL sempre sobrescreve PENDING para mesmas datas
2. Novo ACTUAL sobrescreve ACTUAL anterior em datas sobrepostas
3. Novo PENDING sobrescreve PENDING anterior para datas futuras

### 2.2 Locações Mensais
- Valor mensal fixo
- Definição de parcelas futuras (12, 30, 36 meses)
- Campos editáveis para reajustes contratuais

### 2.3 Previsões
- Apenas PENDING do Airbnb + contratos de longo prazo
- Sem previsões baseadas em histórico

## 3. SISTEMA DE DESPESAS

### 3.1 Dashboard Principal
- Lista de despesas de segundo nível do mês corrente
- Somatório total do mês
- Drill-down clicável por categoria

### 3.2 Estrutura de Condomínio por Imóvel

**Sevilha 307, Sevilha G07, Málaga M07:**
- Taxa condominial + Enel + Gás + Água + 2 campos extras

**MaxHaus:**
- Taxa condominial + Benfeitorias + Estacionamento + 2 campos extras

**Thera:**
- Taxa condominial + Fundo reserva + Água + Gás + Energia + 2 campos extras

**Haddock:**
- Taxa condominial + Energia + Fundo reserva + Internet + Gás + Água + 2 campos extras

### 3.3 Categorias Gerais (todos os imóveis)
- **Impostos:** CSLL, PIS, COFINS, IRPJ, IPTU
- **Gestão (Maurício):** Rateio customizável
- **Luz, Gás e Água**
- **Comissões**
- **IPTU:** 10 parcelas (fev-nov)
- **Financiamento**
- **Conserto/Manutenção:** Com descrição, fornecedor, CPF/CNPJ
- **TV/Internet:** Valores mensais repetidos
- **Limpeza:** Sistema inteligente de cadastro
- **Total Despesas:** Somatório automático

### 3.4 Sistema de Rateio

**Impostos (PIS, COFINS, CSLL, IRPJ):**
- Valor total da guia no mês de pagamento (caixa)
- Cálculo proporcional baseado no faturamento do mês anterior (competência)
- Divisão automática entre unidades selecionadas

**Gestão Maurício:**
- Valor total + data de pagamento
- Seleção de unidades para rateio
- Opções:
  - Divisão igual automática
  - Percentuais customizados (soma deve = 100%)
  - Correção automática se soma ≠ 100%

### 3.5 Sistema de Limpeza
- Campo de data (impacta fluxo de caixa)
- Lista vertical de unidades ativas
- Campos por unidade: quantidade × valor unitário = total
- Somatório total para fluxo de caixa
- Opção de selecionar imóveis adicionais (obras, decoração)

### 3.6 Despesas Futuras (12 meses)
- **Fixas:** Valor real ou média dos últimos 3 meses
- **Variáveis (Gestão, Limpeza):** Média dos últimos 3 meses
- **Esporádicas (Manutenção):** Não projetar

### 3.7 Fornecedores
- Cadastro automático durante pagamentos
- Dados salvos: Nome empresa, pessoa, CPF/CNPJ, valor, data
- Reutilização em futuras transações

## 4. DRILL-DOWN DETALHADO

### 4.1 Por Categoria
- **Gestão, Limpeza, Manutenção, Condomínio:** Tabela por unidade → detalhes por clique
- **Impostos:** Lista de impostos → detalhes por clique
- **Financiamento:** Por imóvel → detalhes por clique

### 4.2 Detalhamento
- Cada entrada individual do mês
- Quebra de valores compostos (ex: condomínio)
- Histórico de transações

## 5. MINI DASHBOARD POR IMÓVEL

### 5.1 Visão Mensal
- **Receitas:** Linha a linha do mês corrente
- **Despesas:** Linha a linha do mês corrente
- **Somatórios:** Total receitas, total despesas
- **Resultado:** Lucro/prejuízo do mês

### 5.2 Áreas de Cadastro
- **Receitas:** Menu por categoria → formulário
- **Despesas:** Menu por categoria → formulário
- **Nova Despesa:** Categoria customizada salva no database
- **Repetição:** Opção de repetir por 12 meses

### 5.3 Edição de Imóvel
- Botão para editar informações
- Reflexo direto no banco de dados
- Atualização na tabela de dados do Airbnb

## 6. FLUXO DE CAIXA
- Data de pagamento = data no fluxo
- Competência vs. Caixa claramente separados
- Projeções baseadas em contratos e despesas fixas

## 7. TECNOLOGIAS
- **Backend:** Node.js + TypeScript
- **Database:** SQLite (simplicidade) com possibilidade de migração
- **Frontend:** React + TypeScript + Tailwind
- **Validação:** Zod schemas
- **ORM:** Drizzle (já configurado)

## 8. PRIORIDADES DE IMPLEMENTAÇÃO
1. Novo schema de banco de dados
2. Sistema de imóveis expandido
3. Importação CSV Airbnb
4. Sistema de despesas com rateio
5. Mini dashboard por imóvel
6. Dashboard principal de despesas
7. API Airbnb (se viável)
8. Correção IPCA automática

---

**Status:** Pronto para implementação
**Confiança:** Alta - Todos os requisitos mapeados e estruturados