import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken, refreshAccessTokenFn } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    // Add status code to error for easier checking
    (error as any).status = res.status;
    throw error;
  }
}

/**
 * Make authenticated API request with JWT token in Authorization header
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAccessToken();
  
  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  // If unauthorized (401) and we have a refresh token, try to refresh
  if (res.status === 401) {
    const newToken = await refreshAccessTokenFn();
    if (newToken) {
      // Retry request with new token
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(queryKey[0] as string, {
      headers,
    });

    // If unauthorized (401) and we have a refresh token, try to refresh
    if (res.status === 401) {
      const newToken = await refreshAccessTokenFn();
      if (newToken) {
        // Retry request with new token
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(queryKey[0] as string, {
          headers,
        });
      }
    }

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
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (increased for better caching)
      retry: false,
      // Persist cache across page reloads for better performance
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
