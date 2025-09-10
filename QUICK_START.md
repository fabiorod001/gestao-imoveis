# QUICK START - RentManager
**Última atualização: 10/09/2025**

## 🎯 O que é este projeto?
Sistema completo de gestão financeira para imóveis de aluguel com:
- Controle de múltiplas propriedades
- Importação automática de dados do Airbnb
- Importação de PDF de despesas de limpeza
- Gestão de receitas e despesas  
- Relatórios e análises financeiras
- Cálculo de impostos e distribuição proporcional
- Rastreamento de datas de hospedagem para cálculo de diárias
- **NOVO: Sistema de múltiplas contas bancárias**
- **NOVO: Lançamentos históricos (não afetam fluxo de caixa)**

## 🚀 Como acessar?
1. **URL Local**: http://localhost:5000
2. **Login**: Automático no ambiente de desenvolvimento
3. **Navegação**: Menu lateral com todas as funcionalidades

## 📊 Principais Funcionalidades

### 1. Gestão de Propriedades
- Cadastro completo com endereço e identificadores
- Status (ativo/inativo) e tipo de aluguel
- Visualização individual com análise financeira detalhada
- Cálculo de taxa de ocupação e valor médio de diária

### 2. Receitas
- **Categorias**: Airbnb, Booking, Recorrente, Outros
- **Datas duplas**: Data de pagamento (fluxo de caixa) + Datas de hospedagem (ocupação)
- Importação automática de CSVs do Airbnb com captura de datas de acomodação
- Distribuição proporcional entre propriedades
- Tracking de reservas futuras (pending)

### 3. Despesas
- Sistema de categorias configuráveis por propriedade
- Despesas compostas com múltiplos itens
- **Editor Universal**: Formulário completo para editar qualquer transação
- Clique em valores para abrir formulário de edição
- Botão "Eliminar entrada" para excluir registros
- Distribuição entre propriedades
- **Categoria "Ajuste de Saldo"**: Para criar marcos zero no fluxo de caixa

### 4. Sistema de Limpeza com Importação de PDF ✨ NOVO!
- **Importação Automática de PDF**: Lê PDFs de serviços de limpeza
- **Reconhecimento Inteligente**: Mapeia automaticamente propriedades
- **Processamento em Lote**: Importa múltiplas limpezas de uma vez
- **Suporte a Formatos Múltiplos**: 
  - PDFs com ou sem espaços entre campos
  - Suporte a descontos/adiantamentos (usa valores individuais)
  - Reconhece variações de nomes (ex: HADDOK/HADDOCK)
- **Interface Simplificada**: Importação direta sem seleção manual

### 5. Importação Airbnb
- **Histórico**: Relatórios de pagamentos realizados
- **Futuro**: Reservas pendentes
- **Datas de hospedagem**: Captura automática das colunas 5 (início) e 6 (fim)
- Detecção automática de período
- Substituição inteligente (preserva Booking, Recorrente e outras fontes)
- Preserva receitas Airbnb fora do período do relatório

### 6. Relatórios
- Dashboard com visão geral
- Análise por propriedade individual
- **Fluxo de caixa detalhado** ✅ CORRIGIDO!
  - Exibição de saldos, entradas e saídas funcionando
  - Botões de Entradas/Saídas ativos por padrão
  - Dados reais do sistema (R$ 2.378.257,29)
- Cálculo de ocupação e diária média (quando há datas de hospedagem)
- Exportação para Excel/PDF

### 7. Sistema de Múltiplas Contas ✨ NOVO!
- **Conta Principal**: ~90% das transações operacionais
- **Conta Secundária**: Financiamentos e pagamentos específicos
- **Conta de Investimentos**: Valores aplicados (visualização opcional)
- **Interface Discreta**: Botões de expansão no card de saldo
- **Quebra de Saldos**: Visualização detalhada por conta

### 8. Lançamentos Históricos ✨ NOVO!
- **Checkbox "Lançamento Histórico"**: Em todos os formulários de transação
- **Separação de Fluxos**: Lançamentos históricos não afetam o fluxo de caixa
- **Análise de Propriedades**: Históricos aparecem nas análises individuais
- **Marco Financeiro**: Use com "Ajuste de Saldo" para criar pontos de referência

## 🔧 Configurações Importantes

### Mapeamento Airbnb
Arquivo: `server/routes.ts` (linha ~1450)
```javascript
const AIRBNB_PROPERTY_MAPPING = {
  '1 Suíte Wonderful Einstein Morumbi': 'Living Einstein 708',
  '2 quartos, maravilhoso, na Avenida Berrini': 'Living Berrini 429',
  // ... adicione seus mapeamentos aqui
}
```

