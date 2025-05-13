import React, { useState } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type ClaimStatus = "pending" | "approved" | "rejected";

interface MemberClaim {
  id: number;
  teamId: number;
  teamMemberId: number;
  userId: number;
  status: ClaimStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: number | null;
  rejectionReason: string | null;
  member: {
    id: number;
    fullName: string;
    position: string | null;
    jerseyNumber: number | null;
    role: string;
  } | null;
  user: {
    id: number;
    username: string;
    fullName: string;
    profilePicture: string | null;
  } | null;
}

export function MemberClaimsManager() {
  const { id: teamId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState<MemberClaim | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}/claims`],
    queryFn: async () => {
      const response = await apiRequest(`/api/teams/${teamId}/claims`, {
        method: "GET",
      });
      return response as MemberClaim[];
    },
  });

  const updateClaimMutation = useMutation({
    mutationFn: async ({
      claimId,
      status,
      rejectionReason,
    }: {
      claimId: number;
      status: ClaimStatus;
      rejectionReason?: string;
    }) => {
      return await apiRequest(`/api/teams/${teamId}/claims/${claimId}`, {
        method: "PUT",
        body: { status, rejectionReason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/claims`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      toast({
        title: "Solicitud actualizada",
        description: "La solicitud ha sido actualizada correctamente.",
      });
      setRejectDialogOpen(false);
    },
    onError: (error: any) => {
      const errorMsg = error?.error || "Ha ocurrido un error al actualizar la solicitud.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleApproveClaim = (claim: MemberClaim) => {
    updateClaimMutation.mutate({
      claimId: claim.id,
      status: "approved",
    });
  };

  const openRejectDialog = (claim: MemberClaim) => {
    setSelectedClaim(claim);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectClaim = () => {
    if (!selectedClaim) return;
    
    updateClaimMutation.mutate({
      claimId: selectedClaim.id,
      status: "rejected",
      rejectionReason: rejectReason,
    });
  };

  if (isLoading) {
    return <div className="p-4">Cargando solicitudes...</div>;
  }

  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const resolvedClaims = claims.filter((claim) => claim.status !== "pending");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestión de solicitudes de miembros</h2>
      
      {pendingClaims.length === 0 ? (
        <div className="p-4 text-center border rounded-md bg-muted">
          No hay solicitudes pendientes.
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Solicitudes pendientes ({pendingClaims.length})</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingClaims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-md">
                      {claim.member?.fullName || "Miembro desconocido"}
                    </CardTitle>
                    <Badge className="ml-2 bg-yellow-500">{claim.status}</Badge>
                  </div>
                  <CardDescription>
                    {claim.member?.role === "player" && (
                      <>
                        {claim.member.position && `${claim.member.position}`}
                        {claim.member.jerseyNumber && 
                          `${claim.member.position ? " - " : ""}#${claim.member.jerseyNumber}`
                        }
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={claim.user?.profilePicture || ""} 
                        alt={claim.user?.fullName || "?"} 
                      />
                      <AvatarFallback>
                        {(claim.user?.fullName || "?").substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{claim.user?.fullName}</p>
                      <p className="text-sm text-muted-foreground">@{claim.user?.username}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Solicitud creada: {new Date(claim.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => openRejectDialog(claim)}
                  >
                    Rechazar
                  </Button>
                  <Button 
                    onClick={() => handleApproveClaim(claim)}
                  >
                    Aprobar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {resolvedClaims.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">Solicitudes resueltas ({resolvedClaims.length})</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {resolvedClaims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-md">
                      {claim.member?.fullName || "Miembro desconocido"}
                    </CardTitle>
                    <Badge className={`ml-2 ${
                      claim.status === "approved" ? "bg-green-500" : "bg-red-500"
                    }`}>
                      {claim.status === "approved" ? "Aprobada" : "Rechazada"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={claim.user?.profilePicture || ""} 
                        alt={claim.user?.fullName || "?"} 
                      />
                      <AvatarFallback>
                        {(claim.user?.fullName || "?").substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{claim.user?.fullName}</p>
                      <p className="text-sm text-muted-foreground">@{claim.user?.username}</p>
                    </div>
                  </div>
                  {claim.status === "rejected" && claim.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                      <span className="font-medium">Motivo del rechazo:</span> {claim.rejectionReason}
                    </div>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Resuelta: {claim.reviewedAt ? new Date(claim.reviewedAt).toLocaleDateString() : "N/A"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Estás a punto de rechazar la solicitud de{" "}
              {selectedClaim?.user?.fullName || "un usuario"} para ser{" "}
              {selectedClaim?.member?.fullName || "un miembro del equipo"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del rechazo (opcional)</Label>
              <Input
                id="reason"
                placeholder="Explica por qué rechazas esta solicitud"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectClaim}
              disabled={updateClaimMutation.isPending}
            >
              {updateClaimMutation.isPending ? "Procesando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}