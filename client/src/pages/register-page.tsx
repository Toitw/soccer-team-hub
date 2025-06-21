import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "coach", "player", "colaborador"]),
  teamCode: z.string().optional(),
  agreedToTerms: z.boolean().default(true)
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get team code from URL if provided (for joining a team)
  const searchParams = new URLSearchParams(window.location.search);
  const teamCodeFromUrl = searchParams.get("code");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      role: "player",
      teamCode: teamCodeFromUrl || "",
      agreedToTerms: true
    }
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsSubmitting(true);
    try {
      // Remove teamCode if empty
      if (values.teamCode === "") {
        delete values.teamCode;
      }

      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        data: values
      });

      setUser(response);
      
      toast({
        title: "Registration successful",
        description: response.onboardingCompleted 
          ? "Welcome to Cancha+" 
          : "Let's complete your onboarding process",
      });

      // Redirect based on onboarding status
      // Adding console logging for debugging
      console.log("Registration response:", response);
      console.log("Onboarding status:", response.onboardingCompleted);
      
      // Use router's setLocation for smoother navigation that won't cause refresh loops
      console.log("Redirecting new user to onboarding");
      
      // Use setLocation that's less likely to cause refresh loops
      setLocation("/onboarding");
    } catch (error: any) {
      console.error("Registration error:", error);
      console.error("Error message:", error.message);
      console.error("Error object:", JSON.stringify(error, null, 2));
      
      let errorMessage = error.message || t('toasts.actionFailed');
      
      // Handle specific error cases with translations
      // Check various possible error structures
      const errorCode = error.error || error.message || error.code;
      console.log("Error code detected:", errorCode);
      
      if (errorCode === 'EMAIL_ALREADY_REGISTERED') {
        errorMessage = t('validation.emailAlreadyRegistered');
        console.log("Using translated message:", errorMessage);
      }
      
      toast({
        variant: "destructive",
        title: t('toasts.registrationFailed'),
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>
            Create a new account to join Cancha+
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Team Administrator</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="colaborador">Collaborator</SelectItem>
                        <SelectItem value="player">Player</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="teamCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Code (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter team code if you have one" 
                        {...field} 
                        value={field.value || ""}
                      />
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
                        I agree to the terms and conditions
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}