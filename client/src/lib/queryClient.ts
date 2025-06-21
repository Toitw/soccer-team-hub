import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorObj;
    
    try {
      // Try to parse the response as JSON to extract error details
      errorObj = JSON.parse(text);
      console.log("Parsed error object:", errorObj);
    } catch {
      // If it's not JSON, use the text as is
      errorObj = { message: text };
    }
    
    // For registration/authentication errors, throw the parsed error directly
    if (res.url.includes('/api/auth/register') || res.url.includes('/api/login')) {
      const error = new Error(errorObj.error || errorObj.message || text);
      // Attach the parsed error data to the error object
      Object.assign(error, errorObj);
      console.log("Throwing auth error:", error);
      throw error;
    }
    
    // For other errors, use the original format
    const error = new Error(`${res.status}: ${text}`);
    Object.assign(error, errorObj);
    throw error;
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
  
  // Get user's language preference
  const userLanguage = localStorage.getItem("language") || "es";
  
  // Prepare headers with language preference
  const headers: Record<string, string> = {
    "Accept-Language": userLanguage,
  };
  
  // Add Content-Type for requests with body
  if (requestData) {
    headers["Content-Type"] = "application/json";
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
  
  // Get user's language preference
  const userLanguage = localStorage.getItem("language") || "es";
  
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Accept-Language": userLanguage
    }
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
