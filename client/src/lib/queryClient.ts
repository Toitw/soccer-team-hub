import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
  },
): Promise<T> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return the original response for authentication responses
  if (url.includes('/api/login') || url.includes('/api/register')) {
    try {
      return await res.json() as T;
    } catch (error) {
      console.error('Error parsing authentication response:', error);
      return {} as T;  // Return empty object rather than failing
    }
  }
  
  // For admin endpoints, ensure we always return an array
  if (url.includes('/api/admin/users') || url.includes('/api/admin/teams')) {
    try {
      const data = await res.json();
      // If the response isn't an array, wrap it in an array
      return (Array.isArray(data) ? data : (data ? [data] : [])) as T;
    } catch (error) {
      console.warn(`Could not parse JSON from admin endpoint ${url}:`, error);
      return [] as unknown as T;  // Return empty array for admin endpoints
    }
  }
  
  // For empty responses
  if (res.status === 204) {
    return {} as T;
  }
  
  // For all other responses, attempt to parse JSON
  try {
    return await res.json() as T;
  } catch (error) {
    console.warn(`Could not parse JSON from ${url}:`, error);
    return {} as T;  // Return empty object rather than failing
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <TData = any>({ on401: unauthorizedBehavior }: {
  on401: UnauthorizedBehavior;
}): QueryFunction<TData> => async ({ queryKey }) => {
  const url = queryKey[0] as string;
  const res = await fetch(url, {
    credentials: "include",
  });

  if (unauthorizedBehavior === "returnNull" && res.status === 401) {
    return null as any;
  }

  await throwIfResNotOk(res);
  
  // For empty responses
  if (res.status === 204) {
    return {} as TData;
  }
  
  // For admin endpoints, ensure we always return an array
  if (url.includes('/api/admin/users') || url.includes('/api/admin/teams')) {
    try {
      const data = await res.json();
      // If the response isn't an array, wrap it in an array
      return (Array.isArray(data) ? data : (data ? [data] : [])) as TData;
    } catch (error) {
      console.warn(`getQueryFn: Could not parse JSON from admin endpoint ${url}:`, error);
      return [] as unknown as TData;  // Return empty array for admin endpoints
    }
  }
  
  try {
    return await res.json() as TData;
  } catch (error) {
    console.warn(`getQueryFn: Could not parse JSON from ${url}:`, error);
    return {} as TData;  // Return empty object rather than failing
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
