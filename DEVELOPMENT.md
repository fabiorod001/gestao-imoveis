# Guia de Desenvolvimento - RentManager

## 🚀 Início Rápido

### Primeira Execução
```bash
npm run build  # Compila frontend e backend
npm start      # Inicia o servidor
```

### Workflow de Desenvolvimento

#### Fazendo Alterações no Código
1. **Edite os arquivos** necessários (frontend ou backend)
2. **Recompile o projeto**:
   ```bash
   npm run build
   ```
3. **O servidor reinicia automaticamente** após o build

#### Scripts Disponíveis

- `npm run build` - Compila frontend (Vite) e backend (esbuild)
- `npm start` - Inicia servidor de produção na porta 5000
- `npm run dev:prod` - Build + Start em um comando
- `npm run db:push` - Atualiza schema do banco de dados
- `npm run check` - Verifica tipos TypeScript

## 📝 Notas Importantes

### Desenvolvimento Local vs. Produção
- **Ambiente Replit**: Usa `npm start` (servidor já buildado)
- **Ambiente Render (Produção)**: Build automático no deploy

### Por Que Não Usar `npm run dev`?
O tsx (TypeScript executor) é incompatível com Vite ESM. A solução adotada usa builds de produção localmente, garantindo:
- ✅ Ambiente idêntico à produção
- ✅ Builds rápidos (~19s)
- ✅ Zero problemas de compatibilidade
- ❌ Sem Hot Module Replacement (HMR)

### Estrutura de Build
```
dist/
├── index.js          # Backend bundled
└── public/           # Frontend assets
    ├── index.html
    └── assets/       # JS, CSS, images
```

## 🔧 Troubleshooting

### Erro: "Cannot find module"
```bash
npm run build  # Recompile o projeto
```

### Mudanças não aparecem
1. Verifique se executou `npm run build`
2. Reinicie o workflow "Start application"

### Erro de porta em uso
```bash
pkill -f "node dist/index.js"  # Mata processo anterior
npm start                       # Reinicia
```

## 🌐 Deploy

### Render (Backend + Frontend)
- **Build Command**: `npm run build`
- **Start Command**: `node dist/index.js`
- **Porta**: Automática via `process.env.PORT`

### Variáveis de Ambiente Necessárias
- `DATABASE_URL` - URL do PostgreSQL
- Outras configuradas via Replit Secrets
