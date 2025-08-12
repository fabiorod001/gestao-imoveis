# SOLUÇÃO PARA ERRO DE ESPAÇOS NO CAMINHO

## PROBLEMA
O drizzle-kit falha quando há espaços no caminho do diretório (comum no Replit).

## SOLUÇÃO SIMPLES
Execute estes comandos no Shell do Replit:

```bash
# Copiar projeto para diretório sem espaços
cp -r property-manager-independent /tmp/gestao-imoveis

# Entrar no novo diretório
cd /tmp/gestao-imoveis

# Continuar instalação normalmente
npm install
npx drizzle-kit push
npm run dev
```

## PARA GITHUB
Use o mesmo processo - sempre copie para /tmp primeiro:

```bash
cp -r property-manager-independent /tmp/gestao-imoveis
cd /tmp/gestao-imoveis
git init
# ... resto dos comandos git
```

O sistema funciona perfeitamente quando instalado em diretório sem espaços.