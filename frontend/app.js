// API Base URL
const API_BASE = 'http://localhost:3001/api';

// Global state
let currentUser = null;
let properties = [];
let transactions = [];
let suppliers = [];
let currentSection = 'fluxo-caixa';
let saldoAtual = 50000; // Valor inicial simulado

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateShort(date) {
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
    });
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    alert('Erro: ' + message);
}

function showSuccess(message) {
    alert('Sucesso: ' + message);
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentSection = sectionName;
        
        // Load section-specific data
        switch(sectionName) {
            case 'fluxo-caixa':
                loadFluxoCaixa();
                break;
            case 'imoveis':
                loadImoveis();
                break;
            case 'despesas':
                loadDespesas();
                break;
            case 'receitas':
                loadReceitas();
                break;
            case 'configuracoes':
                loadConfiguracoes();
                break;
        }
    }
    
    // Update menu button states
    updateMenuButtons(sectionName);
}

function updateMenuButtons(activeSection) {
    const buttons = document.querySelectorAll('.menu-button');
    buttons.forEach(button => {
        button.classList.remove('ring-2', 'ring-white', 'ring-opacity-60');
        if (button.onclick && button.onclick.toString().includes(activeSection)) {
            button.classList.add('ring-2', 'ring-white', 'ring-opacity-60');
        }
    });
}

// API functions
async function apiCall(endpoint, options = {}) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erro na requisição');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        // For demo purposes, return mock data
        return getMockData(endpoint);
    } finally {
        hideLoading();
    }
}

// Mock data for demonstration
function getMockData(endpoint) {
    const mockProperties = [
        {
            id: 1,
            nickname: 'Málaga M07',
            address: 'Rua Málaga, 07',
            valorAquisicao: 850000,
            valorAtualizado: 920000,
            resultadoMes: 4500,
            resultadoPercentual: 0.49
        },
        {
            id: 2,
            nickname: 'Sevilha 307',
            address: 'Rua Sevilha, 307',
            valorAquisicao: 750000,
            valorAtualizado: 810000,
            resultadoMes: 3800,
            resultadoPercentual: 0.47
        },
        {
            id: 3,
            nickname: 'Casa Ibirapuera',
            address: 'Torre 3, Ap 1411',
            valorAquisicao: 1200000,
            valorAtualizado: 1300000,
            resultadoMes: 5200,
            resultadoPercentual: 0.40
        }
    ];
    
    const mockTransactions = [
        { id: 1, propertyId: 1, type: 'receita', category: 'airbnb-actual', amount: 2500, date: '2025-07-15' },
        { id: 2, propertyId: 1, type: 'despesa', category: 'condominio', amount: -800, date: '2025-07-10' },
        { id: 3, propertyId: 2, type: 'receita', category: 'airbnb-pending', amount: 2200, date: '2025-07-20' },
        { id: 4, propertyId: 2, type: 'despesa', category: 'limpeza', amount: -150, date: '2025-07-12' }
    ];
    
    if (endpoint.includes('/properties')) {
        return mockProperties;
    }
    if (endpoint.includes('/transactions')) {
        return mockTransactions;
    }
    
    return [];
}

// Fluxo de Caixa functions
async function loadFluxoCaixa() {
    try {
        // Load properties for filter
        const properties = await apiCall('/properties');
        const filterSelect = document.getElementById('filter-imoveis-fluxo');
        filterSelect.innerHTML = '<option value="all" selected>Todos os Imóveis</option>';
        properties.forEach(property => {
            filterSelect.innerHTML += `<option value="${property.id}">${property.nickname || property.address}</option>`;
        });
        
        // Update current balance
        updateSaldoAtual();
        
        // Load cash flow data
        await aplicarFiltrosFluxoCaixa();
        
    } catch (error) {
        console.error('Erro ao carregar fluxo de caixa:', error);
        showError('Erro ao carregar dados do fluxo de caixa');
    }
}

