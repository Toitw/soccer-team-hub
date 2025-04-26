import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';

// Define the context shape
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<User>;
  updateProfile: (userData: Partial<User>) => Promise<User>;
}

// Register data validation schema
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterData = z.infer<typeof registerSchema>;

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user session
  const { data: userData, isLoading: isSessionLoading } = useQuery<User>({
    queryKey: ['/api/user'],
    retry: false,
    onError: () => {
      setIsLoading(false);
    },
    onSuccess: (data) => {
      setUser(data);
      setIsLoading(false);
    }
  });

  // Update user when data changes
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password, remember }: { username: string; password: string; remember?: boolean }) => {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, remember }),
      });
      return response.json();
    },
    onSuccess: (data: User) => {
      setUser(data);
      queryClient.setQueryData(['/api/user'], data);
      toast({
        title: 'Success',
        titleKey: 'toasts.loginSuccess',
        description: `Welcome back, ${data.fullName}!`,
        descriptionKey: 'toasts.welcomeBack',
        descriptionParams: { name: data.fullName },
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        titleKey: 'toasts.error',
        description: error.message || 'Login failed. Please check your credentials.',
        descriptionKey: 'toasts.loginFailed',
        variant: 'destructive',
      });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response.json();
    },
    onSuccess: (data: User) => {
      setUser(data);
      queryClient.setQueryData(['/api/user'], data);
      toast({
        title: 'Success',
        titleKey: 'toasts.registrationSuccess',
        description: `Welcome to TeamKick, ${data.fullName}!`,
        descriptionKey: 'toasts.welcomeToTeamKick',
        descriptionParams: { name: data.fullName },
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        titleKey: 'toasts.error',
        description: error.message || 'Registration failed.',
        descriptionKey: 'toasts.registrationFailed',
        variant: 'destructive',
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(['/api/user'], null);
      queryClient.invalidateQueries();
      toast({
        title: 'Success',
        titleKey: 'toasts.logoutSuccess',
        description: 'You have been logged out successfully.',
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const response = await apiRequest('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });
      return response.json();
    },
    onSuccess: (data: User) => {
      setUser(data);
      queryClient.setQueryData(['/api/user'], data);
      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully.',
      });
    }
  });

  // Login function
  const login = async (username: string, password: string, remember?: boolean) => {
    return loginMutation.mutateAsync({ username, password, remember });
  };

  // Logout function
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Register function
  const register = async (userData: RegisterData) => {
    return registerMutation.mutateAsync(userData);
  };

  // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    return updateProfileMutation.mutateAsync(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: isSessionLoading,
        login,
        logout,
        register,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}