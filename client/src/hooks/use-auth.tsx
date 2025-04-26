import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, clearCsrfToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  requestVerificationEmail: UseMutationResult<void, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // First clear any stale data
      queryClient.clear();
      
      // apiRequest already returns the parsed JSON response
      return await apiRequest<SelectUser>("/api/login", { 
        method: "POST", 
        data: credentials 
      });
    },
    onSuccess: (user: SelectUser) => {
      // Set the user data
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate all team-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", undefined, "members"] });
      queryClient.removeQueries({ queryKey: ["/api/teams", undefined, "members"] });
      
      toast({
        titleKey: "toasts.loginSuccess",
        descriptionKey: "toasts.welcomeBack",
        descriptionParams: { name: user.fullName },
      });
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.loginFailed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      // apiRequest already returns the parsed JSON response
      return await apiRequest<SelectUser>("/api/register", {
        method: "POST",
        data: credentials
      });
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate all team-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", undefined, "members"] });
      queryClient.removeQueries({ queryKey: ["/api/teams", undefined, "members"] });
      
      toast({
        titleKey: "toasts.registrationSuccess",
        descriptionKey: "toasts.welcomeToTeamKick",
        descriptionParams: { name: user.fullName },
      });
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.registrationFailed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", { method: "POST" });
    },
    onSuccess: () => {
      // Limpiar el token CSRF almacenado
      clearCsrfToken();
      
      // Clear all cached queries to ensure fresh data on login
      queryClient.clear();
      
      // Set the user to null
      queryClient.setQueryData(["/api/user"], null);
      
      // Force reload the window to ensure a clean state
      window.location.href = "/auth";
      
      toast({
        titleKey: "toasts.logoutSuccess",
        descriptionKey: "toasts.logoutSuccess",
      });
    },
    onError: (error: Error) => {
      toast({
        titleKey: "toasts.error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Email verification mutation
  const requestVerificationEmail = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/auth/verify-email/request", { method: "POST" });
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification email",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send verification email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAuthenticated: !!user,
        loginMutation,
        logoutMutation,
        registerMutation,
        requestVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