function updateSaldoAtual() {
    document.getElementById('saldo-atual').textContent = formatCurrency(saldoAtual);
    document.getElementById('data-atualizacao').textContent = new Date().toLocaleString('pt-BR');
}

async function aplicarFiltrosFluxoCaixa() {
    try {
        const diasTras = parseInt(document.getElementById('dias-tras').value) || 7;
        const diasFrente = parseInt(document.getElementById('dias-frente').value) || 30;
        
        // Generate date range
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - diasTras);
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + diasFrente);
        
        // Generate cash flow data
        const cashFlowData = generateCashFlowData(startDate, endDate);
        
        // Update table
        updateFluxoCaixaTable(cashFlowData);
        
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        showError('Erro ao aplicar filtros');
    }
}

function generateCashFlowData(startDate, endDate) {
    const data = [];
    let currentBalance = saldoAtual;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isToday = currentDate.toDateString() === new Date().toDateString();
        
        // Mock transactions for this date
        const receitas = Math.random() > 0.7 ? Math.floor(Math.random() * 3000) + 1000 : 0;
        const despesas = Math.random() > 0.8 ? Math.floor(Math.random() * 800) + 200 : 0;
        
        const saldoInicial = currentBalance;
        const saldoFinal = currentBalance + receitas - despesas;
        currentBalance = saldoFinal;
        
        data.push({
            date: new Date(currentDate),
            saldoInicial,
            receitas,
            despesas,
            saldoFinal,
            isToday
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
}

function updateFluxoCaixaTable(data) {
    const tbody = document.getElementById('fluxo-caixa-body');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        if (row.isToday) {
            tr.classList.add('today-highlight');
        }
        
        tr.innerHTML = `
            <td class="text-left font-medium">
                ${formatDateShort(row.date)}
                ${row.isToday ? '<span class="ml-2 text-xs">(HOJE)</span>' : ''}
            </td>
            <td class="${getValueClass(row.saldoInicial)}">${formatCurrency(row.saldoInicial)}</td>
            <td class="${row.receitas > 0 ? 'positive-value' : 'neutral-value'}">${formatCurrency(row.receitas)}</td>
            <td class="${row.despesas > 0 ? 'negative-value' : 'neutral-value'}">${formatCurrency(row.despesas)}</td>
            <td class="${getValueClass(row.saldoFinal)} font-bold">${formatCurrency(row.saldoFinal)}</td>
            <td>
                <button onclick="verDetalhes('${row.date.toISOString().split('T')[0]}')" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function getValueClass(value) {
    if (value > 0) return 'positive-value';
    if (value < 0) return 'negative-value';
    return 'neutral-value';
}

function resetarFiltros() {
    document.getElementById('dias-tras').value = 7;
    document.getElementById('dias-frente').value = 30;
    document.getElementById('filter-imoveis-fluxo').selectedIndex = 0;
    
    // Reset tipos filter
    const tiposSelect = document.getElementById('filter-tipos');
    for (let option of tiposSelect.options) {
        option.selected = true;
    }
    
    aplicarFiltrosFluxoCaixa();
}

function verDetalhes(date) {
    alert(`Detalhes para ${formatDate(date)}:\n\nEsta funcionalidade será implementada para mostrar:\n- Receitas detalhadas\n- Despesas detalhadas\n- Transações por imóvel`);
}

// Imóveis functions
async function loadImoveis() {
    try {
        const properties = await apiCall('/properties');
        updateImoveisList(properties);
    } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        showError('Erro ao carregar lista de imóveis');
    }
}

function updateImoveisList(properties) {
    const container = document.getElementById('lista-imoveis');
    container.innerHTML = '';
    
    properties.forEach(property => {
        const div = document.createElement('div');
        div.className = 'bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer';
        div.onclick = () => verDetalhesImovel(property.id);
        
        const resultadoClass = property.resultadoMes >= 0 ? 'text-green-600' : 'text-red-600';
        const percentualClass = property.resultadoPercentual >= 0.5 ? 'text-green-600' : property.resultadoPercentual >= 0.3 ? 'text-yellow-600' : 'text-red-600';
        
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${property.nickname || property.address}</h3>
                    <p class="text-gray-600 mb-4">${property.address}</p>
                </div>
                <div class="text-right space-y-2">
                    <div>
                        <span class="text-sm text-gray-500">Resultado do Mês:</span>
                        <div class="text-lg font-bold ${resultadoClass}">${formatCurrency(property.resultadoMes)}</div>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">ROI:</span>
                        <div class="text-lg font-bold ${percentualClass}">${(property.resultadoPercentual).toFixed(2)}%</div>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">Valor Atualizado:</span>
                        <div class="text-lg font-bold text-blue-600">${formatCurrency(property.valorAtualizado)}</div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

function verDetalhesImovel(propertyId) {
    alert(`Detalhes do imóvel ${propertyId}:\n\nEsta funcionalidade abrirá uma página detalhada com:\n- Histórico de receitas\n- Histórico de despesas\n- Análise de performance\n- Documentos`);
}

function novaPropriedade() {
    alert('Funcionalidade de Nova Propriedade:\n\nAbrirá um formulário para cadastrar:\n- Dados básicos do imóvel\n- Valor de aquisição\n- Documentos\n- Configurações de receita');
}

// Despesas functions
async function loadDespesas() {
    try {
        const properties = await apiCall('/properties');
        const transactions = await apiCall('/transactions');
        updateDespesasTable(properties, transactions);
    } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        showError('Erro ao carregar dados de despesas');
    }
}

function updateDespesasTable(properties, transactions) {
    const header = document.getElementById('despesas-header');
    const tbody = document.getElementById('despesas-table');
    
    // Categories
    const categories = ['Condomínio', 'Impostos', 'Limpezas', 'Gestão', 'Manutenção', 'Outras', 'Total'];
    
    // Update header
    header.innerHTML = '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imóvel</th>';
    categories.forEach(cat => {
        header.innerHTML += `<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">${cat}</th>`;
    });
    
    // Update body
    tbody.innerHTML = '';
    
    properties.forEach(property => {
        const tr = document.createElement('tr');
        let totalProperty = 0;
        
        let rowHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${property.nickname}</td>`;
        
        categories.slice(0, -1).forEach(category => {
            const amount = Math.floor(Math.random() * 500) + 100; // Mock data
            totalProperty += amount;
            rowHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600">${formatCurrency(amount)}</td>`;
        });
        
        rowHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-red-700">${formatCurrency(totalProperty)}</td>`;
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
    
    // Add totals row
    const totalRow = document.createElement('tr');
    totalRow.className = 'bg-gray-50 font-bold';
    let totalHTML = '<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL</td>';
    
    let grandTotal = 0;
    categories.slice(0, -1).forEach(category => {
        const categoryTotal = properties.length * (Math.floor(Math.random() * 500) + 100);
        grandTotal += categoryTotal;
        totalHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-red-700">${formatCurrency(categoryTotal)}</td>`;
    });
    
    totalHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-red-800">${formatCurrency(grandTotal)}</td>`;
    
    totalRow.innerHTML = totalHTML;
    tbody.appendChild(totalRow);
}

