import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MemberClaimsManager } from "../components/team/MemberClaimsManager";

export function SimpleClaimsPage() {
  const { id } = useParams();
  const teamId = parseInt(id || "0");
  
  // Get team details
  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });

  if (isTeamLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Team Member Claims</h1>
      <MemberClaimsManager />
    </div>
  );
}

export default SimpleClaimsPage;