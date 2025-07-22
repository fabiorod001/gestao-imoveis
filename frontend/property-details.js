// Global variables
let currentProperty = null;
let allTransactions = [];
let filteredTransactions = [];
let currentSort = { field: 'date', direction: 'desc' };
let revenueExpenseChart = null;
let categoryChart = null;

// API Base URL
const API_BASE_URL = 'http://localhost:3001';

// Get property ID from URL
function getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// API call helper
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// Show loading
function showLoading() {
    document.getElementById('loading').classList.add('show');
    document.getElementById('main-content').style.display = 'none';
}

// Hide loading
function hideLoading() {
    document.getElementById('loading').classList.remove('show');
    document.getElementById('main-content').style.display = 'block';
}

// Load property data
async function loadPropertyData() {
    const propertyId = getPropertyIdFromUrl();
    
    if (!propertyId) {
        alert('ID do imóvel não encontrado!');
        window.history.back();
        return;
    }
    
    try {
        showLoading();
        
        // For now, use mock data since API might not be available
        await loadMockData(propertyId);
        
        // Update UI
        updatePropertyInfo();
        populateFilters();
        applyFilters();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading property data:', error);
        // Try to load mock data as fallback
        await loadMockData(propertyId);
        updatePropertyInfo();
        populateFilters();
        applyFilters();
        hideLoading();
    }
}

// Load mock data for demonstration
async function loadMockData(propertyId) {
    // Check if it's Sevilha 307
    if (propertyId === 'sevilha307') {
        currentProperty = {
            id: 'sevilha307',
            name: 'Sevilha 307',
            nickname: 'Sevilha 307',
            address: 'Rua Sevilha, 307 - Vila Madalena, São Paulo',
            status: 'rented',
            rentalType: 'Residencial',
            purchasePrice: 850000,
            monthlyRent: 2500
        };
    } else {
        // Mock property data for other properties
        currentProperty = {
            id: propertyId,
            name: `Imóvel ${propertyId}`,
            nickname: `Apartamento ${propertyId}`,
            address: 'Rua das Flores, 123 - Centro',
            status: 'active',
            rentalType: 'Residencial',
            purchasePrice: 350000,
            monthlyRent: 2500
        };
    }
    
    // Mock transactions data with current month focus
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    if (propertyId === 'sevilha307') {
        allTransactions = [
            // Current month revenues for Sevilha 307
            {
                id: 1,
                date: new Date(currentYear, currentMonth, 5).toISOString().split('T')[0],
                type: 'revenue',
                category: 'rent',
                description: 'Aluguel - Mês Atual',
                amount: 4200,
                status: 'paid'
            },
            {
                id: 2,
                date: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0],
                type: 'revenue',
                category: 'rent',
                description: 'Taxa de Administração',
                amount: 250,
                status: 'pending'
            },
            // Current month expenses for Sevilha 307
            {
                id: 3,
                date: new Date(currentYear, currentMonth, 10).toISOString().split('T')[0],
                type: 'expense',
                category: 'condo_fee',
                description: 'Condomínio',
                amount: 850,
                status: 'paid'
            },
            {
                id: 4,
                date: new Date(currentYear, currentMonth, 12).toISOString().split('T')[0],
                type: 'expense',
                category: 'iptu',
                description: 'IPTU',
                amount: 500,
                status: 'paid'
            },
            {
                id: 5,
                date: new Date(currentYear, currentMonth, 8).toISOString().split('T')[0],
                type: 'expense',
                category: 'management',
                description: 'Taxa de Gestão',
                amount: 420,
                status: 'paid'
            },
            {
                id: 6,
                date: new Date(currentYear, currentMonth, 20).toISOString().split('T')[0],
                type: 'expense',
                category: 'maintenance',
                description: 'Manutenção Elétrica',
                amount: 380,
                status: 'pending'
            },
            // Previous month data for comparison
            {
                id: 7,
                date: new Date(currentYear, currentMonth - 1, 5).toISOString().split('T')[0],
                type: 'revenue',
                category: 'rent',
                description: 'Aluguel - Mês Anterior',
                amount: 4200,
                status: 'paid'
            },
            {
                id: 8,
                date: new Date(currentYear, currentMonth - 1, 10).toISOString().split('T')[0],
                type: 'expense',
                category: 'condo_fee',
                description: 'Condomínio',
                amount: 850,
                status: 'paid'
            }
        ];
    } else {
        allTransactions = [
            // Current month revenues
            {
                id: 1,
                date: new Date(currentYear, currentMonth, 5).toISOString().split('T')[0],
                type: 'revenue',
                category: 'rent',
                description: 'Aluguel - Mês Atual',
                amount: 2500,
                status: 'paid'
            },
            {
                id: 2,
                date: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0],
                type: 'revenue',
                category: 'rent',
                description: 'Taxa de Administração',
                amount: 150,
                status: 'pending'
            },
            // Current month expenses
            {
                id: 3,
                date: new Date(currentYear, currentMonth, 10).toISOString().split('T')[0],
                type: 'expense',
                category: 'condo_fee',
                description: 'Condomínio',
                amount: 450,
                status: 'paid'
            },
            {
                id: 4,
                date: new Date(currentYear, currentMonth, 12).toISOString().split('T')[0],
                type: 'expense',
                category: 'iptu',
                description: 'IPTU',
                amount: 180,
                status: 'paid'
            },
            {
                id: 5,
                date: new Date(currentYear, currentMonth, 8).toISOString().split('T')[0],
                type: 'expense',
                category: 'management',
                description: 'Taxa de Gestão',
                amount: 250,
                status: 'paid'
            },
            {
                id: 6,
                date: new Date(currentYear, currentMonth, 20).toISOString().split('T')[0],
                type: 'expense',
                category: 'maintenance',
                description: 'Manutenção Elétrica',
                amount: 320,
                status: 'pending'
            },
            // Previous month data for comparison
            {
                id: 7,
                date: new Date(currentYear, currentMonth - 1, 5).toISOString().split('T')[0],
                type: 'revenue',
                category: 'rent',
                description: 'Aluguel - Mês Anterior',
                amount: 2500,
                status: 'paid'
            },
            {
                id: 8,
                date: new Date(currentYear, currentMonth - 1, 10).toISOString().split('T')[0],
                type: 'expense',
                category: 'condo_fee',
                description: 'Condomínio',
                amount: 450,
                status: 'paid'
            }
        ];
    }
}

