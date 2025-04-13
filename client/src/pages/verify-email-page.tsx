import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export default function VerifyEmailPage() {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Extract the verification token from the URL query parameters
  const getToken = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  };

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = getToken();
        
        if (!token) {
          setVerificationStatus("error");
          setErrorMessage("Verification token is missing");
          return;
        }

        // Call the API to verify the email
        const response = await fetch(`/api/auth/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          setVerificationStatus("success");
        } else {
          setVerificationStatus("error");
          setErrorMessage(data.error || "Failed to verify email");
        }
      } catch (error) {
        console.error("Error verifying email:", error);
        setVerificationStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    };

    verifyEmail();
  }, []);

  const handleGoToLogin = () => {
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.emailVerification')}</CardTitle>
          <CardDescription>
            {verificationStatus === "loading" && t('auth.verifyingEmail')}
            {verificationStatus === "success" && t('auth.emailVerifiedSuccess')}
            {verificationStatus === "error" && t('auth.emailVerificationFailed')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4">
            {verificationStatus === "loading" && (
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            )}
            {verificationStatus === "success" && (
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            )}
            {verificationStatus === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mb-4" />
                <p className="text-red-500 mt-2">{errorMessage}</p>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleGoToLogin}>
            {verificationStatus === "success" 
              ? t('auth.proceedToLogin') 
              : t('auth.backToLogin')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}