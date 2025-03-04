import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Loader2, Trophy, Calendar, Shield, Star } from "lucide-react";

export default function TeamPage() {
  const { user } = useAuth();

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Select the first team by default
  const selectedTeam = teams && teams.length > 0 ? teams[0] : null;

  if (teamsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64">
        <Header title="Team" />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">{selectedTeam?.name || "Team"}</h1>
            <p className="text-gray-500">{selectedTeam?.division || "No division set"}</p>
          </div>

          <p className="text-lg mb-6">
            This is the new Team page that you can customize for a different purpose. The original Team page content 
            has been moved to the Settings page.
          </p>

          {/* Example placeholder content - this can be replaced with your desired team content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-primary" />
                  Team Achievements
                </CardTitle>
                <CardDescription>Recent accomplishments and milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <p>No achievements recorded yet.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  Season Calendar
                </CardTitle>
                <CardDescription>Important dates and events</CardDescription>
              </CardHeader>
              <CardContent>
                <p>No upcoming events scheduled.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Team Values
                </CardTitle>
                <CardDescription>Our guiding principles</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Teamwork and collaboration</li>
                  <li>Respect and sportsmanship</li>
                  <li>Continuous improvement</li>
                  <li>Commitment to excellence</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <MobileNavigation />
      </div>
    </div>
  );
}
