import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  setUser: (user: SelectUser | null) => void;
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
    onSuccess: async (user: SelectUser) => {
      // Set the user data
      queryClient.setQueryData(["/api/user"], user);
      
      // Prefetch teams and team data immediately after login to avoid cascading delays
      setTimeout(async () => {
        try {
          console.log("Auth: Starting post-login data prefetch");
          const teams = await queryClient.fetchQuery({
            queryKey: ["/api/teams"],
            queryFn: getQueryFn({ on401: "throw" }),
            staleTime: 5 * 60 * 1000, // 5 minutes
          });
          
          // If user has teams, prefetch all related data in parallel
          if (teams && Array.isArray(teams) && teams.length > 0) {
            const firstTeam = teams[0];
            if (firstTeam?.id) {
              console.log("Auth: Prefetching data for team", firstTeam.id);
              
              // Prefetch all team data in parallel to avoid sequential loading delays
              await Promise.allSettled([
                // Events
                queryClient.prefetchQuery({
                  queryKey: ["/api/teams", firstTeam.id, "events"],
                  queryFn: async () => {
                    const response = await fetch(`/api/teams/${firstTeam.id}/events`, {
                      credentials: "include"
                    });
                    if (!response.ok) throw new Error("Failed to fetch events");
                    return await response.json();
                  },
                  staleTime: 5 * 60 * 1000,
                }),
                
                // Matches
                queryClient.prefetchQuery({
                  queryKey: ["/api/teams", firstTeam.id, "matches/recent"],
                  queryFn: getQueryFn({ on401: "throw" }),
                  staleTime: 5 * 60 * 1000,
                }),
                
                // Announcements
                queryClient.prefetchQuery({
                  queryKey: ["/api/teams", firstTeam.id, "announcements/recent"],
                  queryFn: getQueryFn({ on401: "throw" }),
                  staleTime: 5 * 60 * 1000,
                }),
                
                // Team members
                queryClient.prefetchQuery({
                  queryKey: ["/api/teams", firstTeam.id, "members"],
                  queryFn: async () => {
                    const response = await fetch(`/api/teams/${firstTeam.id}/members`, {
                      credentials: "include"
                    });
                    if (!response.ok) throw new Error("Failed to fetch team members");
                    return await response.json();
                  },
                  staleTime: 5 * 60 * 1000,
                })
              ]);
              
              console.log("Auth: Completed prefetching team data");
            }
          }
        } catch (error) {
          console.log("Auth: Prefetch failed, data will load normally:", error);
        }
      }, 100); // Small delay to allow login to complete
      
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
      return await apiRequest<SelectUser>("/api/auth/register", {
        method: "POST",
        data: credentials
      });
    },
    onSuccess: (user: SelectUser & { emailVerificationSent?: boolean }) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate all team-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", undefined, "members"] });
      queryClient.removeQueries({ queryKey: ["/api/teams", undefined, "members"] });
      
      // Note: We don't redirect here because the register-page.tsx
      // component handles the redirection based on onboardingCompleted
      // This prevents double redirecting and potential race conditions
      
      // Show different messages based on email verification status
      if (user.emailVerificationSent) {
        toast({
          titleKey: "toasts.registrationSuccess",
          descriptionKey: "toasts.verificationEmailSentDesc",
        });
      } else {
        toast({
          titleKey: "toasts.registrationSuccess",
          descriptionKey: "toasts.welcomeToTeamKick",
          descriptionParams: { name: user.fullName },
        });
      }
    },
    onError: (error: Error) => {
      // Handle specific email-related errors
      if (error.message.includes("EMAIL_SEND_FAILED")) {
        toast({
          titleKey: "toasts.emailSendFailed",
          descriptionKey: "toasts.emailSendFailedDesc",
          variant: "destructive",
        });
      } else if (error.message.includes("EMAIL_ALREADY_REGISTERED")) {
        toast({
          titleKey: "toasts.registrationFailed",
          descriptionKey: "toasts.emailAlreadyRegistered",
          variant: "destructive",
        });
      } else {
        toast({
          titleKey: "toasts.registrationFailed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", { method: "POST" });
    },
    onSuccess: () => {
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
        titleKey: "toasts.verificationEmailSent",
        descriptionKey: "toasts.verificationEmailSentDesc",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("EMAIL_SEND_FAILED")) {
        toast({
          titleKey: "toasts.emailSendFailed",
          descriptionKey: "toasts.emailSendFailedDesc",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send verification email",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Function to set the user data in the query cache
  const setUser = (userData: SelectUser | null) => {
    queryClient.setQueryData(["/api/user"], userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        setUser,
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
