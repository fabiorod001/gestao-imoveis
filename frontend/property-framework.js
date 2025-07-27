// Property Framework - Sistema centralizado para páginas de imóveis
class PropertyFramework {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.currentPropertyId = null;
        this.propertyData = null;
        this.transactions = [];
        this.filteredTransactions = [];
        this.propertyList = [];
        
        this.init();
    }

    async init() {
        try {
            // Obter ID do imóvel da URL
            this.currentPropertyId = this.getPropertyIdFromUrl();
            
            if (!this.currentPropertyId) {
                this.showError('ID do imóvel não encontrado na URL');
                return;
            }

            // Carregar lista de imóveis para navegação
            await this.loadPropertyList();
            
            // Carregar dados do imóvel atual
            await this.loadPropertyData();
            
            // Carregar transações
            await this.loadTransactions();
            
            // Inicializar filtros
            this.initializeFilters();
            
            // Renderizar tudo
            this.renderProperty();
            this.renderTransactions();
            this.calculateMetrics();
            
            // Esconder loading e mostrar conteúdo
            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('property-content').style.display = 'block';
            
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.showError('Erro ao carregar dados do imóvel');
        }
    }

    getPropertyIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || this.extractIdFromPath();
    }

    extractIdFromPath() {
        // Extrair ID do nome do arquivo ou path
        const path = window.location.pathname;
        const match = path.match(/property[\/-]?(\d+)/i) || path.match(/(\d+)/);
        return match ? match[1] : '1'; // Default para ID 1
    }

    async loadPropertyList() {
        try {
            const response = await fetch(`${this.API_BASE}/properties`);
            if (response.ok) {
                this.propertyList = await response.json();
            } else {
                // Fallback para dados estáticos se API não estiver disponível
                this.propertyList = this.getStaticPropertyList();
            }
        } catch (error) {
            console.warn('API não disponível, usando dados estáticos:', error);
            this.propertyList = this.getStaticPropertyList();
        }
    }

    async loadPropertyData() {
        try {
            const response = await fetch(`${this.API_BASE}/properties/${this.currentPropertyId}`);
            if (response.ok) {
                this.propertyData = await response.json();
            } else {
                // Fallback para dados estáticos
                this.propertyData = this.getStaticPropertyData();
            }
        } catch (error) {
            console.warn('API não disponível, usando dados estáticos:', error);
            this.propertyData = this.getStaticPropertyData();
        }
    }

    async loadTransactions() {
        try {
            const response = await fetch(`${this.API_BASE}/properties/${this.currentPropertyId}/transactions`);
            if (response.ok) {
                this.transactions = await response.json();
            } else {
                // Fallback para dados estáticos
                this.transactions = this.getStaticTransactions();
            }
        } catch (error) {
            console.warn('API não disponível, usando dados estáticos:', error);
            this.transactions = this.getStaticTransactions();
        }
        
        this.filteredTransactions = [...this.transactions];
    }

    getStaticPropertyList() {
        return [
            { id: 1, name: 'Maxhaus 43R', slug: 'maxhaus-43r' },
            { id: 2, name: 'Sevilha 307', slug: 'sevilha-307' },
            { id: 3, name: 'Sesimbra AP 505 Portugal', slug: 'sesimbra-ap-505-portugal' },
            { id: 4, name: 'Sevilha G07', slug: 'sevilha-g07' },
            { id: 5, name: 'Thera by You', slug: 'thera-by-you' },
            { id: 6, name: 'Salas Brasal', slug: 'salas-brasal' },
            { id: 7, name: 'Casa Ibirapuera Torre 3 AP 1411', slug: 'casa-ibirapuera-torre-3-ap-1411' },
            { id: 8, name: 'Living Full Faria Lima', slug: 'living-full-faria-lima' },
            { id: 9, name: 'Málaga M07', slug: 'malaga-m07' },
            { id: 10, name: 'Next Haddock Lobo AP 33', slug: 'next-haddock-lobo-ap-33' }
        ];
    }

    getStaticPropertyData() {
        const properties = {
            1: {
                id: 1,
                name: 'Maxhaus 43R',
                address: 'Rua Augusta, 43 - São Paulo, SP',
                type: 'Apartamento',
                status: 'ativo',
                currentValue: 850000,
                acquisitionValue: 750000,
                acquisitionDate: '2023-01-15',
                lastUpdate: '2024-01-15'
            },
            2: {
                id: 2,
                name: 'Sevilha 307',
                address: 'Av. Paulista, 307 - São Paulo, SP',
                type: 'Apartamento',
                status: 'ativo',
                currentValue: 920000,
                acquisitionValue: 800000,
                acquisitionDate: '2023-03-20',
                lastUpdate: '2024-01-15'
            }
        };
        
        return properties[this.currentPropertyId] || properties[1];
    }

    getStaticTransactions() {
        const transactionSets = {
            1: [
                {
                    id: 1,
                    date: '2024-01-01',
                    type: 'receita',
                    category: 'Aluguel',
                    description: 'Aluguel Janeiro 2024',
                    amount: 4500,
                    supplier: null
                },
                {
                    id: 2,
                    date: '2024-01-05',
                    type: 'despesa',
                    category: 'Manutenção',
                    description: 'Reparo hidráulico',
                    amount: 350,
                    supplier: 'Hidráulica Silva'
                }
            ],
            2: [
                {
                    id: 3,
                    date: '2024-01-01',
                    type: 'receita',
                    category: 'Aluguel',
                    description: 'Aluguel Janeiro 2024',
                    amount: 5200,
                    supplier: null
                }
            ]
        };
        
        return transactionSets[this.currentPropertyId] || [];
    }

    renderProperty() {
        if (!this.propertyData) return;
        
        // Atualizar título da página
        document.title = this.propertyData.name;
        document.getElementById('property-title').textContent = this.propertyData.name;
        
        // Atualizar header
        document.getElementById('property-name').textContent = this.propertyData.name;
        document.getElementById('property-address').textContent = this.propertyData.address;
        
        // Atualizar informações
        document.getElementById('property-type').textContent = this.propertyData.type;
        document.getElementById('property-value').textContent = this.formatCurrency(this.propertyData.currentValue);
        document.getElementById('acquisition-date').textContent = this.formatDate(this.propertyData.acquisitionDate);
        document.getElementById('acquisition-value').textContent = this.formatCurrency(this.propertyData.acquisitionValue);
        document.getElementById('last-update').textContent = this.formatDate(this.propertyData.lastUpdate);
        
        // Atualizar status
        const statusElement = document.getElementById('property-status');
        statusElement.textContent = this.propertyData.status.charAt(0).toUpperCase() + this.propertyData.status.slice(1);
        statusElement.className = `status-badge status-${this.propertyData.status}`;
    }

    renderTransactions() {
        const tbody = document.getElementById('transactions-body');
        const noTransactions = document.getElementById('no-transactions');
        
        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = '';
            noTransactions.style.display = 'block';
            return;
        }
        
        noTransactions.style.display = 'none';
        
        tbody.innerHTML = this.filteredTransactions.map(transaction => `
            <tr>
                <td>${this.formatDate(transaction.date)}</td>
                <td>
                    <span class="badge ${transaction.type === 'receita' ? 'bg-success' : 'bg-danger'}">
                        ${transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                </td>
                <td>${transaction.category}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.type === 'receita' ? 'text-success' : 'text-danger'}">
                    ${transaction.type === 'receita' ? '+' : '-'} ${this.formatCurrency(transaction.amount)}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="framework.editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="framework.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    calculateMetrics() {
        const revenues = this.filteredTransactions.filter(t => t.type === 'receita');
        const expenses = this.filteredTransactions.filter(t => t.type === 'despesa');
        
        const totalRevenue = revenues.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const netResult = totalRevenue - totalExpenses;
        
        // Calcular ROI baseado no valor de aquisição
        const roi = this.propertyData.acquisitionValue > 0 
            ? (netResult / this.propertyData.acquisitionValue) * 100 
            : 0;
        
        // Atualizar elementos
        document.getElementById('total-revenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('total-expenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('net-result').textContent = this.formatCurrency(netResult);
        document.getElementById('roi-percentage').textContent = this.formatPercentage(roi);
        
        // Atualizar cores baseado no resultado
        const netElement = document.getElementById('net-result');
        netElement.className = `metric-value ${netResult >= 0 ? 'text-success' : 'text-danger'}`;
    }

    initializeFilters() {
        // Inicializar filtros de ano e mês
        this.populateYearFilter();
        this.populateMonthFilter();
        this.populateCategoryFilter();
    }

    populateYearFilter() {
        const years = [...new Set(this.transactions.map(t => new Date(t.date).getFullYear()))];
        const yearFilter = document.getElementById('year-filter');
        
        years.sort((a, b) => b - a).forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
    }

    populateMonthFilter() {
        const months = [
            { value: 1, name: 'Janeiro' }, { value: 2, name: 'Fevereiro' }, { value: 3, name: 'Março' },
            { value: 4, name: 'Abril' }, { value: 5, name: 'Maio' }, { value: 6, name: 'Junho' },
            { value: 7, name: 'Julho' }, { value: 8, name: 'Agosto' }, { value: 9, name: 'Setembro' },
            { value: 10, name: 'Outubro' }, { value: 11, name: 'Novembro' }, { value: 12, name: 'Dezembro' }
        ];
        
        const monthFilter = document.getElementById('month-filter');
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month.value;
            option.textContent = month.name;
            monthFilter.appendChild(option);
        });
    }

    populateCategoryFilter() {
        const categories = [...new Set(this.transactions.map(t => t.category))];
        const categoryFilter = document.getElementById('category-filter');
        
        categories.sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    applyFilters() {
        const yearFilter = document.getElementById('year-filter').value;
        const monthFilter = document.getElementById('month-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const categoryFilter = document.getElementById('category-filter').value;
        
        this.filteredTransactions = this.transactions.filter(transaction => {
            const date = new Date(transaction.date);
            
            if (yearFilter && date.getFullYear() !== parseInt(yearFilter)) return false;
            if (monthFilter && (date.getMonth() + 1) !== parseInt(monthFilter)) return false;
            if (typeFilter && transaction.type !== typeFilter) return false;
            if (categoryFilter && transaction.category !== categoryFilter) return false;
            
            return true;
        });
        
        this.renderTransactions();
        this.calculateMetrics();
    }

    // Navegação entre propriedades
    navigateToProperty(direction) {
        const currentIndex = this.propertyList.findIndex(p => p.id == this.currentPropertyId);
        let newIndex;
        
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % this.propertyList.length;
        } else {
            newIndex = currentIndex > 0 ? currentIndex - 1 : this.propertyList.length - 1;
        }
        
        const newProperty = this.propertyList[newIndex];
        window.location.href = `property-template.html?id=${newProperty.id}`;
    }

    // Ações de CRUD
    editProperty() {
        alert('Funcionalidade de edição será implementada em breve!');
    }

    addTransaction(type) {
        alert(`Funcionalidade para adicionar ${type} será implementada em breve!`);
    }

    editTransaction(id) {
        alert(`Editar transação ${id} - funcionalidade será implementada em breve!`);
    }

    deleteTransaction(id) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            alert(`Excluir transação ${id} - funcionalidade será implementada em breve!`);
        }
    }

    viewReports() {
        alert('Funcionalidade de relatórios será implementada em breve!');
    }

    // Utilitários
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatPercentage(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    showError(message) {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Erro</h4>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Tentar Novamente</button>
            </div>
        `;
    }
}

// Funções globais para compatibilidade
function navigateToProperty(direction) {
    framework.navigateToProperty(direction);
}

function applyFilters() {
    framework.applyFilters();
}

function editProperty() {
    framework.editProperty();
}

function addTransaction(type) {
    framework.addTransaction(type);
}

function viewReports() {
    framework.viewReports();
}

// Inicializar framework quando a página carregar
let framework;
document.addEventListener('DOMContentLoaded', () => {
    framework = new PropertyFramework();
});