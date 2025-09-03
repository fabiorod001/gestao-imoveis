# QUICK START - RentManager
**Última atualização: 03/09/2025**

## 🎯 O que é este projeto?
Sistema completo de gestão financeira para imóveis de aluguel com:
- Controle de múltiplas propriedades
- Importação automática de dados do Airbnb
- Gestão de receitas e despesas  
- Relatórios e análises financeiras
- Cálculo de impostos e distribuição proporcional
- Rastreamento de datas de hospedagem para cálculo de diárias

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

### 4. Importação Airbnb
- **Histórico**: Relatórios de pagamentos realizados
- **Futuro**: Reservas pendentes
- **Datas de hospedagem**: Captura automática das colunas 5 (início) e 6 (fim)
- Detecção automática de período
- Substituição inteligente (preserva Booking, Recorrente e outras fontes)
- Preserva receitas Airbnb fora do período do relatório

### 5. Relatórios
- Dashboard com visão geral
- Análise por propriedade individual
- Fluxo de caixa detalhado
- Cálculo de ocupação e diária média (quando há datas de hospedagem)
- Exportação para Excel/PDF

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
5. **Registre despesas** conforme ocorrem
6. **Analise relatórios** para tomada de decisão

## ⚠️ Pontos de Atenção

- **Moeda**: Sistema trabalha exclusivamente em BRL
- **Datas**: Formato brasileiro (DD/MM/AAAA)
- **Importação Airbnb**: 
  - Remove apenas transações Airbnb do período do relatório
  - Preserva Booking e outras fontes sempre
  - Preserva Airbnb de outros períodos
- **Datas de Hospedagem**: Essenciais para cálculo de ocupação e diária média
- **Backup**: Sistema cria checkpoints automáticos

## 🆘 Problemas Comuns

### Importação não funciona?
- Verifique o mapeamento de propriedades
- Confirme formato do CSV (deve ser o relatório oficial Airbnb)
- Certifique que o CSV tem as colunas de data de início e fim

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
- **Checkpoints** salvam automaticamente
- **Categorias de receita**: Use "Airbnb" para importações, "Booking" para outras plataformas

## 📌 Status Atual (03/09/2025)
- ✅ Sistema 100% funcional
- ✅ Importação com detecção de período e datas de hospedagem
- ✅ Preservação inteligente (só sobrescreve Airbnb do período)
- ✅ Interface responsiva e intuitiva
- ✅ Cálculo de ocupação e diária média corrigido (soma noites do CSV)
- ✅ Categorias específicas: Airbnb, Booking, Recorrente, Outros
- ✅ Formulário de receitas com datas de acomodação funcionando
- ✅ **Editor Universal de Transações** implementado
- ✅ **Sistema de notificações permanentes** com botão OK obrigatório

## 🔄 Última Atualização (03/09/2025)

### Melhorias Recentes:
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

### Funcionalidades Anteriores:
- **Editor Universal de Transações** (`EditTransactionDialog`)
  - Formulário unificado para editar qualquer transação no sistema
  - Clique em valores de despesas/receitas abre formulário completo
  - Todos os campos editáveis: propriedade, valor, data, categoria, descrição, fornecedor, CPF/CNPJ
  - Botão "Eliminar entrada" para excluir registros
  - Funciona em todas as páginas: Despesas, Manutenção, Receitas
  - Salvamento sem duplicação de dados