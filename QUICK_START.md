# 🚀 QUICK START - LEIA PRIMEIRO

## Estado Atual do Sistema (12/08/2025)
✅ Sistema 100% funcional com 10 propriedades cadastradas
✅ Todos os dados históricos Airbnb importados (2014-2024)
✅ Reservas futuras importadas (Agosto-Novembro 2025)
✅ Última sincronização GitHub: 12/08/2025 20:57

## Estrutura Principal
```
/client         → Frontend React + TypeScript
/server         → Backend Express + PostgreSQL
/shared         → Schemas compartilhados (Drizzle ORM)
```

## Comandos Essenciais
- **Iniciar sistema:** `npm run dev` (já configurado no workflow)
- **Push GitHub:** `./git-push-now.sh`
- **Importar dados:** Usar interface em `/import`

## Funcionalidades Principais
1. **Dashboard** - Visão geral financeira
2. **Propriedades** - Gestão de 10 imóveis
3. **Transações** - 1000+ lançamentos cadastrados
4. **Importação** - CSV Airbnb (histórico e futuro)
5. **Relatórios** - Analytics e exportação Excel/PDF

## Arquivos Importantes
- `replit.md` - Arquitetura e preferências do usuário
- `client/src/pages/` - Todas as páginas da aplicação
- `server/routes.ts` - API endpoints
- `shared/schema.ts` - Modelos de dados

## Problemas Conhecidos e Soluções
- **Sidebar duplicada:** Já corrigido (não usar Layout dentro de páginas)
- **Importação CSV:** Substitui automaticamente valores antigos
- **Propriedades:** Matching por aproximação de nome

## Última Sessão de Trabalho
- Correção sidebar duplicada ✓
- Importação dados históricos Airbnb ✓
- Importação reservas futuras ✓
- Push para GitHub ✓

## Para Continuar Trabalhando
1. Sistema já está rodando no workflow "Start application"
2. Acesse qualquer página diretamente
3. Todos os dados estão no PostgreSQL
4. Não precisa reinstalar nada

---
**NOTA PARA O AGENTE:** Este arquivo contém o contexto essencial. Leia primeiro antes de analisar outros arquivos.