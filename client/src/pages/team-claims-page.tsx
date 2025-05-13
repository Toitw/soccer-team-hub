import React from "react";
import { useParams, useLocation, Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";
import { MemberClaimsManager } from "@/components/team/MemberClaimsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function TeamClaimsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const teamId = parseInt(id || "0");
  const [, navigate] = useLocation();

  // Check if user is admin or coach for this team
  const { data: teamMember, isLoading: isLoadingTeamMember } = useQuery({
    queryKey: [`/api/teams/${teamId}/member`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/member`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch team member status");
      }
      
      return response.json();
    },
    enabled: !!teamId && !!user,
  });

  const isAdminOrCoach = teamMember?.role === "admin" || teamMember?.role === "coach";

  // Redirect non-admin/coach users back to the team page
  if (!isLoadingTeamMember && !isAdminOrCoach) {
    return <Redirect to={`/teams/${teamId}`} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto z-30">
        <Header title={t("team.claims.title") || "Member Claims"} />
        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-16">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <Link to={`/teams/${teamId}`}>
                <Button variant="outline" size="sm" className="mb-4">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t("common.back") || "Back to Team"}
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-primary">
                {t("team.claims.title") || "Member Claims Management"}
              </h1>
              <p className="text-gray-500">
                {t("team.claims.description") || "Review and manage claim requests from users"}
              </p>
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">
                {t("team.claims.pendingClaims") || "Pending & Resolved Claims"}
              </CardTitle>
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