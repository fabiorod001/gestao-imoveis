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

// Properties functions
async function loadProperties() {
    try {
        const response = await apiCall('/properties');
        properties = response.data || [];
        renderProperties();
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
    }
}

function renderProperties() {
    const container = document.getElementById('properties-list');
    
    if (properties.length === 0) {
        container.innerHTML = '<li class="p-4 text-center text-gray-500">Nenhuma propriedade encontrada</li>';
        return;
    }
    
    container.innerHTML = properties.map(property => `
        <li class="p-4 hover:bg-gray-50">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-lg font-medium text-gray-900">${property.name}</h3>
                    <p class="text-sm text-gray-500">${property.address}</p>
                    <div class="mt-2 flex items-center space-x-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${property.type}
                        </span>
                        <span class="text-sm text-gray-600">Valor: ${formatCurrency(property.value)}</span>
                        <span class="text-sm text-gray-600">Aluguel: ${formatCurrency(property.monthlyRent)}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="editProperty(${property.id})" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProperty(${property.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </li>
    `).join('');
}

// Transactions functions
async function loadTransactions() {
    try {
        const response = await apiCall('/transactions');
        transactions = response.data || [];
        renderTransactions();
    } catch (error) {
        console.error('Erro ao carregar transações:', error);
    }
}

function renderTransactions() {
    const container = document.getElementById('transactions-list');
    
    if (transactions.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhuma transação encontrada</td></tr>';
        return;
    }
    
    container.innerHTML = transactions.map(transaction => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatDate(transaction.date)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${transaction.type === 'income' ? 'Receita' : 'Despesa'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${transaction.category}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
            }">
                ${formatCurrency(transaction.amount)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${transaction.propertyName || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editTransaction(${transaction.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTransaction(${transaction.id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Suppliers functions
async function loadSuppliers() {
    try {
        const response = await apiCall('/suppliers');
        suppliers = response.data || [];
        renderSuppliers();
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
    }
}

function renderSuppliers() {
    const container = document.getElementById('suppliers-list');
    
    if (suppliers.length === 0) {
        container.innerHTML = '<li class="p-4 text-center text-gray-500">Nenhum fornecedor encontrado</li>';
        return;
    }
    
    container.innerHTML = suppliers.map(supplier => `
        <li class="p-4 hover:bg-gray-50">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-lg font-medium text-gray-900">${supplier.name}</h3>
                    <p class="text-sm text-gray-500">${supplier.email || ''}</p>
                    <div class="mt-2 flex items-center space-x-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            ${supplier.type}
                        </span>
                        <span class="text-sm text-gray-600">Tel: ${supplier.phone || '-'}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="editSupplier(${supplier.id})" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteSupplier(${supplier.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </li>
    `).join('');
}

// Modal functions (placeholders)
function openPropertyModal() {
    alert('Modal de propriedade será implementado');
}

function openTransactionModal() {
    alert('Modal de transação será implementado');
}

function openSupplierModal() {
    alert('Modal de fornecedor será implementado');
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
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update nav buttons
            navButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.remove('border-transparent', 'text-gray-500');
            button.classList.add('border-blue-500', 'text-blue-600');
            
            // Update tab contents
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(tabId).classList.remove('hidden');
            
            // Load data for the active tab
            switch(tabId) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'properties':
                    loadProperties();
                    break;
                case 'transactions':
                    loadTransactions();
                    break;
                case 'suppliers':
                    loadSuppliers();
                    break;
            }
        });
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadDashboard(); // Load dashboard by default
});