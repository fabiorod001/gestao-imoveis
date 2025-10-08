import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options:
    | {
        method: string;
        body?: string | FormData;
      }
    | string,
  data?: unknown | undefined,
): Promise<Response> {
  let method: string;
  let headers: Record<string, string> = {};
  let body: string | FormData | undefined;

  // Handle both old and new API formats
  if (typeof options === "string") {
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

  // Add API base URL if the URL starts with /api/
  const fullUrl = url.startsWith("/api/")
    ? `${import.meta.env.VITE_API_URL || ""}${url}`
    : url;

  const res = await fetch(fullUrl, {
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
    let url = queryKey[0] as string;

    // If queryKey[1] contains query parameters, append them to the URL
    if (queryKey[1] && typeof queryKey[1] === "object") {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryKey[1])) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }
    }

    // Add API base URL if the URL starts with /api/
    const fullUrl = url.startsWith("/api/")
      ? `${import.meta.env.VITE_API_URL || ""}${url}`
      : url;

    const res = await fetch(fullUrl, {
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
      // SUPER AGGRESSIVE CACHING FOR MAXIMUM PERFORMANCE
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh much longer
      gcTime: 60 * 60 * 1000, // 1 hour - keep cache for much longer
      retry: false,
      // Avoid unnecessary refetches
      refetchOnMount: false,
      refetchOnReconnect: "always",
      // Enable background fetching for better UX
      refetchIntervalInBackground: false,
      structuralSharing: true, // Optimize re-renders by reusing unchanged data
    },
    mutations: {
      retry: false,
      // Smart cache invalidation
      onSuccess: () => {
        // Handled case by case
      },
    },
  },
});

// OPTIMIZED CACHE CONFIGURATIONS FOR DIFFERENT DATA TYPES
export const queryOptions = {
  // Static data (properties, users, settings) - cache forever until invalidated
  static: {
    staleTime: Infinity, // Never stale
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  // Stable data (rarely changes)
  stable: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  // Dynamic data (transactions, dashboard)
  dynamic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  // Real-time data (cash flow, live updates)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  },
  // List data with pagination
  paginated: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Smooth pagination
  },
};

// Helper para prefetch de dados críticos
export async function prefetchCriticalData() {
  // Prefetch de propriedades (sempre necessárias)
  await queryClient.prefetchQuery({
    queryKey: ["/api/properties"],
    ...queryOptions.stable,
  });

  // Prefetch do usuário atual
  await queryClient.prefetchQuery({
    queryKey: ["/api/auth/user"],
    ...queryOptions.stable,
  });
}

// Helper para invalidação inteligente
export function smartInvalidate(keys: string[]) {
  // Invalida apenas as queries específicas, não todas
  keys.forEach((key) => {
    queryClient.invalidateQueries({
      queryKey: [key],
      exact: false,
    });
  });
}

// Batch fetch helper for multiple queries
export async function batchFetch(urls: string[]) {
  const promises = urls.map((url) =>
    fetch(url, { credentials: "include" }).then((r) => r.json()),
  );
  return Promise.all(promises);
}

// Optimistic update helper
export function optimisticUpdate<T>(
  queryKey: string[],
  updater: (old: T) => T,
) {
  queryClient.setQueryData(queryKey, updater);
}

// Performance monitoring
export function measureQueryPerformance() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  console.group("Query Cache Performance");
  console.log("Total queries in cache:", queries.length);
  queries.forEach((query) => {
    const state = query.state;
    console.log(query.queryKey, {
      status: state.status,
      dataUpdatedAt: state.dataUpdatedAt,
      isStale: query.isStale(),
      observerCount: query.getObserversCount(),
    });
  });
  console.groupEnd();
}

// Helper para cache offline
export function enableOfflineSupport() {
  // Detecta mudanças de conectividade
  window.addEventListener("online", () => {
    // Refetch queries críticas ao voltar online
    queryClient.invalidateQueries();
  });

  window.addEventListener("offline", () => {
    // Usa apenas cache quando offline
    console.log("App está offline - usando cache");
  });
}
