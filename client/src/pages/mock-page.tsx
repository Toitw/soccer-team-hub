import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, addDays } from "date-fns";
import TeamSummary from "@/components/dashboard/team-summary";
import NextMatch from "@/components/dashboard/next-match";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import Announcements from "@/components/dashboard/announcements";
import { Team, Event, Announcement } from "@shared/schema";

/**
 * Mock page to show app functionality without having actual team data
 * Shows a demo version of the dashboard with mock data
 */
export default function MockPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Mock data for demo mode
  const mockTeam: Team = {
    id: 999,
    name: "Demo Team",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Football_rough.svg",
    division: "First Division",
    seasonYear: "2023-2024",
    category: "AMATEUR",
    teamType: "11-a-side",
    createdById: user?.id || 1,
    joinCode: "DEMO123"
  };
  
  // Mock upcoming events
  const today = new Date();
  const mockEvents: any[] = [
    {
      id: 9991,
      teamId: 999,
      title: "Weekly Training",
      description: "Regular training session",
      startTime: addDays(today, 1),
      endTime: addDays(today, 1),
      location: "Demo Field",
      type: "training",
      createdById: user?.id || 1
    },
    {
      id: 9992,
      teamId: 999,
      title: "Team Meeting",
      description: "Strategy planning for upcoming matches",
      startTime: addDays(today, 3),
      endTime: addDays(today, 3),
      location: "Club House",
      type: "meeting",
      createdById: user?.id || 1
    },
    {
      id: 9993,
      teamId: 999,
      title: "Friendly Match",
      description: "Practice match against local team",
      startTime: addDays(today, 7),
      endTime: addDays(today, 7),
      location: "Demo Stadium",
      type: "match",
      createdById: user?.id || 1
    }
  ];
  
  // Mock announcements
  const mockAnnouncements: any[] = [
    {
      id: 9991,
      teamId: 999,
      title: "Welcome to Cancha+",
      content: "This is a demo version of the app. Create a team to get started with actual data.",
      createdById: user?.id || 1,
      isImportant: true,
      status: "published",
      createdAt: new Date()
    },
    {
      id: 9992,
      teamId: 999,
      title: "New Schedule Released",
      content: "The match schedule for the next month has been finalized.",
      createdById: user?.id || 1,
      isImportant: false,
      status: "published",
      createdAt: subDays(new Date(), 2)
    },
    {
      id: 9993,
      teamId: 999,
      title: "Equipment Update",
      content: "New training equipment will be available from next week.",
      createdById: user?.id || 1,
      isImportant: false,
      status: "published",
      createdAt: subDays(new Date(), 5)
    }
  ];
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Demo Mode" 
          showCreateTeamButton={true}
        />
        
        <main className="flex-1 p-6">
          {/* Welcome Message */}
          <Card className="mb-6 border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Demo Mode Active</h2>
              <p className="text-gray-600">
                You're viewing a demonstration of Cancha+ with sample data. 
                Create a team to start managing your own team.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Team Summary */}
            <TeamSummary team={mockTeam} isDemoMode={true} />
            
            {/* Next Match */}
            <NextMatch teamId={mockTeam.id} isDemoMode={true} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Events */}
            <div className="lg:col-span-1">
              <UpcomingEvents events={mockEvents} isDemoMode={true} />
            </div>
            
            {/* Announcements */}
            <div className="lg:col-span-2">
              <Announcements 
                announcements={mockAnnouncements} 
                disableActions={true}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}