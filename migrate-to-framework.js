// Script de migração para o novo sistema de framework
// Este script move as páginas antigas e cria redirecionamentos

const fs = require('fs');
const path = require('path');

// Mapeamento das páginas antigas para IDs
const oldPagesToIds = {
    'maxhaus-43r.html': 1,
    'sevilha-307.html': 2,
    'sesimbra-ap-505-portugal.html': 3,
    'sevilha-g07.html': 4,
    'thera-by-you.html': 5,
    'salas-brasal.html': 6,
    'casa-ibirapuera-torre-3-ap-1411.html': 7,
    'living-full-faria-lima.html': 8,
    'malaga-m07.html': 9,
    'next-haddock-lobo-ap-33.html': 10
};

const frontendDir = path.join(__dirname, 'frontend');
const backupDir = path.join(frontendDir, 'legacy-pages');

function createBackupDirectory() {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('✅ Diretório de backup criado:', backupDir);
    }
}

function createRedirectPage(filename, propertyId) {
    const redirectContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecionando...</title>
    <script>
        // Redirecionamento automático para o novo sistema
        window.location.href = 'property-template.html?id=${propertyId}';
    </script>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .redirect-message {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="redirect-message">
        <div class="spinner"></div>
        <h2>Redirecionando para o novo sistema...</h2>
        <p>Você será redirecionado automaticamente em alguns segundos.</p>
        <p><a href="property-template.html?id=${propertyId}" style="color: white; text-decoration: underline;">Clique aqui se não for redirecionado automaticamente</a></p>
    </div>
</body>
</html>`;

    const filePath = path.join(frontendDir, filename);
    fs.writeFileSync(filePath, redirectContent, 'utf8');
    console.log(`✅ Página de redirecionamento criada: ${filename}`);
}

function migratePages() {
    console.log('🚀 Iniciando migração para o sistema de framework...');
    
    createBackupDirectory();
    
    Object.entries(oldPagesToIds).forEach(([filename, propertyId]) => {
        const oldPath = path.join(frontendDir, filename);
        const backupPath = path.join(backupDir, filename);
        
        // Mover arquivo original para backup se existir
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, backupPath);
            console.log(`📦 Arquivo movido para backup: ${filename}`);
        }
        
        // Criar página de redirecionamento
        createRedirectPage(filename, propertyId);
    });
    
    console.log('\n✨ Migração concluída com sucesso!');
    console.log('\n📋 Resumo das alterações:');
    console.log('- Páginas antigas movidas para: frontend/legacy-pages/');
    console.log('- Páginas de redirecionamento criadas para manter compatibilidade');
    console.log('- Novo sistema de framework implementado');
    console.log('\n🎯 Próximos passos:');
    console.log('1. Teste o novo sistema acessando: frontend/properties-index.html');
    console.log('2. Verifique se os redirecionamentos funcionam corretamente');
    console.log('3. Após validação, as páginas de backup podem ser removidas');
}

function rollback() {
    console.log('🔄 Iniciando rollback...');
    
    Object.keys(oldPagesToIds).forEach(filename => {
        const currentPath = path.join(frontendDir, filename);
        const backupPath = path.join(backupDir, filename);
        
        // Remover página de redirecionamento
        if (fs.existsSync(currentPath)) {
            fs.unlinkSync(currentPath);
            console.log(`🗑️ Página de redirecionamento removida: ${filename}`);
        }
        
        // Restaurar arquivo original
        if (fs.existsSync(backupPath)) {
            fs.renameSync(backupPath, currentPath);
            console.log(`♻️ Arquivo restaurado: ${filename}`);
        }
    });
    
    console.log('✅ Rollback concluído!');
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--rollback')) {
    rollback();
} else if (args.includes('--help')) {
    console.log('\n📖 Script de Migração para Framework de Imóveis');
    console.log('\nUso:');
    console.log('  node migrate-to-framework.js          # Executar migração');
    console.log('  node migrate-to-framework.js --rollback # Reverter migração');
    console.log('  node migrate-to-framework.js --help     # Mostrar esta ajuda');
    console.log('\nDescrição:');
    console.log('Este script migra o sistema de páginas individuais para um');
    console.log('framework centralizado, mantendo compatibilidade com URLs antigas.');
} else {
    migratePages();
}

module.exports = { migratePages, rollback };