### Mapeamento de Limpeza (PDF)
Arquivo: `server/cleaningPdfParser.ts`
- Mapeamento automático de variações de nomes
- Suporta erros de digitação comuns (HADDOK/HADDOCK)
- Reconhece todas as 10 propriedades do sistema

### Categorias de Receitas
- **Airbnb**: Importação automática com datas de hospedagem
- **Booking**: Outras plataformas de reserva
- **Recorrente**: Aluguéis mensais fixos
- **Outros**: Receitas diversas

### Categorias de Despesas
- Configuráveis por propriedade
- Editáveis diretamente na interface
- Suportam reordenação drag-and-drop

## 📝 Fluxo de Trabalho Recomendado

1. **Cadastre suas propriedades** com nomes exatos
2. **Configure o mapeamento** Airbnb no código
3. **Importe dados históricos** via Excel ou CSV
4. **Importe relatórios Airbnb** mensalmente (sobrescreve apenas período do relatório)
5. **Importe PDFs de limpeza** quando receber do fornecedor
6. **Registre despesas** conforme ocorrem
7. **Analise relatórios** para tomada de decisão

## ⚠️ Pontos de Atenção

- **Moeda**: Sistema trabalha exclusivamente em BRL
- **Datas**: Formato brasileiro (DD/MM/AAAA)
- **Importação Airbnb**: 
  - Remove apenas transações Airbnb do período do relatório
  - Preserva Booking e outras fontes sempre
  - Preserva Airbnb de outros períodos
- **Importação PDF Limpeza**:
  - Ignora descontos/adiantamentos automaticamente
  - Usa valores individuais de cada serviço
  - Importa apenas propriedades reconhecidas
- **Datas de Hospedagem**: Essenciais para cálculo de ocupação e diária média
- **Backup**: Sistema cria checkpoints automáticos

## 🆘 Problemas Comuns

### Importação não funciona?
- Verifique o mapeamento de propriedades
- Confirme formato do CSV (deve ser o relatório oficial Airbnb)
- Certifique que o CSV tem as colunas de data de início e fim

### PDF de limpeza não reconhece propriedades?
- Verifique os nomes exatos no sistema
- O parser reconhece variações comuns automaticamente
- Propriedades não reconhecidas aparecem em amarelo

### Propriedade não aparece?
- Certifique que está ativa
- Verifique o nome exato no mapeamento

### Valores incorretos?
- Reimporte o relatório atualizado
- Sistema preserva dados de outras fontes automaticamente

### Datas de hospedagem não aparecem?
- Reimporte o CSV do Airbnb
- Novas importações capturam automaticamente as datas das colunas 5 e 6

## 💡 Dicas Rápidas

- Use **Ctrl+Click** para editar valores inline
- **Arraste** para reordenar categorias
- **Reimporte** CSVs do Airbnb para atualizar com datas de hospedagem
- **PDFs de limpeza** são processados automaticamente sem seleção manual
- **Checkpoints** salvam automaticamente
- **Categorias de receita**: Use "Airbnb" para importações, "Booking" para outras plataformas

## 📌 Status Atual (10/09/2025)
- ✅ Sistema 100% funcional
- ✅ **Fluxo de Caixa** completamente funcional e exibindo dados reais
- ✅ Importação com detecção de período e datas de hospedagem
- ✅ Preservação inteligente (só sobrescreve Airbnb do período)
- ✅ Interface responsiva e intuitiva
- ✅ Cálculo de ocupação e diária média corrigido (soma noites do CSV)
- ✅ Categorias específicas: Airbnb, Booking, Recorrente, Outros
- ✅ Formulário de receitas com datas de acomodação funcionando
- ✅ **Editor Universal de Transações** implementado
- ✅ **Sistema de notificações permanentes** com botão OK obrigatório
- ✅ **Importação de PDF de Limpeza** com reconhecimento automático
- ✅ **Sistema de Múltiplas Contas** com visualização detalhada
- ✅ **Lançamentos Históricos** separados do fluxo de caixa
- ✅ **Categoria "Ajuste de Saldo"** para marcos financeiros
- ✅ **Sistema de Impostos** com seleção automática de período atual

## 🔄 Atualizações Recentes

### 📅 10/09/2025 - Correções Críticas

#### ✅ Fluxo de Caixa - PROBLEMA RESOLVIDO
- **Problema**: APIs retornavam erro "transactionData is not defined"
- **Causa**: Variáveis incorretas nas rotas de cash flow no servidor
- **Solução**: Corrigidas todas as referências de variáveis nas APIs
- **Resultado**: 
  - Fluxo de caixa exibindo saldo real: **R$ 2.378.257,29**
  - Entradas e saídas visíveis por padrão
  - Tabela de evolução diária funcionando
  - Gráfico de linha funcionando

