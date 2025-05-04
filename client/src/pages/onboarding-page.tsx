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

// Schema for joining a team
const joinTeamSchema = z.object({
  teamCode: z.string().min(1, "Team code is required")
});

type JoinTeamFormValues = z.infer<typeof joinTeamSchema>;

// Schema for creating a team
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  category: z.enum(["PROFESSIONAL", "FEDERATED", "AMATEUR"]),
  teamType: z.enum(["11-a-side", "7-a-side", "Futsal"]),
  division: z.string().optional(),
  seasonYear: z.string().optional()
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

export default function OnboardingPage() {
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
    }
  });

  async function joinTeam(values: JoinTeamFormValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("/api/auth/onboarding/join-team", {
        method: "POST",
        body: JSON.stringify(values)
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
        body: JSON.stringify(values)
      });

      setUser(response.user);
      
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
      const response = await apiRequest("/api/auth/onboarding/complete", {
        method: "POST"
      });

      setUser(response);
      
      toast({
        title: "Onboarding completed",
        description: "You can join or create a team later from your profile.",
      });

      // Redirect to dashboard
      setLocation("/");
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

  // Redirect if user is not logged in or already completed onboarding
  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (user.onboardingCompleted) {
    setLocation("/");
    return null;
  }

  // Show only join tab for non-admins
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Cancha+</CardTitle>
          <CardDescription>
            {isAdmin 
              ? "Join an existing team or create your own"
              : "Join your team to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">Join Team</TabsTrigger>
                <TabsTrigger value="create">Create Team</TabsTrigger>
              </TabsList>
              
              <TabsContent value="join">
                <Form {...joinTeamForm}>
                  <form onSubmit={joinTeamForm.handleSubmit(joinTeam)} className="space-y-4 mt-4">
                    <FormField
                      control={joinTeamForm.control}
                      name="teamCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your team code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Joining Team..." : "Join Team"}
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
                          <FormLabel>Team Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter team name" {...field} />
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
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                                <SelectItem value="FEDERATED">Federated</SelectItem>
                                <SelectItem value="AMATEUR">Amateur</SelectItem>
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
                            <FormLabel>Team Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="11-a-side">11-a-side</SelectItem>
                                <SelectItem value="7-a-side">7-a-side</SelectItem>
                                <SelectItem value="Futsal">Futsal</SelectItem>
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
                            <FormLabel>Division (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., First Division" {...field} value={field.value || ""} />
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
                            <FormLabel>Season Year</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 2023" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Creating Team..." : "Create Team"}
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
                      <FormLabel>Team Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your team code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Joining Team..." : "Join Team"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="ghost" onClick={skipOnboarding} disabled={isSubmitting}>
            Skip for now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}