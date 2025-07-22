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
        name: 'Sevilha 307',
        nickname: 'Sevilha 307',
        address: 'Condomínio Andalus, Rua Einstein, 307 - Morumbi, São Paulo, SP',
        type: 'Apartamento',
        value: 682957,
        purchasePrice: 412461,
        monthlyRent: 3200,
        createdAt: '2021-03-15'
    },
    {
        id: 2,
        name: 'Sevilha G07',
        nickname: 'Sevilha G07',
        address: 'Condomínio Andalus, Rua Einstein, G07 - Morumbi, São Paulo, SP',
        type: 'Apartamento',
        value: 1008137,
        purchasePrice: 804992,
        monthlyRent: 3500,
        createdAt: '2022-01-20'
    },
    {
        id: 3,
        name: 'Málaga M07',
        nickname: 'Málaga M07',
        address: 'Condomínio Andalus, Rua Einstein, M07 - Morumbi, São Paulo, SP',
        type: 'Apartamento',
        value: 770536,
        purchasePrice: 540446,
        monthlyRent: 3800,
        createdAt: '2020-11-10'
    },
    {
        id: 4,
        name: 'MaxHaus 43R',
        nickname: 'MaxHaus 43R',
        address: 'MaxHaus Berrini, Av. Berrini, 43R - Brooklin, São Paulo, SP',
        type: 'Apartamento',
        value: 1267701,
        purchasePrice: 666631,
        monthlyRent: 4200,
        createdAt: '2019-08-05'
    },
    {
        id: 5,
        name: 'Next Haddock Lobo ap 33',
        nickname: 'Next Haddock Lobo ap 33',
        address: 'Next Haddock Lobo, Rua Haddock Lobo, 33 - Cerqueira César, São Paulo, SP',
        type: 'Studio',
        value: 177025,
        purchasePrice: 130000,
        monthlyRent: 2800,
        createdAt: '2022-06-12'
    },
    {
        id: 6,
        name: 'Thera by You',
        nickname: 'Thera by You',
        address: 'Thera by You, Rua Funchal - Vila Olímpia, São Paulo, SP',
        type: 'Apartamento',
        value: 450000,
        purchasePrice: 380000,
        monthlyRent: 3600,
        createdAt: '2023-02-18'
    },
    {
        id: 7,
        name: 'Salas Brasal',
        nickname: 'Salas Brasal',
        address: 'Edifício Brasal, Av. Paulista - Bela Vista, São Paulo, SP',
        type: 'Comercial',
        value: 320000,
        purchasePrice: 280000,
        monthlyRent: 2200,
        createdAt: '2021-09-25'
    },
    {
        id: 8,
        name: 'Casa Ibirapuera torre 3 ap 1411',
        nickname: 'Casa Ibirapuera torre 3 ap 1411',
        address: 'Casa Ibirapuera, Torre 3, Ap 1411 - Ibirapuera, São Paulo, SP',
        type: 'Apartamento',
        value: 580000,
        purchasePrice: 520000,
        monthlyRent: 3900,
        createdAt: '2022-11-08'
    },
    {
        id: 9,
        name: 'Sesimbra ap 505 Portugal',
        nickname: 'Sesimbra ap 505 Portugal',
        address: 'Apartamento 505, Sesimbra - Portugal',
        type: 'Apartamento',
        value: 180000,
        purchasePrice: 165000,
        monthlyRent: 1200,
        currency: 'EUR',
        createdAt: '2023-05-14'
    },
    {
        id: 10,
        name: 'Living Full Faria Lima',
        nickname: 'Living Full Faria Lima',
        address: 'Living Full Faria Lima, Setor 1, Res 1808 - Itaim Bibi, São Paulo, SP',
        type: 'Apartamento',
        value: 264804,
        purchasePrice: 194000,
        monthlyRent: 2900,
        createdAt: '2022-04-30'
    }
];

const mockTransactions = [
    // Receitas de Aluguel - Janeiro 2025
    {
        id: 1,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 3200,
        propertyId: 1,
        propertyName: 'Sevilha 307',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 2,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 3500,
        propertyId: 2,
        propertyName: 'Sevilha G07',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 3,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 3800,
        propertyId: 3,
        propertyName: 'Málaga M07',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 4,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 4200,
        propertyId: 4,
        propertyName: 'MaxHaus 43R',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 5,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 2800,
        propertyId: 5,
        propertyName: 'Next Haddock Lobo ap 33',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 6,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 3600,
        propertyId: 6,
        propertyName: 'Thera by You',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 7,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 2200,
        propertyId: 7,
        propertyName: 'Salas Brasal',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 8,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 3900,
        propertyId: 8,
        propertyName: 'Casa Ibirapuera torre 3 ap 1411',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    {
        id: 9,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 1200,
        propertyId: 9,
        propertyName: 'Sesimbra ap 505 Portugal',
        description: 'Aluguel mensal - Janeiro 2025',
        currency: 'EUR'
    },
    {
        id: 10,
        date: '2025-01-01',
        type: 'income',
        category: 'Aluguel',
        amount: 2900,
        propertyId: 10,
        propertyName: 'Living Full Faria Lima',
        description: 'Aluguel mensal - Janeiro 2025'
    },
    // Despesas - Janeiro 2025
    {
        id: 11,
        date: '2025-01-05',
        type: 'expense',
        category: 'Condomínio',
        amount: 580,
        propertyId: 1,
        propertyName: 'Sevilha 307',
        description: 'Taxa condomínio + energia + gás + água'
    },
    {
        id: 12,
        date: '2025-01-05',
        type: 'expense',
        category: 'Condomínio',
        amount: 620,
        propertyId: 2,
        propertyName: 'Sevilha G07',
        description: 'Taxa condomínio + energia + gás + água'
    },
    {
        id: 13,
        date: '2025-01-05',
        type: 'expense',
        category: 'Condomínio',
        amount: 650,
        propertyId: 3,
        propertyName: 'Málaga M07',
        description: 'Taxa condomínio + energia + gás + água'
    },
    {
        id: 14,
        date: '2025-01-10',
        type: 'expense',
        category: 'Manutenção',
        amount: 450,
        propertyId: 4,
        propertyName: 'MaxHaus 43R',
        description: 'Reparo hidráulico'
    },
    {
        id: 15,
        date: '2025-01-15',
        type: 'expense',
        category: 'Impostos',
        amount: 320,
        propertyId: 6,
        propertyName: 'Thera by You',
        description: 'IPTU mensal'
    },
    {
        id: 16,
        date: '2025-01-20',
        type: 'expense',
        category: 'Limpezas',
        amount: 180,
        propertyId: 5,
        propertyName: 'Next Haddock Lobo ap 33',
        description: 'Limpeza pós-hóspede'
    },
    {
        id: 17,
        date: '2025-01-25',
        type: 'expense',
        category: 'Gestão',
        amount: 1500,
        propertyId: null,
        propertyName: 'Gestão - Maurício',
        description: 'Taxa de gestão mensal - rateio entre propriedades'
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