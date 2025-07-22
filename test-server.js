const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'TRAE Gestão de Imóveis - Backend funcionando!',
    timestamp: new Date().toISOString(),
    status: 'success'
  }));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Servidor sendo encerrado...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
  });
});