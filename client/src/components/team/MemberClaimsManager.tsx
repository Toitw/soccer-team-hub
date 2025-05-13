import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../hooks/use-language";
import { useAuth } from "../../hooks/use-auth";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Check, X, UserPlus, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";

interface MemberClaim {
  id: number;
  userId: number;
  memberId: number;
  teamId: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string | null;
  rejectionReason: string | null;
  user: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
  };
  member: {
    id: number;
    fullName: string;
    role: string;
    position: string | null;
    jerseyNumber: number | null;
  };
}

interface MemberClaimsManagerProps {
  teamId?: number | null;
}

export function MemberClaimsManager({ teamId: propTeamId }: MemberClaimsManagerProps) {
  const { id } = useParams();
  const teamId = propTeamId || (id ? parseInt(id) : undefined);
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedClaim, setSelectedClaim] = useState<MemberClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
  // Fetch all member claims for this team
  const { data: claims, isLoading: isLoadingClaims } = useQuery({
    queryKey: [`/api/teams/${teamId}/claims`],
    enabled: !!teamId,
  });
  
  // Mutation to update claim status
  const { mutate: updateClaimStatus, isPending: isUpdatingClaim } = useMutation({
    mutationFn: async ({ claimId, status, rejectionReason }: { claimId: number, status: string, rejectionReason?: string }) => {
      return apiRequest(`/api/teams/${teamId}/claims/${claimId}`, {
        method: "PUT", // Server uses PUT instead of PATCH
        data: {
          status,
          ...(rejectionReason && { rejectionReason })
        }
      });
    },
    onSuccess: () => {
      toast({
        title: t("team.claims.updated") || "Claim Updated",
        description: t("team.claims.updatedDescription") || "The claim status has been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/claims`] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedClaim(null);
    },
    onError: (error) => {
      toast({
        title: t("team.claims.error") || "Error",
        description: error.message || t("team.claims.errorUpdateDescription") || "Failed to update claim status. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle approve claim
  const handleApproveClaim = (claim: MemberClaim) => {
    updateClaimStatus({ 
      claimId: claim.id, 
      status: "approved" 
    });
  };
  
  // Handle reject claim
  const handleRejectClaim = () => {
    if (!selectedClaim) return;
    
    updateClaimStatus({ 
      claimId: selectedClaim.id, 
      status: "rejected",
      ...(rejectionReason.trim() && { rejectionReason: rejectionReason.trim() })
    });
  };
  
  // Filter claims by status
  const claimsArray = Array.isArray(claims) ? claims : [];
  const filteredClaims = claimsArray.filter((claim: MemberClaim) => claim.status === activeTab);
  
  if (isLoadingClaims) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div>
      <Tabs defaultValue="pending" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t("team.claims.pending") || "Pending"} 
            {claimsArray.filter((c: MemberClaim) => c.status === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {claimsArray.filter((c: MemberClaim) => c.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center">
            <Check className="h-4 w-4 mr-2" />
            {t("team.claims.approved") || "Approved"}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center">
            <X className="h-4 w-4 mr-2" />
            {t("team.claims.rejected") || "Rejected"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{t("team.claims.noPendingClaims") || "No pending claims to review"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim: MemberClaim) => (
                <Card key={claim.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="font-medium text-lg flex items-center">
                          {claim.user.fullName || claim.user.username}
                          <Badge variant="outline" className="ml-2">
                            {t("team.claims.claiming") || "claiming to be"}
                          </Badge>
                        </div>
                        <div className="text-primary font-medium">
                          {claim.member.fullName} 
                          <span className="text-gray-500 font-normal ml-1">
                            ({t(`team.roles.${claim.member.role.toLowerCase()}`) || claim.member.role})
                            {claim.member.position && ` - ${claim.member.position}`}
                            {claim.member.jerseyNumber && ` #${claim.member.jerseyNumber}`}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {t("team.claims.requestedOn") || "Requested on"}: {new Date(claim.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 self-end md:self-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setIsRejectDialogOpen(true);
                          }}
                          disabled={isUpdatingClaim}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t("team.claims.reject") || "Reject"}
                        </Button>
                        
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleApproveClaim(claim)}
                          disabled={isUpdatingClaim}
                        >
                          {isUpdatingClaim ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          {t("team.claims.approve") || "Approve"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved">
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Check className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{t("team.claims.noApprovedClaims") || "No approved claims"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim: MemberClaim) => (
                <Card key={claim.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div>
                        <div className="font-medium">
                          {claim.user.fullName || claim.user.username}
                          <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 hover:bg-green-50">
                            {t("team.claims.verified") || "verified as"}
                          </Badge>
                        </div>
                        <div className="text-primary font-medium">
                          {claim.member.fullName} 
                          <span className="text-gray-500 font-normal ml-1">
                            ({t(`team.roles.${claim.member.role.toLowerCase()}`) || claim.member.role})
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {t("team.claims.approvedOn") || "Approved on"}: {new Date(claim.updatedAt || "").toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rejected">
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <X className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{t("team.claims.noRejectedClaims") || "No rejected claims"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim: MemberClaim) => (
                <Card key={claim.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {claim.user.fullName || claim.user.username}
                        <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 hover:bg-red-50">
                          {t("team.claims.rejected") || "rejected for"}
                        </Badge>
                      </div>
                      <div className="text-primary font-medium">
                        {claim.member.fullName}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {t("team.claims.rejectedOn") || "Rejected on"}: {new Date(claim.updatedAt || "").toLocaleDateString()}
                      </div>
                      
                      {claim.rejectionReason && (
                        <div className="mt-3 text-sm">
                          <span className="font-medium">{t("team.claims.reason") || "Reason"}:</span>
                          <span className="text-gray-600 ml-2">{claim.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.claims.rejectTitle") || "Reject Claim"}</DialogTitle>
            <DialogDescription>
              {t("team.claims.rejectDescription") || "Please provide a reason for rejecting this claim. This will be visible to the user."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder={t("team.claims.rejectReasonPlaceholder") || "Reason for rejection (optional)"}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                {t("cancel") || "Cancel"}
              </Button>
            </DialogClose>
            <Button 
              variant="destructive"
              onClick={handleRejectClaim}
              disabled={isUpdatingClaim}
            >
              {isUpdatingClaim ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  {t("submitting") || "Submitting..."}
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  {t("team.claims.confirmReject") || "Confirm Rejection"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}