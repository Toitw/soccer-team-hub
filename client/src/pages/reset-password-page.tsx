/**
 * Password Reset Page
 * 
 * This page allows users to reset their password via a token received by email.
 * It handles 3 states:
 * 1. Token validation - checking if the token is valid
 * 2. Password reset form - allowing the user to set a new password
 * 3. Success/error - showing the result of the password reset attempt
 */

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import LanguageSelector from "@/components/language-selector";

// Password reset form schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Component states
type ResetState = "validating" | "resetting" | "success" | "error";

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [resetState, setResetState] = useState<ResetState>("validating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [token, setToken] = useState<string>("");

  // Extract token from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
      setResetState("resetting");
    } else {
      setResetState("error");
      setErrorMessage("No reset token provided. Please check your email link and try again.");
    }
  }, [location]);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { currentLanguage } = useLanguage();

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": currentLanguage
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setResetState("success");
        toast({
          title: t('auth.passwordResetSuccess'),
          description: t('auth.passwordResetSuccessMessage'),
        });
      } else {
        setResetState("error");
        setErrorMessage(result.error || "Failed to reset password");
        toast({
          variant: "destructive",
          title: t('auth.passwordResetError'),
          description: result.error || t('auth.passwordResetErrorMessage'),
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setResetState("error");
      setErrorMessage("Failed to connect to the server. Please try again.");
      toast({
        variant: "destructive",
        title: t('auth.passwordResetError'),
        description: t('auth.passwordResetErrorNetwork'),
      });
    }
  };

  // Render different content based on state
  const renderContent = () => {
    switch (resetState) {
      case "validating":
        return (
          <div className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center text-muted-foreground">
              {t('auth.validatingResetToken')}
            </p>
          </div>
        );

      case "resetting":
        return (
          <>
            <CardHeader>
              <CardTitle>{t('auth.resetPassword')}</CardTitle>
              <CardDescription>
                {t('auth.resetPasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.newPassword')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={t('auth.newPassword')} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={t('auth.confirmPassword')} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.resettingPassword')}
                      </>
                    ) : (
                      t('auth.resetPassword')
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        );

      case "success":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">{t('auth.passwordResetSuccess')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <p className="mb-6">{t('auth.passwordResetSuccessMessage')}</p>
                <Button asChild className="w-full">
                  <Link href="/auth">{t('auth.returnToLogin')}</Link>
                </Button>
              </div>
            </CardContent>
          </>
        );

      case "error":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">{t('auth.passwordResetError')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertTitle>{t('auth.error')}</AlertTitle>
                <AlertDescription>
                  {errorMessage || t('auth.passwordResetErrorMessage')}
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-4">
                <Button asChild variant="outline">
                  <Link href="/auth?tab=login">{t('auth.returnToLogin')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth?tab=register">{t('auth.createAccount')}</Link>
                </Button>
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <Card className="w-full max-w-md">
        {renderContent()}
        <CardFooter className="flex justify-center border-t pt-6">
          <p className="text-sm text-muted-foreground">
            {t('auth.needHelp')} <a href="mailto:support@example.com" className="text-primary hover:underline">{t('auth.contactSupport')}</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}