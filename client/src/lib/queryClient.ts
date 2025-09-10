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

// Removed old getQueryFn - now using inline function in QueryClient

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Removemos o queryFn padrão - todas as queries devem ter sua própria queryFn
    },
    mutations: {
      retry: false,
    },
  },
});
