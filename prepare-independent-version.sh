#!/bin/bash

echo "🚀 Preparando versão independente do Property Manager..."

# Criar diretório para versão independente
mkdir -p property-manager-independent

# Copiar todos os arquivos, exceto node_modules e .git
echo "📁 Copiando arquivos..."
rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'tmp' --exclude 'backups' --exclude 'cursor_export' --exclude '*.tar.gz' --exclude '*.log' --exclude 'attached_assets' . property-manager-independent/

cd property-manager-independent

# Criar nova estrutura de autenticação independente
echo "🔐 Criando sistema de autenticação independente..."

# Criar arquivo de autenticação simples
cat > server/auth.ts << 'EOF'
import { NextFunction, Request, Response } from "express";
import expressSession from "express-session";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

export function setupAuth(app: any) {
  // Configurar sessões
  app.use(expressSession({
    secret: process.env.SESSION_SECRET || 'change-this-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
    }
  }));

  // Rota de login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Para desenvolvimento, aceitar admin/admin
      // Em produção, implementar verificação real
      if (username === 'admin' && password === 'admin') {
        (req.session as any).user = {
          id: 'user-1',
          username: 'admin',
          name: 'Administrador'
        };
        
        res.json({ 
          success: true,
          user: {
            id: 'user-1',
            username: 'admin',
            name: 'Administrador'
          }
        });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error) {
      res.status(400).json({ error: 'Dados inválidos' });
    }
  });

  // Rota de logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'Erro ao fazer logout' });
      } else {
        res.json({ success: true });
      }
    });
  });

  // Verificar autenticação
  app.get('/api/auth/check', (req: Request, res: Response) => {
    if ((req.session as any).user) {
      res.json({ 
        authenticated: true,
        user: (req.session as any).user
      });
    } else {
      res.json({ authenticated: false });
    }
  });
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any)?.user) {
    (req as any).user = (req.session as any).user;
    next();
  } else {
    res.status(401).json({ error: 'Não autenticado' });
  }
}
EOF

# Criar página de login para o frontend
echo "🎨 Criando página de login..."
cat > client/src/pages/login.tsx << 'EOF'
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário obrigatório"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: data,
      });

      if (response.success) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        
        // Redirecionar para dashboard
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: "Verifique suas credenciais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Property Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-sm text-gray-600 text-center">
            <p>Para desenvolvimento:</p>
            <p>Usuário: <strong>admin</strong></p>
            <p>Senha: <strong>admin</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

# Criar arquivo .env.example
echo "⚙️ Criando arquivo de configuração exemplo..."
cat > .env.example << 'EOF'
# Banco de Dados
# Use qualquer PostgreSQL: local, Neon, Supabase, etc
DATABASE_URL=postgresql://usuario:senha@localhost:5432/property_manager

# Servidor
PORT=5000
NODE_ENV=development

# Segurança
SESSION_SECRET=mude-isso-para-uma-senha-muito-segura

# Frontend
VITE_API_URL=http://localhost:5000

# Opcional - Email (se quiser notificações)
EMAIL_SERVICE=gmail
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EOF

# Criar README específico
echo "📝 Criando documentação..."
cat > README.md << 'EOF'
# Property Manager - Versão Independente

Sistema completo de gestão de propriedades e aluguéis, 100% independente de plataforma.

## Instalação Rápida

1. **Clone o repositório**
```bash
git clone [seu-repositorio]
cd property-manager
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

4. **Configure o banco de dados**
```bash
npm run db:push
```

5. **Inicie o sistema**
```bash
npm run dev
```

Acesse: http://localhost:5000

## Credenciais Padrão

- Usuário: `admin`
- Senha: `admin`

## Banco de Dados

O sistema suporta qualquer PostgreSQL:

### Opção 1: PostgreSQL Local
```
DATABASE_URL=postgresql://usuario:senha@localhost:5432/property_manager
```

### Opção 2: Neon (Grátis)
1. Crie conta em https://neon.tech
2. Crie um projeto
3. Copie a connection string

### Opção 3: Supabase (Grátis)
1. Crie conta em https://supabase.com
2. Crie um projeto
3. Use a connection string fornecida

## Funcionalidades

- ✅ Gestão completa de propriedades
- ✅ Controle de receitas e despesas
- ✅ Importação de dados Airbnb
- ✅ Relatórios financeiros
- ✅ Dashboard analítico
- ✅ Exportação Excel/PDF
- ✅ Sistema de autenticação próprio

## Tecnologias

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Banco: PostgreSQL + Drizzle ORM
- UI: Tailwind CSS + shadcn/ui

## Licença

Este projeto é 100% seu. Sem restrições, sem amarras.
EOF

# Criar script de setup
echo "🔧 Criando scripts auxiliares..."
cat > setup.js << 'EOF'
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Configurando Property Manager...\n');

// Verificar Node.js
const nodeVersion = process.version;
console.log(`✓ Node.js ${nodeVersion} detectado`);

if (!fs.existsSync('.env')) {
  console.log('✓ Criando arquivo .env...');
  fs.copyFileSync('.env.example', '.env');
  console.log('  ⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações!');
}

console.log('\n✅ Setup inicial concluído!');
console.log('\nPróximos passos:');
console.log('1. Edite o arquivo .env');
console.log('2. Execute: npm install');
console.log('3. Execute: npm run db:push');
console.log('4. Execute: npm run dev');
EOF

# Atualizar package.json
echo "📦 Atualizando package.json..."
cat > package.json << 'EOF'
{
  "name": "property-manager",
  "version": "1.0.0",
  "description": "Sistema de Gestão de Propriedades - Independente",
  "type": "module",
  "scripts": {
    "setup": "node setup.js",
    "dev": "tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:express --external:pg --external:drizzle-orm",
    "start": "NODE_ENV=production node dist/server.js",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@neondatabase/serverless": "^0.9.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@tanstack/react-query": "^5.28.4",
    "autoprefixer": "^10.4.18",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "cmdk": "^1.0.0",
    "connect-pg-simple": "^9.0.1",
    "csv-parse": "^5.5.5",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.29.3",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.0.0",
    "express": "^4.18.2",
    "express-session": "^1.18.0",
    "framer-motion": "^11.0.20",
    "input-otp": "^1.2.4",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "lucide-react": "^0.356.0",
    "memoizee": "^0.4.15",
    "multer": "^1.4.5-lts.1",
    "next-themes": "^0.2.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "postcss": "^8.4.35",
    "react": "^18.2.0",
    "react-day-picker": "^8.10.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.51.0",
    "react-icons": "^5.0.1",
    "react-resizable-panels": "^2.0.16",
    "recharts": "^2.12.3",
    "tailwind-merge": "^2.2.1",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.0",
    "vite": "^5.1.5",
    "wouter": "^3.1.0",
    "ws": "^8.16.0",
    "xlsx": "^0.18.5",
    "zod": "^3.22.4",
    "zod-validation-error": "^3.0.3"
  },
  "devDependencies": {
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/memoizee": "^0.4.11",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.11.24",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.2.61",
    "@types/react-dom": "^18.2.19",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.2.1",
    "drizzle-kit": "^0.20.14",
    "esbuild": "^0.20.1",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
EOF

echo "✅ Versão independente criada em: property-manager-independent/"
echo ""
echo "Próximos passos:"
echo "1. cd property-manager-independent"
echo "2. npm install"
echo "3. cp .env.example .env"
echo "4. Edite .env com suas configurações"
echo "5. npm run db:push"
echo "6. npm run dev"