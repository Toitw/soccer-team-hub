import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import QuickStats from "@/components/dashboard/quick-stats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventsList from "@/components/dashboard/events-list";
import AnnouncementsList from "@/components/dashboard/announcements-list";
import RecentMatchesList from "@/components/dashboard/recent-matches-list";
import PlayerPerformance from "@/components/dashboard/player-performance";
import TeamCalendar from "@/components/dashboard/team-calendar";
import QuickActions from "@/components/dashboard/quick-actions";
import TeamRoster from "@/components/dashboard/team-roster";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [showCreateEventButton, setShowCreateEventButton] = useState(
    user?.role === "admin" || user?.role === "coach"
  );

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
  });

  const { data: events } = useQuery({
    queryKey: ["/api/events"],
  });

  const { data: matches } = useQuery({
    queryKey: ["/api/matches"],
  });

  const { data: announcements } = useQuery({
    queryKey: ["/api/announcements"],
  });

  const { data: team } = useQuery({
    queryKey: ["/api/team"],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Dashboard header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 font-inter sm:text-3xl sm:leading-9 sm:truncate">
              Dashboard
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            {showCreateEventButton && (
              <Button className="inline-flex items-center">
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Event
              </Button>
            )}
          </div>
        </div>

        {/* Quick stats cards */}
        <QuickStats stats={stats} />

        {/* Dashboard main content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content column */}
          <div className="w-full lg:w-8/12">
            {/* Tabs component */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 font-inter">Team Overview</h2>
                  <Tabs defaultValue="upcoming" className="w-auto">
                    <TabsList>
                      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                      <TabsTrigger value="announcements">Announcements</TabsTrigger>
                      <TabsTrigger value="recent-matches">Recent Matches</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              
              <div className="p-4">
                <Tabs defaultValue="upcoming">
                  <TabsContent value="upcoming">
                    <EventsList events={events} />
                  </TabsContent>
                  <TabsContent value="announcements">
                    <AnnouncementsList announcements={announcements} />
                  </TabsContent>
                  <TabsContent value="recent-matches">
                    <RecentMatchesList matches={matches} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Player performance table */}
            <PlayerPerformance players={players} />
          </div>

          {/* Sidebar column */}
          <div className="w-full lg:w-4/12">
            {/* Team calendar */}
            <TeamCalendar events={events} matches={matches} />

            {/* Quick actions */}
            <QuickActions userRole={user?.role} />

            {/* Team roster */}
            <TeamRoster team={team} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
