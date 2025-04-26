import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';
import { z } from 'zod';
import { useToast } from './use-toast';

// Type definitions
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<User>;
  updateProfile: (userData: Partial<User>) => Promise<User>;
}

// Register form validation schema
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  position: z.string().optional(),
  jerseyNumber: z.number().optional(),
  phoneNumber: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterData = z.infer<typeof registerSchema>;

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is logged in on mount
  const { data, isLoading: isSessionLoading } = useQuery({
    queryKey: ['/api/auth/session'],
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Update user state when session data is fetched
  useEffect(() => {
    if (!isSessionLoading) {
      setUser(data || null);
      setIsLoading(false);
    }
  }, [data, isSessionLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password, remember = false }: { username: string, password: string, remember: boolean }) => {
      return apiRequest('/api/auth/login', {
        method: 'POST',
        data: { username, password, remember },
      });
    },
    onSuccess: (data: User) => {
      setUser(data);
      queryClient.setQueryData(['/api/auth/session'], data);
      toast({
        title: 'Login successful',
        description: `Welcome back, ${data.fullName || data.username}!`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid username or password',
        variant: 'destructive',
      });
      throw error;
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      return apiRequest('/api/auth/register', {
        method: 'POST',
        data: userData,
      });
    },
    onSuccess: (data: User) => {
      setUser(data);
      queryClient.setQueryData(['/api/auth/session'], data);
      toast({
        title: 'Registration successful',
        description: `Welcome, ${data.fullName || data.username}!`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
      throw error;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      return apiRequest('/api/auth/profile', {
        method: 'PATCH',
        data: userData,
      });
    },
    onSuccess: (data: User) => {
      setUser(data);
      queryClient.setQueryData(['/api/auth/session'], data);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Profile update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
      throw error;
    },
  });

  // Logout function
  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      setUser(null);
      queryClient.setQueryData(['/api/auth/session'], null);
      queryClient.invalidateQueries();
      toast({
        title: 'Logout successful',
        description: 'You have been logged out',
        variant: 'default',
      });
    } catch (error) {
      console.error('Logout failed', error);
      toast({
        title: 'Logout failed',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Login function
  const login = async (username: string, password: string, remember = false) => {
    return loginMutation.mutateAsync({ username, password, remember });
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
        isLoading,
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

// Hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}