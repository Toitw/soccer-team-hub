import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Almacenamiento en memoria del token CSRF
let csrfToken: string | null = null;

/**
 * Obtiene un token CSRF del servidor
 * @returns Promise con el token CSRF
 */
export async function fetchCsrfToken(): Promise<string> {
  // Si ya tenemos un token, lo devolvemos
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include', // Necesario para incluir cookies
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener el token CSRF');
    }

    const data = await response.json();
    if (!data.csrfToken) {
      throw new Error('Respuesta sin token CSRF');
    }
    
    // Guardamos el token y aseguramos que es string para TypeScript
    const token: string = data.csrfToken;
    csrfToken = token;
    return token; // Devolvemos directamente el valor obtenido
  } catch (error) {
    console.error('Error al obtener el token CSRF:', error);
    throw error;
  }
}

/**
 * Limpia el token CSRF almacenado (útil después de cerrar sesión)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Enhanced version that supports both forms of calling
export async function apiRequest<T = any>(
  methodOrUrl: string,
  urlOrData?: string | object,
  data?: unknown,
): Promise<T> {
  let method: string;
  let url: string;
  let requestData: unknown;
  
  // Handle the case where apiRequest is called with (method, url, data)
  if (urlOrData && typeof urlOrData === 'string') {
    method = methodOrUrl;
    url = urlOrData;
    requestData = data;
  } 
  // Handle the case where apiRequest is called with (url, options)
  else {
    method = 'GET';
    url = methodOrUrl;
    
    if (urlOrData && typeof urlOrData === 'object') {
      method = (urlOrData as any).method || 'GET';
      requestData = (urlOrData as any).data;
    }
  }
  
  console.log(`API Request: ${method} ${url}`, requestData);
  
  // Configuración de headers
  const headers: Record<string, string> = {};
  
  if (requestData) {
    headers["Content-Type"] = "application/json";
  }
  
  // Para métodos de modificación (no GET), añadimos el token CSRF
  // Se excluye login porque el usuario aún no está autenticado
  if (method !== 'GET' && !url.includes('/api/login')) {
    try {
      // Obtener token CSRF para solicitudes mutativas (POST, PUT, PATCH, DELETE)
      const token = await fetchCsrfToken();
      headers['CSRF-Token'] = token;
    } catch (error) {
      console.error('Error al obtener token CSRF para la solicitud:', error);
      // Continuamos con la solicitud incluso sin token CSRF
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: requestData ? JSON.stringify(requestData) : undefined,
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
