import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { UserRoundCog, UserRound, Users, HelpCircle } from "lucide-react";

// Schema for user role selection
const userRoleSchema = z.object({
  role: z.enum(["player", "coach", "admin", "colaborador", "superuser"]),
});

type UserRoleFormValues = z.infer<typeof userRoleSchema>;

// Schema for joining a team
const joinTeamSchema = z.object({
  teamCode: z.string().min(1, "Team code is required"),
});

type JoinTeamFormValues = z.infer<typeof joinTeamSchema>;

// Schema for creating a team
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  category: z.enum(["PROFESSIONAL", "FEDERATED", "AMATEUR"]),
  teamType: z.enum(["11-a-side", "7-a-side", "Futsal"]).default("11-a-side"),
  division: z.string().optional(),
  // seasonYear field removed as per requirements
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("join");
  // New state to track the onboarding step
  const [onboardingStep, setOnboardingStep] = useState<"role" | "team">("role");

  // Role selection form
  const roleForm = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      role:
        (user?.role as
          | "player"
          | "coach"
          | "admin"
          | "colaborador"
          | "superuser") || "player",
    },
  });

  // Local state for team code input
  const [teamCodeInput, setTeamCodeInput] = useState("");
  
  // Join team form
  const joinTeamForm = useForm<JoinTeamFormValues>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      teamCode: "",
    },
    mode: "onChange"
  });

  // Create team form (for admins only)
  const createTeamForm = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      category: "AMATEUR",
      teamType: "11-a-side",
      division: "",
      // seasonYear removed as per requirements
      // Logo is not part of the form schema, removed to fix type error
    },
  });

  async function joinTeam(values: JoinTeamFormValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("/api/auth/onboarding/join-team", {
        method: "POST",
        data: values,
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
        description:
          error.message ||
          "Invalid team code or server error. Please try again.",
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
        data: values,
      });

      setUser(response.user);

      // Force cache invalidation to refresh team list
      // This ensures the new team data (with correct teamType) is loaded
      window.localStorage.setItem(
        "team_created",
        JSON.stringify({
          id: response.team.id,
          name: response.team.name,
          teamType: response.team.teamType,
          timestamp: Date.now(),
        }),
      );

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
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRole(values: UserRoleFormValues) {
    setIsSubmitting(true);
    try {
      // Update user role
      const response = await apiRequest("/api/auth/onboarding/update-role", {
        method: "POST",
        data: values,
      });

      // Update user state with new role
      setUser(response);
      
      // Reset the team code input state completely
      setTeamCodeInput("");
      
      // Unregister the field to completely remove it from form state
      joinTeamForm.unregister("teamCode");
      
      // Create a new instance of the join team form
      joinTeamForm.reset({ teamCode: "" });
      
      // Move to team step
      setOnboardingStep("team");

      // If role is admin, default to create tab
      if (values.role === "admin") {
        setActiveTab("create");
      }
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
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
        method: "POST",
      });

      setUser(response);

      toast({
        title: "Demo Mode Activated",
        description:
          "You're now viewing the app in demo mode. Create your team when you're ready!",
      });

      // Redirect to mock page instead of dashboard
      setLocation("/mock");
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
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
    const fromMock = urlParams.get("fromMock") === "true";

    if (user.onboardingCompleted && !fromMock) {
      console.log(
        "User already completed onboarding, redirecting to dashboard",
      );
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
          <CardTitle className="text-2xl font-bold">
            {t("onboarding.welcome")}
          </CardTitle>
          <CardDescription>
            {onboardingStep === "role"
              ? t("onboarding.roleSelectionTitle")
              : isAdmin
                ? t("auth.joinCodeHelp")
                : t("onboarding.joinTeamPrompt")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onboardingStep === "role" ? (
            // Role selection step
            <Form {...roleForm}>
              <form
                onSubmit={roleForm.handleSubmit(submitRole)}
                className="space-y-6"
              >
                <FormField
                  control={roleForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 gap-6">
                        <div
                          className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                            field.value === "player"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => field.onChange("player")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-full">
                              <UserRound className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {t("auth.player")}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {t("onboarding.roleDescriptions.player")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                            field.value === "coach"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => field.onChange("coach")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-full">
                              <UserRoundCog className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">{t("auth.coach")}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t("onboarding.roleDescriptions.coach")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                            field.value === "admin"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => field.onChange("admin")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-full">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">{t("auth.admin")}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t("onboarding.roleDescriptions.admin")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("onboarding.saving")
                    : t("onboarding.continue")}
                </Button>
              </form>
            </Form>
          ) : isAdmin ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">
                  {t("onboarding.joinTeam")}
                </TabsTrigger>
                <TabsTrigger value="create">
                  {t("onboarding.createTeam")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="join">
                <Form {...joinTeamForm}>
                  <form
                    onSubmit={joinTeamForm.handleSubmit(joinTeam)}
                    className="space-y-4 mt-4"
                  >
                    <FormField
                      control={joinTeamForm.control}
                      name="teamCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.teamCode")}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="ej. D6JKN9"
                              value={teamCodeInput}
                              onChange={(e) => {
                                setTeamCodeInput(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Joining Team..."
                        : t("onboarding.joinTeam")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="create">
                <Form {...createTeamForm}>
                  <form
                    onSubmit={createTeamForm.handleSubmit(createTeam)}
                    className="space-y-4 mt-4"
                  >
                    <FormField
                      control={createTeamForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("onboarding.teamName")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("matches.enterTeamName")}
                              {...field}
                            />
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
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("matches.selectMatchType")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PROFESSIONAL">
                                  {t("onboarding.categoryTypes.professional")}
                                </SelectItem>
                                <SelectItem value="FEDERATED">
                                  {t("onboarding.categoryTypes.federated")}
                                </SelectItem>
                                <SelectItem value="AMATEUR">
                                  {t("onboarding.categoryTypes.amateur")}
                                </SelectItem>
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
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("team.selectPosition")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="11-a-side">
                                  {t("onboarding.teamTypes.elevenASide")}
                                </SelectItem>
                                <SelectItem value="7-a-side">
                                  {t("onboarding.teamTypes.sevenASide")}
                                </SelectItem>
                                <SelectItem value="Futsal">
                                  {t("onboarding.teamTypes.futsal")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mb-4">
                      <FormField
                        control={createTeamForm.control}
                        name="division"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("onboarding.division")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "onboarding.divisionPlaceholder",
                                )}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t("matches.deleting")
                        : t("onboarding.createTeam")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          ) : (
            <Form {...joinTeamForm}>
              <form
                onSubmit={joinTeamForm.handleSubmit(joinTeam)}
                className="space-y-4"
              >
                <FormField
                  control={joinTeamForm.control}
                  name="teamCode"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>{t("onboarding.teamCode")}</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {t("auth.teamCodeHelp") ||
                                  "Contact the team administrator to get the join code"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="ej. D6JKN9"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("matches.deleting")
                    : t("onboarding.joinTeam")}
                </Button>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Complete onboarding and redirect to mock page
                      apiRequest("/api/auth/onboarding/complete", {
                        method: "POST",
                      })
                        .then(() => {
                          window.location.href = "/mock";
                        })
                        .catch((error) => {
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
          {onboardingStep === "role" ? (
            <Button
              variant="ghost"
              onClick={skipOnboarding}
              disabled={isSubmitting}
            >
              {t("onboarding.skipForNow")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setOnboardingStep("role")}
              disabled={isSubmitting}
            >
              {t("onboarding.backToRoleSelection")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}