function inserirDespesa() {
    const tipo = document.getElementById('tipo-despesa').value;
    if (!tipo) {
        alert('Por favor, selecione o tipo de despesa');
        return;
    }
    
    alert(`Inserir despesa do tipo: ${tipo}\n\nEsta funcionalidade abrirá o formulário específico para:\n- ${tipo}`);
}

// Receitas functions
async function loadReceitas() {
    try {
        const properties = await apiCall('/properties');
        const transactions = await apiCall('/transactions');
        updateReceitasTable(properties, transactions);
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        showError('Erro ao carregar dados de receitas');
    }
}

function updateReceitasTable(properties, transactions) {
    const header = document.getElementById('receitas-header');
    const tbody = document.getElementById('receitas-table');
    
    // Categories
    const categories = ['Airbnb Actual', 'Airbnb Pending', 'Mensal', 'Outras', 'Total'];
    
    // Update header
    header.innerHTML = '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imóvel</th>';
    categories.forEach(cat => {
        header.innerHTML += `<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">${cat}</th>`;
    });
    
    // Update body
    tbody.innerHTML = '';
    
    properties.forEach(property => {
        const tr = document.createElement('tr');
        let totalProperty = 0;
        
        let rowHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${property.nickname}</td>`;
        
        categories.slice(0, -1).forEach(category => {
            const amount = Math.floor(Math.random() * 3000) + 1000; // Mock data
            totalProperty += amount;
            rowHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600">${formatCurrency(amount)}</td>`;
        });
        
        rowHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-green-700">${formatCurrency(totalProperty)}</td>`;
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
    
    // Add totals row
    const totalRow = document.createElement('tr');
    totalRow.className = 'bg-gray-50 font-bold';
    let totalHTML = '<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL</td>';
    
    let grandTotal = 0;
    categories.slice(0, -1).forEach(category => {
        const categoryTotal = properties.length * (Math.floor(Math.random() * 3000) + 1000);
        grandTotal += categoryTotal;
        totalHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-green-700">${formatCurrency(categoryTotal)}</td>`;
    });
    
    totalHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-green-800">${formatCurrency(grandTotal)}</td>`;
    
    totalRow.innerHTML = totalHTML;
    tbody.appendChild(totalRow);
}

