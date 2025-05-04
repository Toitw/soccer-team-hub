import { useEffect, useState } from "react";
import { Team, Match, Event, Announcement } from "@shared/schema";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import TeamSummary from "@/components/dashboard/team-summary";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import RecentMatches from "@/components/dashboard/recent-matches";
import Announcements from "@/components/dashboard/announcements";
import NextMatch from "@/components/dashboard/next-match";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";

// Mock data for the demo view
const mockTeam: Team = {
  id: 999,
  name: "Demo Team",
  logo: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Football_pictogram.svg",
  division: "Demo Division",
  seasonYear: "2025",
  category: "AMATEUR",
  teamType: "11-a-side",
  createdById: 1,
  joinCode: "DEMO123",
  // Database timestamps
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  // Additional fields from the database schema
  owner_id: 1
};

const mockEvents: Event[] = [
  {
    id: 9991,
    teamId: 999,
    title: "Demo Training Session",
    type: "training",
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    location: "Demo Field",
    description: "Regular team practice focusing on tactical setup",
    createdById: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 9992,
    teamId: 999,
    title: "Demo League Match",
    type: "match",
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    location: "Demo Stadium",
    description: "Important league match against Demo Rival FC",
    createdById: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockMatches: Match[] = [
  {
    id: 9991,
    teamId: 999,
    opponentName: "Demo Rival FC",
    opponentLogo: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Football_rough.svg",
    matchDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Demo Stadium",
    isHome: true,
    goalsScored: null,
    goalsConceded: null,
    status: "SCHEDULED",
    matchType: "LEAGUE",
    notes: "Important match for the standings",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockAnnouncements: (Announcement & { creator?: any })[] = [
  {
    id: 9991,
    teamId: 999,
    title: "Welcome to the Demo",
    content: "This is a demonstration view showing what your team dashboard will look like once you've created your team. All features are view-only in this mode.",
    creatorId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: 1,
      username: "coach",
      fullName: "Demo Coach"
    }
  },
  {
    id: 9992,
    teamId: 999,
    title: "Create Your Team",
    content: "Click the 'Create Your Team' button at the top right to start setting up your real team and accessing all features.",
    creatorId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: 1,
      username: "coach",
      fullName: "Demo Coach"
    }
  }
];

// Banner component to display prominently at the top of the mock page
const DemoBanner = () => {
  const [location, setLocation] = useLocation();
  
  return (
    <div className="bg-primary/10 border border-primary/20 p-4 mb-6 rounded-lg relative">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-primary">Demo Mode</h2>
          <p className="text-sm text-muted-foreground">
            You're viewing a demonstration of Cancha+. This is a preview with mock data and limited functionality.
          </p>
        </div>
        <Button 
          className="mt-4 md:mt-0 flex items-center gap-2" 
          onClick={() => setLocation("/onboarding")}
        >
          <PlusCircle size={18} />
          Create Your Team
        </Button>
      </div>
      <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded">
        DEMO
      </div>
    </div>
  );
};

export default function MockPage() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Show mock data loading simulation briefly
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle any action button clicks in demo mode
  const handleActionClick = () => {
    toast({
      title: "Demo Mode",
      description: "This action is not available in demo mode. Create your team to access all features.",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation("/onboarding")}
        >
          Create Team
        </Button>
      )
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar disableActions={true} />

      <div className="flex-1 ml-0 md:ml-64 z-30">
        <Header title={t("navigation.dashboard")} showCreateTeamButton={true} />

        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-20">
          <DemoBanner />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <TeamSummary team={mockTeam} isDemoMode={true} />
              <UpcomingEvents events={mockEvents} isDemoMode={true} />
              <NextMatch teamId={mockTeam.id} isDemoMode={true} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Announcements 
                teamId={mockTeam.id} 
                announcements={mockAnnouncements}
                isDemoMode={true}
                onCreateClick={handleActionClick}
              />
            </div>
          </div>
        </div>

        <MobileNavigation disableActions={true} />
      </div>
    </div>
  );
}