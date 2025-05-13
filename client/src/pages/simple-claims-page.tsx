import React from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MemberClaimsManager } from "../components/team/MemberClaimsManager";
import { Button } from "../components/ui/button";

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Member Claims</h1>
        <Link href={`/teams/${teamId}`}>
          <Button variant="outline">Back to Team</Button>
        </Link>
      </div>
      
      <MemberClaimsManager teamId={teamId} />
    </div>
  );
}

export default SimpleClaimsPage;