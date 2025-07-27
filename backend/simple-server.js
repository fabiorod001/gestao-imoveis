const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockProperties = [
    {
        id: 1,
        nickname: 'Málaga M07',
        address: 'Rua Málaga, 07 - Vila Madalena',
        valorAquisicao: 850000,
        valorAtualizado: 920000,
        resultadoMes: 4500,
        resultadoPercentual: 0.49
    },
    {
        id: 2,
        nickname: 'Sevilha 307',
        address: 'Rua Sevilha, 307 - Vila Madalena',
        valorAquisicao: 750000,
        valorAtualizado: 810000,
        resultadoMes: 3800,
        resultadoPercentual: 0.47
    },
    {
        id: 3,
        nickname: 'Casa Ibirapuera',
        address: 'Torre 3, Ap 1411 - Ibirapuera',
        valorAquisicao: 1200000,
        valorAtualizado: 1300000,
        resultadoMes: 5200,
        resultadoPercentual: 0.40
    },
    {
        id: 4,
        nickname: 'MaxHaus 43R',
        address: 'MaxHaus Residencial, Apto 43R',
        valorAquisicao: 680000,
        valorAtualizado: 735000,
        resultadoMes: 2800,
        resultadoPercentual: 0.38
    },
    {
        id: 5,
        nickname: 'Next Haddock Lobo',
        address: 'Next Haddock Lobo, Apto 33',
        valorAquisicao: 1200000,
        valorAtualizado: 1290000,
        resultadoMes: 6200,
        resultadoPercentual: 0.48
    }
];

const mockTransactions = [
    { id: 1, propertyId: 1, type: 'receita', category: 'airbnb-actual', amount: 2500, date: '2025-07-15' },
    { id: 2, propertyId: 1, type: 'despesa', category: 'condominio', amount: 800, date: '2025-07-10' },
    { id: 3, propertyId: 2, type: 'receita', category: 'airbnb-pending', amount: 2200, date: '2025-07-20' },
    { id: 4, propertyId: 2, type: 'despesa', category: 'limpeza', amount: 150, date: '2025-07-12' },
    { id: 5, propertyId: 3, type: 'receita', category: 'airbnb-actual', amount: 3200, date: '2025-07-18' },
    { id: 6, propertyId: 3, type: 'despesa', category: 'manutencao', amount: 450, date: '2025-07-14' }
];

// Routes
app.get('/api/properties', (req, res) => {
    res.json(mockProperties);
});

app.get('/api/transactions', (req, res) => {
    res.json(mockTransactions);
});

app.get('/api/dashboard/overview', (req, res) => {
    const totalProperties = mockProperties.length;
    const monthlyIncome = mockProperties.reduce((sum, prop) => sum + (prop.resultadoMes > 0 ? prop.resultadoMes : 0), 0);
    const monthlyExpenses = mockTransactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + t.amount, 0);
    const averageROI = mockProperties.reduce((sum, prop) => sum + prop.resultadoPercentual, 0) / mockProperties.length;
    
    res.json({
        totalProperties,
        monthlyIncome,
        monthlyExpenses,
        averageROI
    });
});

app.get('/api/dashboard/cash-flow', (req, res) => {
    const cashFlowData = [
        { month: 'Jan', income: 15000, expenses: 8000 },
        { month: 'Fev', income: 16500, expenses: 8500 },
        { month: 'Mar', income: 14800, expenses: 7800 },
        { month: 'Abr', income: 17200, expenses: 9200 },
        { month: 'Mai', income: 16800, expenses: 8800 },
        { month: 'Jun', income: 18500, expenses: 9500 },
        { month: 'Jul', income: 19200, expenses: 9800 }
    ];
    
    res.json(cashFlowData);
});

app.get('/api/dashboard/property-performance', (req, res) => {
    const performanceData = mockProperties.map(prop => ({
        propertyName: prop.nickname,
        roi: prop.resultadoPercentual
    }));
    
    res.json(performanceData);
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo deu errado!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Sistema de Gestão de Imóveis iniciado com sucesso!`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
});

module.exports = app;