// Update property info
function updatePropertyInfo() {
    if (!currentProperty) return;
    
    document.getElementById('property-title').textContent = `Detalhes - ${currentProperty.nickname || currentProperty.name}`;
    document.getElementById('property-name').textContent = currentProperty.nickname || currentProperty.name;
    document.getElementById('property-address').textContent = currentProperty.address || 'Endereço não informado';
    document.getElementById('property-rental-type').textContent = currentProperty.rentalType || 'Não informado';
    document.getElementById('property-purchase-price').textContent = currentProperty.purchasePrice ? formatCurrency(currentProperty.purchasePrice) : 'Não informado';
    
    // Status badge
    const statusElement = document.getElementById('property-status');
    const status = currentProperty.status || 'inactive';
    statusElement.textContent = status === 'active' ? 'Ativo' : 'Inativo';
    statusElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`;
}

// Populate filters
function populateFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const categories = [...new Set(allTransactions.map(t => t.category))].filter(Boolean);
    
    // Clear existing options except "Todas"
    categoryFilter.innerHTML = '<option value="all">Todas</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = getCategoryLabel(category);
        categoryFilter.appendChild(option);
    });
}

// Get category label
function getCategoryLabel(category) {
    const labels = {
        'rent': 'Aluguel',
        'taxes': 'Impostos',
        'management': 'Gestão',
        'condo_fee': 'Condomínio',
        'electricity': 'Luz',
        'water': 'Água',
        'gas': 'Gás',
        'maintenance': 'Manutenção',
        'cleaning': 'Limpeza',
        'internet_tv': 'Internet/TV',
        'iptu': 'IPTU',
        'financing': 'Financiamento'
    };
    return labels[category] || category;
}

// Apply filters
function applyFilters() {
    const periodFilter = document.getElementById('period-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filtered = [...allTransactions];
    
    // Apply period filter
    const now = new Date();
    let startDate, endDate;
    
    switch (periodFilter) {
        case 'current-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'last-3-months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            endDate = now;
            break;
        case 'last-6-months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            endDate = now;
            break;
        case 'current-year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = now;
            break;
        case 'custom':
            const customStartDate = document.getElementById('start-date').value;
            const customEndDate = document.getElementById('end-date').value;
            if (customStartDate && customEndDate) {
                startDate = new Date(customStartDate);
                endDate = new Date(customEndDate);
            }
            break;
    }
    
    if (startDate && endDate) {
        filtered = filtered.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startDate && transactionDate <= endDate;
        });
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    filteredTransactions = filtered;
    
    // Update UI
    updateDashboard();
    updateCharts();
    updateTransactionsTable();
}

// Update dashboard
function updateDashboard() {
    const revenues = filteredTransactions.filter(t => t.type === 'revenue');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    // Separate paid and pending revenues
    const paidRevenues = revenues.filter(t => t.status === 'paid');
    const pendingRevenues = revenues.filter(t => t.status === 'pending');
    
    const totalPaidRevenue = paidRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPendingRevenue = pendingRevenues.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalRevenue = totalPaidRevenue + totalPendingRevenue;
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const netResult = totalPaidRevenue - totalExpenses; // Only count paid revenues for net result
    
    // Calculate return margin based on property purchase price
    let returnMargin = 0;
    if (currentProperty && currentProperty.purchasePrice && currentProperty.purchasePrice > 0) {
        returnMargin = (netResult / currentProperty.purchasePrice) * 100;
    }
    
    // Update revenue display to show paid + pending
    const revenueText = `${formatCurrency(totalPaidRevenue)} + ${formatCurrency(totalPendingRevenue)} pendente`;
    document.getElementById('total-revenue').innerHTML = `
        <div class="text-lg font-semibold text-green-600">${formatCurrency(totalPaidRevenue)}</div>
        <div class="text-sm text-gray-500">+ ${formatCurrency(totalPendingRevenue)} pendente</div>
    `;
    
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('total-transactions').textContent = filteredTransactions.length;
    
    const netResultElement = document.getElementById('net-result');
    netResultElement.innerHTML = `
        <div class="text-lg font-semibold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(netResult)}</div>
        <div class="text-sm text-gray-500">${returnMargin.toFixed(2)}% retorno</div>
    `;
}

// Update charts
function updateCharts() {
    updateRevenueExpenseChart();
    updateCategoryChart();
}

// Update revenue vs expense chart
function updateRevenueExpenseChart() {
    const ctx = document.getElementById('revenue-expense-chart').getContext('2d');
    
    if (revenueExpenseChart) {
        revenueExpenseChart.destroy();
    }
    
    const revenues = filteredTransactions.filter(t => t.type === 'revenue');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    const totalRevenue = revenues.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    revenueExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [totalRevenue, totalExpenses],
                backgroundColor: ['#10b981', '#ef4444'],
                borderColor: ['#059669', '#dc2626'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
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

// Update category chart
function updateCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const categoryData = {};
    filteredTransactions.forEach(t => {
        const category = getCategoryLabel(t.category);
        const amount = Math.abs(Number(t.amount));
        categoryData[category] = (categoryData[category] || 0) + amount;
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
                    '#ec4899', '#6b7280', '#14b8a6', '#f43f5e'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update transactions table
function updateTransactionsTable() {
    const tbody = document.getElementById('transactions-table-body');
    const noTransactions = document.getElementById('no-transactions');
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = '';
        noTransactions.style.display = 'block';
        return;
    }
    
    noTransactions.style.display = 'none';
    
    // Sort transactions
    const sorted = [...filteredTransactions].sort((a, b) => {
        let aValue = a[currentSort.field];
        let bValue = b[currentSort.field];
        
        if (currentSort.field === 'amount') {
            aValue = Number(aValue);
            bValue = Number(bValue);
        } else if (currentSort.field === 'date') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        
        if (currentSort.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
    
    tbody.innerHTML = sorted.map(transaction => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatDate(transaction.date)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${transaction.type === 'revenue' ? 'Receita' : 'Despesa'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${getCategoryLabel(transaction.category)}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
                ${transaction.description || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${
                transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
            }">
                ${formatCurrency(Math.abs(Number(transaction.amount)))}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button onclick="editTransaction(${transaction.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTransaction(${transaction.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Sort table
function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
    }
    
    updateTransactionsTable();
}

// Add transaction
function addTransaction(type) {
    const description = prompt(`Descrição da ${type === 'revenue' ? 'receita' : 'despesa'}:`);
    if (!description) return;
    
    const amount = prompt('Valor (apenas números):');
    if (!amount || isNaN(amount)) {
        alert('Valor inválido!');
        return;
    }
    
    const category = prompt('Categoria:');
    if (!category) return;
    
    const date = prompt('Data (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];
    
    const newTransaction = {
        propertyId: currentProperty.id,
        type: type,
        category: category,
        description: description,
        amount: type === 'expense' ? -Math.abs(Number(amount)) : Number(amount),
        date: date
    };
    
    // Add to local array (in a real app, this would be an API call)
    allTransactions.push({
        ...newTransaction,
        id: Date.now() // Temporary ID
    });
    
    applyFilters();
    alert('Transação adicionada com sucesso!');
}

// Edit transaction
function editTransaction(id) {
    const transaction = allTransactions.find(t => t.id === id);
    if (!transaction) return;
    
    const newDescription = prompt('Nova descrição:', transaction.description);
    if (newDescription !== null) {
        transaction.description = newDescription;
    }
    
    const newAmount = prompt('Novo valor:', Math.abs(transaction.amount));
    if (newAmount !== null && !isNaN(newAmount)) {
        transaction.amount = transaction.type === 'expense' ? -Math.abs(Number(newAmount)) : Number(newAmount);
    }
    
    applyFilters();
    alert('Transação atualizada com sucesso!');
}

// Delete transaction
function deleteTransaction(id) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    
    const index = allTransactions.findIndex(t => t.id === id);
    if (index !== -1) {
        allTransactions.splice(index, 1);
        applyFilters();
        alert('Transação excluída com sucesso!');
    }
}

// Property management functions
function registerProperty() {
    window.open('property-form.html', '_blank');
}

function editProperty() {
    if (currentProperty) {
        window.open(`property-form.html?id=${currentProperty.id}`, '_blank');
    } else {
        alert('Dados do imóvel não carregados!');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Period filter change
    document.getElementById('period-filter').addEventListener('change', (e) => {
        const customDateRange = document.getElementById('custom-date-range');
        if (e.target.value === 'custom') {
            customDateRange.style.display = 'grid';
        } else {
            customDateRange.style.display = 'none';
        }
    });
    
    // Load initial data
    loadPropertyData();
});

// Mock data for demonstration
function loadMockData() {
    currentProperty = {
        id: 1,
        name: 'Apartamento Centro',
        nickname: 'Apto Centro',
        address: 'Rua das Flores, 123 - Centro, São Paulo, SP',
        status: 'active',
        rentalType: 'Mensal',
        purchasePrice: 350000
    };
    
    allTransactions = [
        {
            id: 1,
            type: 'revenue',
            category: 'rent',
            description: 'Aluguel Janeiro 2024',
            amount: 2500,
            date: '2024-01-05'
        },
        {
            id: 2,
            type: 'expense',
            category: 'condo_fee',
            description: 'Condomínio Janeiro 2024',
            amount: -450,
            date: '2024-01-10'
        },
        {
            id: 3,
            type: 'expense',
            category: 'iptu',
            description: 'IPTU 2024 - 1ª parcela',
            amount: -280,
            date: '2024-01-15'
        },
        {
            id: 4,
            type: 'revenue',
            category: 'rent',
            description: 'Aluguel Fevereiro 2024',
            amount: 2500,
            date: '2024-02-05'
        },
        {
            id: 5,
            type: 'expense',
            category: 'maintenance',
            description: 'Reparo torneira',
            amount: -150,
            date: '2024-02-12'
        }
    ];
    
    updatePropertyInfo();
    populateFilters();
    applyFilters();
    hideLoading();
}

// Use mock data if API fails
window.addEventListener('load', () => {
    setTimeout(() => {
        if (document.getElementById('loading').classList.contains('show')) {
            console.log('API not available, using mock data');
            loadMockData();
        }
    }, 3000);
});