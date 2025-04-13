import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Email verification page
 * 
 * This page is responsible for verifying the user's email address via a token
 * sent to their email. It handles 3 states:
 * 1. Verifying - checking the token with the server
 * 2. Success - email verified successfully
 * 3. Error - verification failed
 */
export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  
  // Extract the token from URL query parameters
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  const [verificationState, setVerificationState] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // If no token is provided, redirect to login
    if (!token) {
      setVerificationState("error");
      setErrorMessage("No verification token provided");
      return;
    }
    
    // Verify the token with the server
    const verifyEmail = async () => {
      try {
        // Send verification request to the server
        await apiRequest(`/api/auth/verify-email/${token}`, { method: "GET" });
        
        // If successful, set state to success
        setVerificationState("success");
      } catch (error) {
        // If verification fails, set state to error
        setVerificationState("error");
        setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      }
    };
    
    verifyEmail();
  }, [token]);

  // Handle different verification states
  const renderContent = () => {
    switch (verificationState) {
      case "verifying":
        return (
          <>
            <CardHeader>
              <CardTitle>{t("auth.emailVerification")}</CardTitle>
              <CardDescription>{t("auth.verifyEmailPrompt")}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </CardContent>
            <CardFooter className="flex justify-center">
              <p>{t("common.loading")}</p>
            </CardFooter>
          </>
        );
        
      case "success":
        return (
          <>
            <CardHeader>
              <CardTitle>{t("auth.emailVerification")}</CardTitle>
              <CardDescription>{t("auth.verifyEmailSuccess")}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setLocation("/auth")}>{t("auth.login")}</Button>
            </CardFooter>
          </>
        );
        
      case "error":
        return (
          <>
            <CardHeader>
              <CardTitle>{t("auth.emailVerification")}</CardTitle>
              <CardDescription>{t("auth.verifyEmailFailed")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center items-center py-4">
                <XCircle className="h-16 w-16 text-destructive" />
              </div>
              
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTitle>{t("toasts.error")}</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setLocation("/auth")}>
                {t("auth.login")}
              </Button>
              {user && (
                <Button onClick={() => setLocation("/")}>
                  {t("navigation.dashboard")}
                </Button>
              )}
            </CardFooter>
          </>
        );
    }
  };

  return (
    <div className="container flex h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
}