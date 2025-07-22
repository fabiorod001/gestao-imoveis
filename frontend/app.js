// API Base URL
const API_BASE = 'http://localhost:3001/api';

// Global state
let currentUser = null;
let properties = [];
let transactions = [];
let suppliers = [];

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
        showError(error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const overview = await apiCall('/dashboard/overview');
        const cashFlow = await apiCall('/dashboard/cash-flow');
        const propertyPerformance = await apiCall('/dashboard/property-performance');
        
        // Update stats cards
        document.getElementById('total-properties').textContent = overview.totalProperties || 0;
        document.getElementById('monthly-income').textContent = formatCurrency(overview.monthlyIncome || 0);
        document.getElementById('monthly-expenses').textContent = formatCurrency(overview.monthlyExpenses || 0);
        document.getElementById('average-roi').textContent = (overview.averageROI || 0).toFixed(2) + '%';
        
        // Update charts
        updateCashFlowChart(cashFlow);
        updatePropertyChart(propertyPerformance);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function updateCashFlowChart(data) {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.month),
            datasets: [{
                label: 'Receita',
                data: data.map(item => item.income),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.1
            }, {
                label: 'Despesas',
                data: data.map(item => item.expenses),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updatePropertyChart(data) {
    const ctx = document.getElementById('propertyChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.propertyName),
            datasets: [{
                label: 'ROI (%)',
                data: data.map(item => item.roi),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Legacy functions - kept for compatibility but not used in new interface
// These can be removed in future versions

// Load Receitas
async function loadReceitas() {
    try {
        showLoading();
        
        // Set current month as default
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7);
        document.getElementById('filter-mes-inicial').value = currentMonth;
        document.getElementById('filter-mes-final').value = currentMonth;
        
        // Load properties for filter
        const properties = await apiCall('/api/properties');
        const filterSelect = document.getElementById('filter-imoveis');
        filterSelect.innerHTML = '<option value="all">Todos os Imóveis</option>';
        properties.forEach(property => {
            filterSelect.innerHTML += `<option value="${property.id}">${property.nickname || property.address}</option>`;
        });
        
        // Load initial data
        await aplicarFiltrosReceitas();
        
        hideLoading();

    } catch (error) {
        console.error('Error loading receitas:', error);
        showError('Erro ao carregar receitas');
    }
}

// Apply filters for Receitas
async function aplicarFiltrosReceitas() {
    try {
        showLoading();
        
        const mesInicial = document.getElementById('filter-mes-inicial').value;
        const mesFinal = document.getElementById('filter-mes-final').value;
        const imoveisSelecionados = Array.from(document.getElementById('filter-imoveis').selectedOptions)
            .map(option => option.value)
            .filter(value => value !== 'all');
        
        // Get transactions data
        const transactions = await apiCall('/api/transactions');
        const properties = await apiCall('/api/properties');
        
        // Process revenue data
        const receitasData = processReceitasData(transactions, properties, mesInicial, mesFinal, imoveisSelecionados);
        
        // Render table
        renderReceitasTable(receitasData);
        
        hideLoading();
    } catch (error) {
        console.error('Error applying receitas filters:', error);
        showError('Erro ao aplicar filtros');
    }
}

// Process receitas data
function processReceitasData(transactions, properties, mesInicial, mesFinal, imoveisSelecionados) {
    const receitasMap = new Map();
    
    properties.forEach(property => {
        if (imoveisSelecionados.length === 0 || imoveisSelecionados.includes(property.id.toString())) {
            receitasMap.set(property.id, {
                imovel: property.nickname || property.address,
                actual: 0,
                pending: 0,
                total: 0
            });
        }
    });
    
    // Filter and process transactions
    transactions
        .filter(t => t.type === 'income')
        .filter(t => {
            const transactionDate = new Date(t.date);
            const transactionMonth = transactionDate.toISOString().slice(0, 7);
            return transactionMonth >= mesInicial && transactionMonth <= mesFinal;
        })
        .forEach(transaction => {
            if (receitasMap.has(transaction.property_id)) {
                const receita = receitasMap.get(transaction.property_id);
                if (transaction.status === 'completed') {
                    receita.actual += transaction.amount;
                } else {
                    receita.pending += transaction.amount;
                }
                receita.total = receita.actual + receita.pending;
            }
        });
    
    return Array.from(receitasMap.values());
}

// Render receitas table
function renderReceitasTable(receitasData) {
    const tableBody = document.getElementById('receitas-table');
    
    if (receitasData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhuma receita encontrada</td></tr>';
        return;
    }
    
    tableBody.innerHTML = receitasData.map(receita => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${receita.imovel}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">${formatCurrency(receita.actual)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">${formatCurrency(receita.pending)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCurrency(receita.total)}</td>
        </tr>
    `).join('');
}

// Load Despesas
async function loadDespesas() {
    try {
        showLoading();
        
        const transactions = await apiCall('/api/transactions');
        const despesasData = processDespesasData(transactions);
        
        renderDespesasTable(despesasData);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading despesas:', error);
        showError('Erro ao carregar despesas');
    }
}

// Process despesas data
function processDespesasData(transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const despesasMap = new Map();
    
    transactions
        .filter(t => t.type === 'expense')
        .filter(t => {
            const transactionDate = new Date(t.date);
            const transactionMonth = transactionDate.toISOString().slice(0, 7);
            return transactionMonth === currentMonth;
        })
        .forEach(transaction => {
            const categoria = transaction.category || 'Outros';
            if (!despesasMap.has(categoria)) {
                despesasMap.set(categoria, 0);
            }
            despesasMap.set(categoria, despesasMap.get(categoria) + transaction.amount);
        });
    
    return Array.from(despesasMap.entries()).map(([categoria, valor]) => ({
        categoria,
        valor,
        total: valor
    }));
}

// Render despesas table
function renderDespesasTable(despesasData) {
    const tableBody = document.getElementById('despesas-table');
    
    if (despesasData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">Nenhuma despesa encontrada</td></tr>';
        return;
    }
    
    // Mapear categorias para identificadores
    const categoriaMap = {
        'Condomínio': 'condominio',
        'Impostos': 'impostos',
        'Limpeza': 'limpezas',
        'Gestão': 'gestao-mauricio',
        'Manutenção': 'manutencoes',
        'Outros': 'outras'
    };
    
    tableBody.innerHTML = despesasData.map(despesa => {
        const categoriaId = categoriaMap[despesa.categoria] || 'outras';
        return `
            <tr class="cursor-pointer hover:bg-gray-50 transition-colors" data-categoria="${categoriaId}" onclick="abrirPaginaDespesa('${categoriaId}')">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${despesa.categoria}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">${formatCurrency(despesa.valor)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCurrency(despesa.total)}</td>
            </tr>
        `;
    }).join('');
    
    // Tornar as linhas clicáveis
    tornarDespesasClicaveis();
}

// Load Imóveis
async function loadImoveis() {
    try {
        showLoading();
        
        const propertiesResponse = await apiCall('/properties');
        const transactionsResponse = await apiCall('/transactions');
        
        const properties = propertiesResponse.data || propertiesResponse;
        const transactions = transactionsResponse.data || transactionsResponse;
        
        console.log('Properties loaded:', properties);
        console.log('Transactions loaded:', transactions);
        
        const imoveisData = processImoveisData(properties, transactions);
        renderImoveisList(imoveisData);

        // Add event listener for the Sevilha 307 button
        const sevilhaBtn = document.getElementById('sevilha-btn');
        if (sevilhaBtn) {
            // Remove any existing listeners to avoid duplicates
            const newSevilhaBtn = sevilhaBtn.cloneNode(true);
            sevilhaBtn.parentNode.replaceChild(newSevilhaBtn, sevilhaBtn);

            newSevilhaBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop event from bubbling up
                console.log('Sevilha 307 button clicked, redirecting...');
                window.location.href = 'sevilha-307.html';
            });
        }

        const malagaBtn = document.getElementById('malaga-btn');
        if (malagaBtn) {
            const newMalagaBtn = malagaBtn.cloneNode(true);
            malagaBtn.parentNode.replaceChild(newMalagaBtn, malagaBtn);
            newMalagaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Málaga M07 button clicked, redirecting...');
                window.location.href = 'malaga-m07.html';
            });
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading imoveis:', error);
        showError('Erro ao carregar imóveis');
        hideLoading();
    }
}

// Process imoveis data with financial results
function processImoveisData(properties, transactions) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    return properties.map(property => {
        // Calculate current month revenues
        const receitas = transactions
            .filter(t => t.propertyId === property.id && t.type === 'income')
            .filter(t => {
                const transactionDate = new Date(t.date);
                const transactionMonth = transactionDate.toISOString().slice(0, 7);
                return transactionMonth === currentMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate current month expenses
        const despesas = transactions
            .filter(t => t.propertyId === property.id && t.type === 'expense')
            .filter(t => {
                const transactionDate = new Date(t.date);
                const transactionMonth = transactionDate.toISOString().slice(0, 7);
                return transactionMonth === currentMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        const resultadoMes = receitas - despesas;
        const valorImovel = property.value || property.purchasePrice || 1;
        const resultadoPercentual = (resultadoMes / valorImovel) * 100;
        
        return {
            ...property,
            receitas,
            despesas,
            resultadoMes,
            resultadoPercentual
        };
    });
}

// Render imoveis list
function renderImoveisList(imoveisData) {
    const container = document.getElementById('imoveis-list');
    
    if (imoveisData.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-2">Nenhum imóvel cadastrado</div>';
        return;
    }
    
    container.innerHTML = imoveisData.map(imovel => `
        <div class="bg-white border border-gray-200 rounded p-2 hover:shadow-md transition-shadow cursor-pointer" data-id="${imovel.id}">
            <div class="flex justify-between items-center" onclick="openImovelDetails(${imovel.id})">
                <div class="flex items-center">
                    <div class="mr-2 cursor-grab active:cursor-grabbing" onclick="event.stopPropagation()">
                         <i class="fas fa-grip-vertical text-gray-400 text-xs"></i>
                     </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-xs font-medium text-gray-900">${imovel.nickname || 'Imóvel sem nome'}</h4>
                            <p class="text-xs text-gray-600 hidden sm:block ml-2 text-right">${imovel.address}</p>
                        </div>
                        
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-4">
                                <div>
                                    <span class="text-xs text-gray-500">Resultado:</span>
                                    <span class="text-xs font-medium ml-1 ${imovel.resultadoMes >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        ${formatCurrency(imovel.resultadoMes)}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-500">%:</span>
                                    <span class="text-xs font-medium ml-1 ${imovel.resultadoPercentual >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        ${imovel.resultadoPercentual.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="ml-2">
                    <i class="fas fa-chevron-right text-gray-400 text-xs"></i>
                </div>
            </div>
        </div>
    `).join('');
    
    // Initialize sortable functionality
    initSortableImoveis();
}

// Função para inicializar drag and drop dos imóveis
function initSortableImoveis() {
    const container = document.getElementById('imoveis-list');
    if (!container) return;
    
    new Sortable(container, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        handle: '.fa-grip-vertical',
        onEnd: function(evt) {
            // Salvar nova ordem dos imóveis
            saveImoveisOrder();
        }
    });
}

// Função para salvar a nova ordem dos imóveis
function saveImoveisOrder() {
    const container = document.getElementById('imoveis-list');
    const items = container.querySelectorAll('[data-id]');
    const newOrder = Array.from(items).map((item, index) => ({
        id: parseInt(item.dataset.id),
        order: index
    }));
    
    // Atualizar ordem no localStorage
    const imoveisData = JSON.parse(localStorage.getItem('imoveisData') || '[]');
    
    // Reordenar array baseado na nova ordem
    const reorderedImoveis = newOrder.map(orderItem => 
        imoveisData.find(imovel => imovel.id === orderItem.id)
    ).filter(Boolean);
    
    // Salvar nova ordem
    localStorage.setItem('imoveisData', JSON.stringify(reorderedImoveis));
    
    // Atualizar dados globais
    window.imoveisData = reorderedImoveis;
}

// Load Configurações
function loadConfiguracoes() {
    // Configurações tab is mostly static, no dynamic loading needed
    console.log('Configurações loaded');
}

// Modal functions
function openDespesaModal() {
    console.log('Open despesa modal');
}

function openDespesaCompostaModal() {
    console.log('Open despesa composta modal');
}

// Função para abrir página dedicada de despesa
function abrirPaginaDespesa(categoria) {
    // Por enquanto, vamos mostrar um alert com a categoria
    // Futuramente, isso pode ser substituído por navegação real
    alert(`Abrindo página dedicada para: ${categoria.replace('-', ' ').toUpperCase()}`);
    
    // Aqui você pode implementar a navegação real:
    // window.location.href = `despesa-${categoria}.html`;
    // ou usar um sistema de roteamento SPA
    console.log(`Navegando para página de despesa: ${categoria}`);
}

// Função para tornar linhas da tabela de despesas clicáveis
function tornarDespesasClicaveis() {
    const despesasTable = document.getElementById('despesas-table');
    if (despesasTable) {
        // Adicionar event listener para cliques nas linhas
        despesasTable.addEventListener('click', function(event) {
            const row = event.target.closest('tr');
            if (row && row.dataset.categoria) {
                const categoria = row.dataset.categoria;
                abrirPaginaDespesa(categoria);
            }
        });
    }
}

function openNovaPropriedadeModal() {
    console.log('Open nova propriedade modal');
    // Redirecionar para a página de cadastro de propriedades
    window.open('property-form.html', '_blank');
}

function openUsuariosModal() {
    console.log('Open usuarios modal');
}

function openContaCorrenteModal() {
    console.log('Open conta corrente modal');
}

function openConfigGeralModal() {
    console.log('Open config geral modal');
}

function openImovelDetails(imovelId) {
    console.log('Open imovel details for ID:', imovelId);
    
    // Mapear IDs específicos para suas páginas correspondentes
    let url;
    switch(imovelId) {
        case 1:
            url = 'sevilha-307.html';
            break;
        case 2:
            url = 'malaga-m07.html';
            break;
        case 3:
            url = 'valencia-v15.html';
            break;
        case 4:
            url = 'barcelona-b22.html';
            break;
        case 5:
            url = 'madrid-m33.html';
            break;
        default:
            // Para outros imóveis, usar a página genérica
            url = `property-details.html?id=${imovelId}`;
            break;
    }
    
    console.log('Redirecting to:', url);
    window.location.href = url;
}

// Search function for imoveis
function searchImoveis() {
    const searchTerm = document.getElementById('search-imoveis').value.toLowerCase();
    const imovelCards = document.querySelectorAll('#imoveis-list > div');
    
    imovelCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function editProperty(id) {
    alert(`Editar propriedade ${id}`);
}

function deleteProperty(id) {
    if (confirm('Tem certeza que deseja excluir esta propriedade?')) {
        alert(`Excluir propriedade ${id}`);
    }
}

function editTransaction(id) {
    alert(`Editar transação ${id}`);
}

function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        alert(`Excluir transação ${id}`);
    }
}

function editSupplier(id) {
    alert(`Editar fornecedor ${id}`);
}

function deleteSupplier(id) {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
        alert(`Excluir fornecedor ${id}`);
    }
}

// Tab navigation
function initTabs() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('border-blue-500', 'text-blue-600'));
            tabButtons.forEach(btn => btn.classList.add('border-transparent', 'text-gray-500'));
            
            // Add active class to clicked button
            button.classList.remove('border-transparent', 'text-gray-500');
            button.classList.add('border-blue-500', 'text-blue-600');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Show target tab content
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                
                // Load data based on active tab
                switch(targetTab) {
                    case 'dashboard':
                        loadDashboard();
                        break;
                    case 'receitas':
                        loadReceitas();
                        break;
                    case 'despesas':
                        loadDespesas();
                        break;
                    case 'imoveis':
                        loadImoveis();
                        break;
                    case 'configuracoes':
                        loadConfiguracoes();
                        break;
                }
            }
        });
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadDashboard(); // Load dashboard by default
    
    // Add search event listener
    const searchInput = document.getElementById('search-imoveis');
    if (searchInput) {
        searchInput.addEventListener('input', searchImoveis);
    }
});