import React, { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useLanguage } from "../../hooks/use-language";
import { Button } from "../ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { UserPlus, Check, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { toast } from "../../hooks/use-toast";

interface MemberClaim {
  id: number;
  userId: number;
  memberId: number;
  teamId: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
}

interface MemberClaimButtonProps {
  member: {
    id: number;
    fullName: string;
    teamId: number;
  };
}

export function MemberClaimButton({ member }: MemberClaimButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Check if user already has a pending claim for this member
  const { data: existingClaim, isLoading: isCheckingClaim } = useQuery<MemberClaim>({
    queryKey: [`/api/teams/${member.teamId}/member-claims/member/${member.id}/user`],
    enabled: !!user?.id && !!member.id,
  });
  
  // Mutation to create a new claim
  const { mutate: createClaim, isPending: isCreatingClaim } = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/teams/${member.teamId}/member-claims`, {
        method: "POST",
        data: {
          userId: user?.id,
          memberId: member.id,
          teamId: member.teamId,
          status: "pending"
        }
      });
    },
    onSuccess: () => {
      toast({
        title: t("team.claims.submitted") || "Claim Submitted",
        description: t("team.claims.submittedDescription") || "Your claim has been submitted for review.",
        variant: "default",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/teams/${member.teamId}/member-claims/member/${member.id}/user`]
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("team.claims.error") || "Error",
        description: error.message || t("team.claims.errorDescription") || "Failed to submit claim. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  if (isCheckingClaim) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }
  
  // If user already has a claim, show the status
  if (existingClaim) {
    const status = existingClaim.status;
    const statusColor = 
      status === "approved" ? "text-green-500" :
      status === "rejected" ? "text-red-500" :
      "text-amber-500"; // pending
    
    return (
      <Button variant="ghost" size="sm" disabled className={statusColor}>
        {status === "approved" && <Check className="h-4 w-4 mr-1" />}
        {status === "pending" ? 
          (t("team.claims.pending") || "Pending") : 
          status === "approved" ? 
            (t("team.claims.approved") || "Approved") : 
            (t("team.claims.rejected") || "Rejected")
        }
      </Button>
    );
  }
  
  // Otherwise, show the claim button
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsDialogOpen(true)}
        disabled={!user?.id}
      >
        <UserPlus className="h-4 w-4 mr-1" />
        {t("team.claims.claimButton") || "Claim"}
      </Button>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("team.claims.confirmTitle") || "Confirm Membership Claim"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("team.claims.confirmDescription") || 
                `Are you ${member.fullName}? This will notify team administrators to review and approve your claim. Your name will be marked as verified in the team roster once approved.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                createClaim();
              }}
              disabled={isCreatingClaim}
            >
              {isCreatingClaim ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  {t("submitting") || "Submitting..."}
                </>
              ) : (
                t("team.claims.submit") || "Submit Claim"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}