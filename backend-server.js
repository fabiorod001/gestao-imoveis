const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockProperties = [
    {
        id: 1,
        name: 'Apartamento Centro',
        address: 'Rua das Flores, 123 - Centro',
        type: 'Apartamento',
        value: 350000,
        monthlyRent: 2500,
        createdAt: '2024-01-15'
    },
    {
        id: 2,
        name: 'Casa Jardim América',
        address: 'Av. Brasil, 456 - Jardim América',
        type: 'Casa',
        value: 580000,
        monthlyRent: 3800,
        createdAt: '2024-02-20'
    },
    {
        id: 3,
        name: 'Sala Comercial',
        address: 'Rua Comercial, 789 - Centro Comercial',
        type: 'Comercial',
        value: 280000,
        monthlyRent: 1800,
        createdAt: '2024-03-10'
    }
];

const mockTransactions = [
    {
        id: 1,
        date: '2024-07-01',
        type: 'income',
        category: 'Aluguel',
        amount: 2500,
        propertyId: 1,
        propertyName: 'Apartamento Centro',
        description: 'Aluguel mensal'
    },
    {
        id: 2,
        date: '2024-07-01',
        type: 'income',
        category: 'Aluguel',
        amount: 3800,
        propertyId: 2,
        propertyName: 'Casa Jardim América',
        description: 'Aluguel mensal'
    },
    {
        id: 3,
        date: '2024-07-05',
        type: 'expense',
        category: 'Manutenção',
        amount: 450,
        propertyId: 1,
        propertyName: 'Apartamento Centro',
        description: 'Reparo hidráulico'
    },
    {
        id: 4,
        date: '2024-07-10',
        type: 'expense',
        category: 'IPTU',
        amount: 320,
        propertyId: 2,
        propertyName: 'Casa Jardim América',
        description: 'IPTU mensal'
    },
    {
        id: 5,
        date: '2024-07-01',
        type: 'income',
        category: 'Aluguel',
        amount: 1800,
        propertyId: 3,
        propertyName: 'Sala Comercial',
        description: 'Aluguel mensal'
    }
];

const mockSuppliers = [
    {
        id: 1,
        name: 'Hidráulica Silva',
        type: 'Manutenção',
        email: 'contato@hidraulicasilva.com',
        phone: '(11) 99999-1111',
        createdAt: '2024-01-10'
    },
    {
        id: 2,
        name: 'Pinturas & Reformas',
        type: 'Reforma',
        email: 'orcamento@pinturasreformas.com',
        phone: '(11) 99999-2222',
        createdAt: '2024-02-15'
    },
    {
        id: 3,
        name: 'Limpeza Total',
        type: 'Limpeza',
        email: 'contato@limpezatotal.com',
        phone: '(11) 99999-3333',
        createdAt: '2024-03-05'
    }
];

// Dashboard routes
app.get('/api/dashboard/overview', (req, res) => {
    const totalProperties = mockProperties.length;
    const monthlyIncome = mockTransactions
        .filter(t => t.type === 'income' && t.date.startsWith('2024-07'))
        .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = mockTransactions
        .filter(t => t.type === 'expense' && t.date.startsWith('2024-07'))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalValue = mockProperties.reduce((sum, p) => sum + p.value, 0);
    const totalRent = mockProperties.reduce((sum, p) => sum + p.monthlyRent, 0);
    const averageROI = totalValue > 0 ? (totalRent * 12 / totalValue * 100) : 0;
    
    res.json({
        totalProperties,
        monthlyIncome,
        monthlyExpenses,
        averageROI,
        netIncome: monthlyIncome - monthlyExpenses
    });
});

app.get('/api/dashboard/cash-flow', (req, res) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'];
    const cashFlow = months.map((month, index) => {
        const baseIncome = 8100; // Total rent
        const baseExpenses = 800;
        const variation = Math.random() * 0.2 - 0.1; // ±10% variation
        
        return {
            month,
            income: Math.round(baseIncome * (1 + variation)),
            expenses: Math.round(baseExpenses * (1 + variation * 2))
        };
    });
    
    res.json(cashFlow);
});

app.get('/api/dashboard/property-performance', (req, res) => {
    const performance = mockProperties.map(property => {
        const annualRent = property.monthlyRent * 12;
        const roi = (annualRent / property.value * 100);
        
        return {
            propertyName: property.name,
            roi: parseFloat(roi.toFixed(2)),
            netIncome: property.monthlyRent,
            occupancyRate: 95 + Math.random() * 5 // 95-100%
        };
    });
    
    res.json(performance);
});

// Properties routes
app.get('/api/properties', (req, res) => {
    res.json({
        data: mockProperties,
        total: mockProperties.length,
        page: 1,
        limit: 10
    });
});

app.get('/api/properties/:id', (req, res) => {
    const property = mockProperties.find(p => p.id === parseInt(req.params.id));
    if (!property) {
        return res.status(404).json({ message: 'Propriedade não encontrada' });
    }
    res.json(property);
});

// Transactions routes
app.get('/api/transactions', (req, res) => {
    res.json({
        data: mockTransactions,
        total: mockTransactions.length,
        page: 1,
        limit: 10
    });
});

app.get('/api/transactions/:id', (req, res) => {
    const transaction = mockTransactions.find(t => t.id === parseInt(req.params.id));
    if (!transaction) {
        return res.status(404).json({ message: 'Transação não encontrada' });
    }
    res.json(transaction);
});

// Suppliers routes
app.get('/api/suppliers', (req, res) => {
    res.json({
        data: mockSuppliers,
        total: mockSuppliers.length,
        page: 1,
        limit: 10
    });
});

app.get('/api/suppliers/:id', (req, res) => {
    const supplier = mockSuppliers.find(s => s.id === parseInt(req.params.id));
    if (!supplier) {
        return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }
    res.json(supplier);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API funcionando corretamente' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Endpoint não encontrado' });
});

app.listen(PORT, () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET /api/dashboard/overview');
    console.log('- GET /api/dashboard/cash-flow');
    console.log('- GET /api/dashboard/property-performance');
    console.log('- GET /api/properties');
    console.log('- GET /api/transactions');
    console.log('- GET /api/suppliers');
    console.log('- GET /api/health');
});