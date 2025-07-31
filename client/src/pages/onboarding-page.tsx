import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { UserRoundCog, UserRound, Users, CheckCircle, AlertCircle } from "lucide-react";
import { MemberClaimButton } from "@/components/team/MemberClaimButton";

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
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("join");
  // State to track the onboarding step
  const [onboardingStep, setOnboardingStep] = useState<"role" | "team" | "claim">("role");
  
  // State to track joined team info
  const [joinedTeam, setJoinedTeam] = useState<any>(null);
  
  // For team join form - we'll recreate the form for each step change
  const [formKey, setFormKey] = useState(0);

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

  // Join team form - recreated with unique key when step changes
  const joinTeamForm = useForm<JoinTeamFormValues>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      teamCode: "",
    },
  });

  // Create team form (for admins only)
  const createTeamForm = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      category: "AMATEUR",
      teamType: "11-a-side",
      division: "",
    },
  });

  // Effect to reset forms when step changes
  useEffect(() => {
    if (onboardingStep === "team") {
      // Increment key to force recreation of the form
      setFormKey(prev => prev + 1);
      // Reset all form values
      joinTeamForm.reset({ teamCode: "" });
    }
  }, [onboardingStep]);

  async function joinTeam(values: JoinTeamFormValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("/api/auth/onboarding/join-team", {
        method: "POST",
        data: values,
      });

      setUser(response.user);
      setJoinedTeam(response.team);

      // Mark that user just joined a team to prevent mock data creation
      window.localStorage.setItem('team_joined', Date.now().toString());

      // Force immediate cache invalidation for teams
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });

      toast({
        titleKey: "toasts.success",
        description: `${t("onboarding.joinTeam")}: ${response.team.name}`,
      });

      // Move to claiming step instead of redirecting to dashboard
      setOnboardingStep("claim");
    } catch (error: any) {
      console.error("Error joining team:", error);
      toast({
        variant: "destructive",
        titleKey: "toasts.error",
        description: error.message || t("toasts.actionFailed"),
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
      window.localStorage.setItem(
        "team_created",
        JSON.stringify({
          id: response.team.id,
          name: response.team.name,
          teamType: response.team.teamType,
          timestamp: Date.now(),
        }),
      );

      // Force immediate cache invalidation for teams
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });

      toast({
        titleKey: "toasts.teamCreated",
        descriptionKey: "toasts.teamCreatedDesc",
        descriptionParams: { name: response.team.name },
      });

      // Small delay to ensure cache invalidation completes before redirect
      setTimeout(() => {
        setLocation("/");
      }, 100);
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        variant: "destructive",
        titleKey: "toasts.teamCreateError",
        descriptionKey: "toasts.teamCreateErrorDesc",
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
      
      // Move to team step (the useEffect will handle form reset)
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

  // Verification request mutation
  const requestVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!joinedTeam) throw new Error("No team joined");
      return apiRequest(`/api/teams/${joinedTeam.id}/verification-request`, {
        method: "POST",
        data: {}
      });
    },
    onSuccess: () => {
      toast({
        titleKey: "toasts.verificationRequested",
        descriptionKey: "toasts.verificationRequestedDesc",
      });
      // Complete onboarding and redirect to dashboard
      setTimeout(() => {
        setLocation("/");
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        titleKey: "toasts.error",
        description: error.message || t("toasts.actionFailed"),
      });
    },
  });

  // Function to skip claiming and go to dashboard
  const skipClaiming = () => {
    toast({
      titleKey: "toasts.claimingSkipped",
      descriptionKey: "toasts.claimingSkippedDesc",
    });
    setTimeout(() => {
      setLocation("/");
    }, 500);
  };

  // Fetch claimable members for the joined team
  const { data: claimableMembers, isLoading: membersLoading } = useQuery({
    queryKey: [`/api/teams/${joinedTeam?.id}/members`],
    enabled: !!joinedTeam?.id && onboardingStep === "claim",
    select: (members: any[]) => {
      // Filter to only unverified members (claimable)
      return members.filter(member => !member.userId && !member.user);
    }
  });

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
              : onboardingStep === "claim"
                ? t("onboarding.claimMemberPrompt")
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
          ) : onboardingStep === "team" ? (
            isAdmin ? (
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
                {/* Use key to force complete recreation of form */}
                <div key={formKey}>
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
                              <Input placeholder="ej. D6JKN9" {...field} />
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
                </div>
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
                          <FormLabel>{t("teams.name")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("teams.teamNamePlaceholder")} {...field} />
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
                            <FormLabel>{t("teams.category")}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("teams.categoryPlaceholder")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AMATEUR">
                                    {t("teams.categories.amateur")}
                                  </SelectItem>
                                  <SelectItem value="FEDERATED">
                                    {t("teams.categories.federated")}
                                  </SelectItem>
                                  <SelectItem value="PROFESSIONAL">
                                    {t("teams.categories.professional")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createTeamForm.control}
                        name="teamType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("teams.type")}</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("teams.typePlaceholder")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="11-a-side">
                                    {t("teams.types.11aside")}
                                  </SelectItem>
                                  <SelectItem value="7-a-side">
                                    {t("teams.types.7aside")}
                                  </SelectItem>
                                  <SelectItem value="Futsal">
                                    {t("teams.types.futsal")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={createTeamForm.control}
                      name="division"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("teams.division")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("teams.divisionPlaceholder")}
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t("teams.creating")
                        : t("teams.createTeam")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          ) : (
            // Non-admin: only join team option
            <div key={formKey}>
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
                          <Input placeholder="ej. D6JKN9" {...field} />
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
                    {isSubmitting ? "Joining Team..." : t("onboarding.joinTeam")}
                  </Button>
                </form>
              </Form>
            </div>
          )
          ) : onboardingStep === "claim" ? (
            // Member claiming step
            <div className="space-y-6">
              {membersLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">{t("onboarding.loadingMembers")}</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">
                      {t("onboarding.claimMemberTitle")}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {joinedTeam?.name && t("onboarding.claimMemberDescription", { teamName: joinedTeam.name })}
                    </p>
                  </div>

                  {claimableMembers && claimableMembers.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">{t("onboarding.availableMembers")}</h4>
                      {claimableMembers.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{member.fullName}</div>
                            <div className="text-sm text-gray-600">
                              {member.role} {member.position && `• ${member.position}`} {member.jerseyNumber && `• #${member.jerseyNumber}`}
                            </div>
                          </div>
                          <MemberClaimButton member={member} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-600">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">{t("onboarding.noClaimableMembers")}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-3">{t("onboarding.cantFindYourself")}</h4>
                    <div className="space-y-3">
                      <Button
                        onClick={() => requestVerificationMutation.mutate()}
                        disabled={requestVerificationMutation.isPending}
                        variant="outline"
                        className="w-full"
                      >
                        {requestVerificationMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-current mr-2"></div>
                            {t("onboarding.requestingVerification")}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("onboarding.requestVerification")}
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={skipClaiming}
                        variant="ghost"
                        className="w-full"
                      >
                        {t("onboarding.skipForNow")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Logout option */}
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await apiRequest("/api/logout", { method: "POST" });
                  setLocation("/auth");
                } catch (error) {
                  console.error("Logout error:", error);
                  // Force logout even if API fails
                  window.location.href = "/auth";
                }
              }}
              disabled={isSubmitting}
              className="w-full"
            >
              Logout
            </Button>
          </div>

          {/* For team step, add a back button to return to role selection */}
          {onboardingStep === "team" && (
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setOnboardingStep("role")}
                disabled={isSubmitting}
              >
                {t("onboarding.backToRoleSelection")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}