function uploadCSVAirbnb(type) {
    alert(`Upload CSV Airbnb ${type}:\n\nEsta funcionalidade permitirá:\n- Selecionar arquivo CSV\n- Mapear colunas\n- Importar dados automaticamente\n- Validar informações`);
}

function configurarAPIAirbnb() {
    alert('Configurar API Airbnb:\n\nEsta funcionalidade permitirá:\n- Configurar credenciais da API\n- Definir frequência de sincronização\n- Mapear propriedades\n- Testar conexão');
}

// Configurações functions
function loadConfiguracoes() {
    // Configuration section is mostly static, no dynamic loading needed
    console.log('Configurações carregadas');
}

function gerenciarContasBancarias() {
    alert('Gerenciar Contas Bancárias:\n\nEsta funcionalidade permitirá:\n- Cadastrar contas por imóvel\n- Cadastrar contas por empresa\n- Definir conta principal\n- Configurar saldos iniciais');
}

function configurarContaEconomia() {
    alert('Configurar Conta de Economia:\n\nEsta funcionalidade permitirá:\n- Definir conta poupança\n- Configurar rendimentos\n- Histórico de aplicações\n- Metas de economia');
}

function gerenciarAcessos() {
    alert('Gerenciar Acessos:\n\nEsta funcionalidade permitirá:\n- Criar perfis de usuário\n- Definir permissões por área\n- Administrador, Financeiro, etc.\n- Logs de acesso');
}

function configuracaoGeral() {
    alert('Configuração Geral:\n\nEsta funcionalidade permitirá:\n- Configurações do sistema\n- Preferências de exibição\n- Configurações de notificação\n- Backup e restauração');
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Gestão de Imóveis iniciado');
    
    // Load initial section (Fluxo de Caixa)
    showSection('fluxo-caixa');
    
    // Set up event listeners for filters
    document.getElementById('dias-tras').addEventListener('change', aplicarFiltrosFluxoCaixa);
    document.getElementById('dias-frente').addEventListener('change', aplicarFiltrosFluxoCaixa);
});

// Legacy functions for compatibility
function loadDashboard() {
    // Redirect to new cash flow section
    showSection('fluxo-caixa');
}

function loadReceitas() {
    showSection('receitas');
}

function aplicarFiltrosReceitas() {
    // Legacy function - now handled by loadReceitas
    loadReceitas();
}