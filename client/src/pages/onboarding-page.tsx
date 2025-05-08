import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeam } from "@/hooks/use-team";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { activeTeam } = useTeam();
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const fromMock = new URLSearchParams(search).get("fromMock") === "true";

  // If user already has a team, redirect to dashboard
  useEffect(() => {
    if (activeTeam && !fromMock) {
      setLocation("/");
    }
  }, [activeTeam, setLocation, fromMock]);

  const createTeam = async () => {
    setIsCreatingTeam(true);
    try {
      const response = await apiRequest("/api/teams/setup", {
        method: "POST",
      });

      if (response) {
        toast({
          title: "Team created!",
          description: "Welcome to your new team dashboard",
        });
        setLocation("/");
      }
    } catch (error) {
      toast({
        title: "Error creating team",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const goToMockMode = async () => {
    try {
      await apiRequest("/api/mock-data", {
        method: "POST",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not enter demo mode. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-10 px-4">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Welcome to Cancha+</CardTitle>
            <CardDescription className="text-center">
              Get started by creating your team or exploring the app in demo mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="mb-4">Hello {user?.fullName || "there"}!</p>
              <p className="mb-4">
                You can create your team now and start managing players, matches, and events. 
                Or try our demo mode to explore the app's features before creating your team.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              className="w-full" 
              onClick={createTeam} 
              disabled={isCreatingTeam}
            >
              {isCreatingTeam ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Team...
                </>
              ) : (
                "Create My Team"
              )}
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={goToMockMode}
            >
              Try Demo Mode
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}