/**
 * Forgot Password Page
 * 
 * This page allows users to request a password reset email.
 * It provides a form to enter an email address to receive the reset link.
 */

import { useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import LanguageSelector from "@/components/language-selector";

// Password reset request schema
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" })
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Component states
type RequestState = "form" | "sending" | "success" | "error";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [requestState, setRequestState] = useState<RequestState>("form");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const { currentLanguage } = useLanguage();
  
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setRequestState("sending");
      
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": currentLanguage
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setRequestState("error");
        setErrorMessage(result.message || "An error occurred while requesting a password reset");
        return;
      }

      setRequestState("success");
    } catch (error) {
      setRequestState("error");
      setErrorMessage("Network error. Please check your connection and try again.");
      console.error("Password reset request error:", error);
    }
  };

  const renderContent = () => {
    switch (requestState) {
      case "form":
        return (
          <>
            <CardHeader>
              <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
              <CardDescription>
                {t('auth.forgotPasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.emailAddress')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder={t('auth.emailPlaceholder')} 
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
                        {t('auth.sending')}
                      </>
                    ) : t('auth.sendResetLink')}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" asChild className="gap-2">
                <Link href="/auth">
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.backToLogin')}
                </Link>
              </Button>
            </CardFooter>
          </>
        );
      
      case "sending":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">{t('auth.processingRequest')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-center">{t('auth.sendingResetLink')}</p>
              </div>
            </CardContent>
          </>
        );
      
      case "success":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">{t('auth.resetLinkSent')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <p className="mb-6">{t('auth.resetLinkSentMessage')}</p>
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
              <CardTitle className="text-center">{t('auth.requestError')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertTitle>{t('auth.error')}</AlertTitle>
                <AlertDescription>
                  {errorMessage || t('auth.resetRequestErrorMessage')}
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={() => setRequestState("form")} 
                  className="w-full"
                >
                  {t('auth.tryAgain')}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/auth">{t('auth.returnToLogin')}</Link>
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
        {requestState !== "form" && requestState !== "sending" && (
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {t('auth.needHelp')} <a href="mailto:support@example.com" className="text-primary hover:underline">{t('auth.contactSupport')}</a>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}