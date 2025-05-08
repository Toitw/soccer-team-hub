import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Redirect, Link } from "wouter";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  loginSchema, 
  registerSchema, 
  LoginFormData, 
  RegisterFormData 
} from "@/lib/validation-schemas";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("login");

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row overflow-hidden bg-white rounded-lg shadow-lg">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 p-6">
          <div className="mb-6 flex items-center justify-center lg:justify-start">
            <h1 className="text-2xl font-bold text-primary flex items-center">
              Cancha 
              <span className="relative ml-2 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 hover:animate-spin transition-all duration-300">
                <span className="absolute inset-0 rounded-full border-2 border-primary-foreground"></span>
                <span className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-primary-foreground transform -translate-x-1/2 -translate-y-1/2"></span>
                <span className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-primary-foreground transform -translate-x-1/2 -translate-y-1/2"></span>
                <span className="absolute top-1/2 left-0 w-1 h-1 bg-primary-foreground rounded-full transform -translate-y-1/2"></span>
                <span className="absolute top-0 left-1/2 w-1 h-1 bg-primary-foreground rounded-full transform -translate-x-1/2"></span>
                <span className="absolute top-1/2 right-0 w-1 h-1 bg-primary-foreground rounded-full transform -translate-y-1/2"></span>
                <span className="absolute bottom-0 left-1/2 w-1 h-1 bg-primary-foreground rounded-full transform -translate-x-1/2"></span>
              </span>
            </h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Side - Hero */}
        <div className="hidden lg:block lg:w-1/2 bg-primary text-white p-12">
          <div className="h-full flex flex-col justify-center">
            <h2 className="text-3xl font-bold mb-4">{t('landingPage.heroTitle')}</h2>
            <p className="mb-6">{t('landingPage.heroSubtitle')}</p>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-white/20 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-lg">{t('landingPage.teamManagement')}</h3>
                  <p className="text-sm opacity-80">{t('landingPage.teamManagementDesc')}</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-white/20 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-lg">{t('landingPage.performanceTracking')}</h3>
                  <p className="text-sm opacity-80">{t('landingPage.performanceTrackingDesc')}</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-white/20 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-lg">{t('landingPage.eventManagement')}</h3>
                  <p className="text-sm opacity-80">{t('landingPage.eventManagementDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const { t } = useLanguage();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.welcome')}</CardTitle>
        <CardDescription>{t('auth.loginPrompt')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.username')}</FormLabel>
                  <FormControl>
                    <Input placeholder={`${t('auth.username')}...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder={`${t('auth.password')}...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.loggingIn')}
                </>
              ) : t('auth.login')}
            </Button>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {t('auth.dontHaveAccount')}{" "}
                <Link href="/register" className="text-primary hover:underline">
                  {t('auth.registerHere')}
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const { t } = useLanguage();
  

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "player",
      email: "",
      joinCode: "",
      agreedToTerms: false,
    },
  });

  

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.createAccount')}</CardTitle>
        <CardDescription>{t('auth.registerPrompt')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fullName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={`${t('auth.fullName')}...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.username')}</FormLabel>
                  <FormControl>
                    <Input placeholder={`${t('auth.username')}...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => {
                // Ensure field.value is always a string
                const safeValue = typeof field.value === 'string' ? field.value : '';
                return (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder={`${t('auth.email')}...`} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        name={field.name}
                        value={safeValue}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.role')}</FormLabel>
                  <FormControl>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="player">{t('auth.player')}</option>
                      <option value="coach">{t('auth.coach')}</option>
                      <option value="admin">{t('auth.admin')}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={`${t('auth.password')}...`} {...field} />
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
                    <Input type="password" placeholder={`${t('auth.confirmPassword')}...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="agreedToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-1 rounded"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('auth.agreeToTerms')}
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Alert variant="destructive" className="mt-4 mb-2">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>
                {t('auth.emailVerification')}
              </AlertDescription>
            </Alert>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.registering')}
                </>
              ) : t('auth.register')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}