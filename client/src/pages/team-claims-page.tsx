import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../hooks/use-language";
import { useAuth } from "../hooks/use-auth";
import { Sidebar } from "../components/layout/sidebar";
import { Header } from "../components/layout/header";
import { MobileNavigation } from "../components/layout/mobile-navigation";
import { MemberClaimsManager } from "../components/team/MemberClaimsManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Users } from "lucide-react";

export function TeamClaimsPage() {
  const { id } = useParams();
  const teamId = parseInt(id || "0");
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Get team details
  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });

  // Check if user is admin
  const { data: teamMember, isLoading: isCheckingAdmin } = useQuery({
    queryKey: [`/api/teams/${teamId}/members/user/${user?.id}`],
    enabled: !!teamId && !!user?.id,
  });

  const isAdmin = 
    user?.role === "admin" || 
    teamMember?.role === "admin" || 
    teamMember?.role === "coach";

  // Loading state
  if (isTeamLoading || isCheckingAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
          <Header title={t("team.claims.title") || "Team Member Claims"} />
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!isAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
          <Header title={t("team.claims.title") || "Team Member Claims"} />
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">{t("common.notAuthorized") || "Not Authorized"}</h2>
              <p className="text-gray-500">
                {t("team.claims.adminOnly") || "Only team administrators can manage member claims."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <Header title={t("team.claims.title") || "Team Member Claims"} />
        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-16">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">{team?.name || "Team"}</h1>
            <p className="text-gray-500">
              {t("team.claims.management") || "Member Claims Management"}
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>{t("team.claims.pending") || "Pending Claims"}</CardTitle>
              </div>
              <CardDescription>
                {t("team.claims.pendingDescription") || 
                  "Review and manage user claims to be team members."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberClaimsManager />
            </CardContent>
          </Card>
        </div>
        <MobileNavigation />
      </div>
    </div>
  );
}

export default TeamClaimsPage;