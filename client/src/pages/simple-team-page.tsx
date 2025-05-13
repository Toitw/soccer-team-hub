import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../hooks/use-language";
import { useAuth } from "../hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ClipboardCheck, Users } from "lucide-react";
import { MemberClaimButton } from "../components/team/MemberClaimButton";

export function SimpleTeamPage() {
  const { id } = useParams();
  const teamId = parseInt(id || "0");
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Get team details
  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });
  
  // Get team members
  const { data: teamMembers, isLoading: isMembersLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!teamId,
  });
  
  // Check if user is admin
  const { data: userTeamMember, isLoading: isCheckingAdmin } = useQuery({
    queryKey: [`/api/teams/${teamId}/members/user/${user?.id}`],
    enabled: !!teamId && !!user?.id,
  });
  
  const isAdmin = 
    user?.role === "admin" || 
    userTeamMember?.role === "admin" || 
    userTeamMember?.role === "coach";
  
  if (isTeamLoading || isMembersLoading || isCheckingAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">{team?.name || "Team"}</h1>
          <p className="text-gray-500">{team?.division || "No division set"}</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <Link to={`/teams/${teamId}/claims`}>
              <Button variant="outline">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {t("team.claims.manage") || "Manage Claims"}
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              {t("team.teamMembers") || "Team Members"}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">{t("team.name") || "Name"}</th>
                  <th className="text-left py-3 px-4 font-medium">{t("team.role") || "Role"}</th>
                  <th className="text-left py-3 px-4 font-medium">{t("team.position") || "Position"}</th>
                  <th className="text-center py-3 px-4 font-medium">
                    {t("team.jerseyNumber") || "#"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {teamMembers?.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{member.fullName}</div>
                    </td>
                    <td className="py-3 px-4 capitalize">{member.role}</td>
                    <td className="py-3 px-4">{member.position || "-"}</td>
                    <td className="py-3 px-4 text-center">
                      {member.jerseyNumber || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MemberClaimButton member={member} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimpleTeamPage;