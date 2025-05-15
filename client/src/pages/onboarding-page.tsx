import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";

// Schema for joining a team
const joinTeamSchema = z.object({
  teamCode: z.string().min(1, "Team code is required")
});

type JoinTeamFormValues = z.infer<typeof joinTeamSchema>;

// Schema for creating a team
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  category: z.enum(["PROFESSIONAL", "FEDERATED", "AMATEUR"]),
  teamType: z.enum(["11-a-side", "7-a-side", "Futsal"]).default("11-a-side"),
  division: z.string().optional(),
  seasonYear: z.string().optional()
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("join");

  // Join team form
  const joinTeamForm = useForm<JoinTeamFormValues>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      teamCode: ""
    }
  });

  // Create team form (for admins only)
  const createTeamForm = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      category: "AMATEUR",
      teamType: "11-a-side",
      division: "",
      seasonYear: new Date().getFullYear().toString()
      // Logo is not part of the form schema, removed to fix type error
    }
  });

  async function joinTeam(values: JoinTeamFormValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("/api/auth/onboarding/join-team", {
        method: "POST",
        data: values
      });

      setUser(response.user);

      toast({
        title: "Team joined successfully",
        description: `You have joined ${response.team.name}. Welcome to the team!`,
      });

      // Redirect to dashboard
      setLocation("/");
    } catch (error: any) {
      console.error("Error joining team:", error);
      toast({
        variant: "destructive",
        title: "Failed to join team",
        description: error.message || "Invalid team code or server error. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createTeam(values: CreateTeamFormValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("/api/auth/onboarding/create-team", {
        method: "POST",
        data: values
      });

      setUser(response.user);

      // Force cache invalidation to refresh team list
      // This ensures the new team data (with correct teamType) is loaded
      window.localStorage.setItem('team_created', JSON.stringify({
        id: response.team.id,
        name: response.team.name,
        teamType: response.team.teamType,
        timestamp: Date.now()
      }));

      toast({
        title: "Team created successfully",
        description: `Your team "${response.team.name}" has been created! Team code: ${response.team.joinCode}`,
      });

      // Redirect to dashboard
      setLocation("/");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        variant: "destructive",
        title: "Failed to create team",
        description: error.message || "Something went wrong. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function skipOnboarding() {
    setIsSubmitting(true);
    try {
      // Still mark onboarding as complete in the backend
      const response = await apiRequest("/api/auth/onboarding/complete", {
        method: "POST"
      });

      setUser(response);

      toast({
        title: "Demo Mode Activated",
        description: "You're now viewing the app in demo mode. Create your team when you're ready!",
      });

      // Redirect to mock page instead of dashboard
      setLocation("/mock");
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show loading state while fetching user data
  const { isLoading } = useAuth();

  // Only proceed with redirects when we're sure about the user state
  if (!isLoading) {
    // Adding logging for debugging  
    console.log("Onboarding page - Current user:", user);

    if (!user) {
      console.log("No user found, redirecting to auth page");
      // Use setLocation instead of direct window.location to prevent refresh loops
      setLocation("/auth");
      return null;
    }

    // Only redirect if they didn't come from the mock page
    const urlParams = new URLSearchParams(window.location.search);
    const fromMock = urlParams.get('fromMock') === 'true';

    if (user.onboardingCompleted && !fromMock) {
      console.log("User already completed onboarding, redirecting to dashboard");
      // Use setLocation instead of direct window.location to prevent refresh loops
      setLocation("/");
      return null;
    }

    console.log("User needs to complete onboarding, staying on page");
  } else {
    // Show loading indicator when we're still determining user state
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  // Show only join tab for non-admins
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">{t("onboarding.welcome")}</CardTitle>
            <CardDescription>
              {isAdmin 
                ? t("auth.joinCodeHelp")
                : t("onboarding.joinTeamPrompt")}
            </CardDescription>
          </CardHeader>
        <CardContent>
          {isAdmin ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">{t("onboarding.joinTeam")}</TabsTrigger>
                <TabsTrigger value="create">{t("onboarding.createTeam")}</TabsTrigger>
              </TabsList>

              <TabsContent value="join">
                <Form {...joinTeamForm}>
                  <form onSubmit={joinTeamForm.handleSubmit(joinTeam)} className="space-y-4 mt-4">
                    <FormField
                      control={joinTeamForm.control}
                      name="teamCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.teamCode")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("onboarding.teamCode")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Joining Team..." : t("onboarding.joinTeam")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="create">
                <Form {...createTeamForm}>
                  <form onSubmit={createTeamForm.handleSubmit(createTeam)} className="space-y-4 mt-4">
                    <FormField
                      control={createTeamForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.teamName")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("matches.enterTeamName")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createTeamForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("onboarding.category")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("matches.selectMatchType")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PROFESSIONAL">{t("onboarding.categoryTypes.professional")}</SelectItem>
                                <SelectItem value="FEDERATED">{t("onboarding.categoryTypes.federated")}</SelectItem>
                                <SelectItem value="AMATEUR">{t("onboarding.categoryTypes.amateur")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createTeamForm.control}
                        name="teamType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("onboarding.teamType")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("team.selectPosition")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="11-a-side">{t("onboarding.teamTypes.elevenASide")}</SelectItem>
                                <SelectItem value="7-a-side">{t("onboarding.teamTypes.sevenASide")}</SelectItem>
                                <SelectItem value="Futsal">{t("onboarding.teamTypes.futsal")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createTeamForm.control}
                        name="division"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("onboarding.division")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("onboarding.divisionPlaceholder")} {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createTeamForm.control}
                        name="seasonYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("onboarding.seasonYear")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("onboarding.seasonYearPlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? t("matches.deleting") : t("onboarding.createTeam")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          ) : (
            <Form {...joinTeamForm}>
              <form onSubmit={joinTeamForm.handleSubmit(joinTeam)} className="space-y-4">
                <FormField
                  control={joinTeamForm.control}
                  name="teamCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("onboarding.teamCode")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("onboarding.teamCode")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t("matches.deleting") : t("onboarding.joinTeam")}
                </Button>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      // Complete onboarding and redirect to mock page
                      apiRequest("/api/auth/onboarding/complete", {
                        method: "POST"
                      }).then(() => {
                        window.location.href = '/mock';
                      }).catch(error => {
                        console.error("Error activating demo mode:", error);
                      });
                    }}
                    disabled={isSubmitting}
                  >
                    {t("onboarding.tryDemoMode")}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {t("onboarding.exploreFeatures")}
                  </p>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={skipOnboarding} disabled={isSubmitting}>
            {t("onboarding.skipForNow")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}