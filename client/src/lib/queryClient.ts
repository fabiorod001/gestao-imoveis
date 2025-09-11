import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method: string;
    body?: string | FormData;
  } | string,
  data?: unknown | undefined,
): Promise<Response> {
  let method: string;
  let headers: Record<string, string> = {};
  let body: string | FormData | undefined;

  // Handle both old and new API formats
  if (typeof options === 'string') {
    // Old format: apiRequest(url, method, data)
    method = options;
    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  } else {
    // New format: apiRequest(url, { method, body })
    method = options.method;
    body = options.body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Otimizações para mobile - cache agressivo
      staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam "frescos" por mais tempo
      gcTime: 30 * 60 * 1000, // 30 minutos - mantém cache por mais tempo
      retry: false,
      // Otimização: evita re-fetch desnecessário ao retornar para aba
      refetchOnMount: false,
      refetchOnReconnect: 'always', // Mas refetch ao reconectar (importante no mobile)
    },
    mutations: {
      retry: false,
      // Otimização: callback de sucesso padrão para limpar caches relacionados
      onSuccess: () => {
        // Invalidação inteligente será feita caso a caso
      },
    },
  },
});

// Configurações específicas por tipo de dado
export const queryOptions = {
  // Dados estáveis (propriedades, configurações)
  stable: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  },
  // Dados dinâmicos (transações, dashboard)
  dynamic: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  // Dados em tempo real (fluxo de caixa)
  realtime: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  },
};

// Helper para prefetch de dados críticos
export async function prefetchCriticalData() {
  // Prefetch de propriedades (sempre necessárias)
  await queryClient.prefetchQuery({
    queryKey: ['/api/properties'],
    ...queryOptions.stable,
  });
  
  // Prefetch do usuário atual
  await queryClient.prefetchQuery({
    queryKey: ['/api/auth/user'],
    ...queryOptions.stable,
  });
}

// Helper para invalidação inteligente
export function smartInvalidate(keys: string[]) {
  // Invalida apenas as queries específicas, não todas
  keys.forEach(key => {
    queryClient.invalidateQueries({ 
      queryKey: [key],
      exact: false,
    });
  });
}

// Helper para cache offline
export function enableOfflineSupport() {
  // Detecta mudanças de conectividade
  window.addEventListener('online', () => {
    // Refetch queries críticas ao voltar online
    queryClient.invalidateQueries();
  });
  
  window.addEventListener('offline', () => {
    // Usa apenas cache quando offline
    console.log('App está offline - usando cache');
  });
}