#### ✅ Sistema de Impostos - Melhorias
- **Seleção Automática**: Formulário pré-seleciona período atual (setembro 2025)
- **Calendário Futuro**: Permite agendar pagamentos para datas futuras
- **CSLL/IRPJ**: Sistema de cotas trimestrais funcionando
- **PIS/COFINS**: Sistema mensal funcionando

#### ✅ Interface de Usuário
- **Botões de Filtro**: Entradas e Saídas agora ficam ativos por padrão
- **Experiência Melhorada**: Dados são exibidos imediatamente ao acessar

### 📅 09/09/2025 - Implementações Anteriores

#### 🆕 Funcionalidades Implementadas (09/09):

- **Lançamentos Históricos (Reformulado)**
  - Checkbox simples e discreto em TODOS os formulários de receitas e despesas
  - Checkbox amarelo quando marcado (visual diferenciado)
  - Transações marcadas NÃO afetam o fluxo de caixa
  - Útil para dados históricos sem impactar projeções futuras

- **Marco Zero / Ajuste de Saldo (Nova Página)**
  - Localização: Menu **Configurações** no sidebar
  - Interface completa para definir saldos iniciais
  - Contas padrão: Principal, Secundária, Investimentos
  - Sistema de adição de novas contas (ilimitado)
  - Tipos de conta: Conta Corrente ou Investimento
  - Cria lançamentos históricos automaticamente
  - Ideal para estabelecer ponto de partida financeiro

### Melhorias Implementadas Anteriormente Hoje:

- **Sistema de Múltiplas Contas Bancárias**
  - Estrutura para gerenciar Conta Principal, Secundária e Investimentos
  - Interface discreta com botões de expansão no fluxo de caixa
  - Visualização detalhada de saldos por conta
  - Ícone de seta para expandir detalhes
  - Ícone de olho para mostrar/ocultar investimentos

- **Lançamentos Históricos**
  - Checkbox amarelo "Lançamento Histórico" em todos os formulários
  - Transações históricas não afetam o fluxo de caixa atual
  - Aparecem nas análises individuais de propriedades
  - Ideal para importar dados históricos sem impactar saldo atual

- **Sistema de Múltiplas Contas (Interface preparada)**
  - Estrutura visual para gerenciar múltiplas contas
  - Botões discretos de expansão no fluxo de caixa
  - Base para futura separação de saldos por conta

### Melhorias Anteriores:

- **Sistema de Importação de PDF de Limpeza**
  - Parser inteligente que reconhece múltiplos formatos de PDF
  - Suporte a PDFs com/sem espaços entre campos
  - Ignora automaticamente descontos e adiantamentos
  - Usa valores individuais de cada serviço
  - Reconhece variações de nomes (HADDOK/HADDOCK, etc)
  - Interface simplificada sem checkboxes
  - Importação automática de todas as entradas reconhecidas

- **Melhorias no Parser de PDF**
  - Detecção automática de formato (concatenado ou espaçado)
  - Mapeamento completo das 10 propriedades do sistema
  - Tratamento de erros de digitação comuns
  - Remoção de logs de debug e mensagens desnecessárias

- **Interface de Limpeza Aprimorada**
  - Remoção de seleção manual (checkboxes)
  - Importação direta com um clique
  - Visualização clara de propriedades reconhecidas/não reconhecidas
  - Remoção de informações confusas de contagem

### Funcionalidades Anteriores:
- **Sistema de Notificações Permanentes**
  - Avisos não desaparecem automaticamente
  - Botão OK obrigatório para confirmar leitura
  - Garante que mensagens importantes sejam vistas

- **Correção do Cálculo de Diárias do Airbnb**
  - Sistema agora soma corretamente as noites de cada reserva
  - Valor médio da diária = Receita total ÷ Total de noites ocupadas
  - Importação captura campo "Noites" do CSV do Airbnb

- **Melhorias no Dashboard**
  - Filtro de mês mostra todos os 108+ meses com transações (2014-2025)
  - Seleção dinâmica baseada em dados reais do sistema

- **Editor Universal de Transações** (`EditTransactionDialog`)
  - Formulário unificado para editar qualquer transação no sistema
  - Clique em valores de despesas/receitas abre formulário completo
  - Todos os campos editáveis: propriedade, valor, data, categoria, descrição, fornecedor, CPF/CNPJ
  - Botão "Eliminar entrada" para excluir registros
  - Funciona em todas as páginas: Despesas, Manutenção, Receitas
  - Salvamento sem duplicação de dados