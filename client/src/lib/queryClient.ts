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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      queryFn: async ({ queryKey }) => {
        // Default fetch function for queries that use URL in queryKey[0]
        const url = queryKey[0] as string;
        if (typeof url === 'string' && url.startsWith('/api/')) {
          const res = await fetch(url, {
            credentials: "include",
          });
          
          if (res.status === 401) {
            throw new Error(`401: Unauthorized`);
          }
          
          if (!res.ok) {
            const text = (await res.text()) || res.statusText;
            throw new Error(`${res.status}: ${text}`);
          }
          
          return await res.json();
        }
        
        throw new Error('Invalid query - must provide queryFn or use API URL in queryKey[0]');
      },
    },
    mutations: {
      retry: false,
    },
  },
});
