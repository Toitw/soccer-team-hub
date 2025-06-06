import React, { useState } from "react";
import { useParams } from "wouter";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  User,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MemberClaim = {
  id: number;
  teamId: number;
  teamMemberId: number;
  userId: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;  // Campo actualizado
  reviewedAt: string | null;
  reviewedById: number | null;
  rejectionReason: string | null;
  member?: {
    id: number;
    fullName: string;
    position: string | null;
    jerseyNumber: number | null;
    role: string;
  };
  user?: {
    id: number;
    fullName: string;
    username: string;
    email: string;  // Añadimos el email del usuario
  };
};

export default function MemberClaimsManager({ teamId }: { teamId?: number }) {
  const params = useParams();
  const routeTeamId = params.id ? parseInt(params.id) : undefined;
  // Use the passed teamId or fallback to the one from the route
  const actualTeamId = teamId || routeTeamId;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<MemberClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch claims
  const { data: claims = [], isLoading, error } = useQuery<MemberClaim[]>({
    queryKey: [`/api/teams/${actualTeamId}/claims`],
    enabled: !!actualTeamId
  });

  // Filter claims by status
  const pendingClaims = claims.filter(claim => claim.status === 'pending');
  const historicalClaims = claims.filter(claim => claim.status === 'approved' || claim.status === 'rejected');

  // Approve claim mutation
  const approveMutation = useMutation({
    mutationFn: async (claimId: number) => {
      return await apiRequest(`/api/teams/${actualTeamId}/claims/${claimId}/approve`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${actualTeamId}/claims`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${actualTeamId}/members`] });
      toast({
        titleKey: "toasts.claimApproved",
        descriptionKey: "toasts.claimApprovedDesc",
      });
    },
    onError: (error: any) => {
      toast({
        titleKey: "toasts.error",
        description: error?.error || "Error al aprobar la reclamación",
        variant: "destructive"
      });
    }
  });

  // Reject claim mutation
  const rejectMutation = useMutation({
    mutationFn: async (params: { claimId: number, reason: string }) => {
      const { claimId, reason } = params;
      return await apiRequest(`/api/teams/${actualTeamId}/claims/${claimId}/reject`, {
        method: "POST",
        data: { reason }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${actualTeamId}/claims`] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedClaim(null);
      toast({
        titleKey: "toasts.claimRejected",
        descriptionKey: "toasts.claimRejectedDesc",
      });
    },
    onError: (error: any) => {
      toast({
        titleKey: "toasts.error",
        description: error?.error || "Error al rechazar la reclamación",
        variant: "destructive"
      });
    }
  });

  const handleApprove = (claim: MemberClaim) => {
    approveMutation.mutate(claim.id);
  };

  const handleOpenRejectDialog = (claim: MemberClaim) => {
    setSelectedClaim(claim);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!selectedClaim) return;
    
    rejectMutation.mutate({
      claimId: selectedClaim.id,
      reason: rejectionReason
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reclamaciones de miembros</CardTitle>
          <CardDescription>Cargando reclamaciones...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reclamaciones de miembros</CardTitle>
          <CardDescription className="text-red-500">Error al cargar las reclamaciones</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reclamaciones de miembros</CardTitle>
        <CardDescription>
          Gestiona las solicitudes de los usuarios que reclaman ser parte del equipo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pendientes ({pendingClaims.length})
            </TabsTrigger>
            <TabsTrigger value="historical">
              Historial ({historicalClaims.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {pendingClaims.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>No hay reclamaciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingClaims.map(claim => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    onApprove={() => handleApprove(claim)}
                    onReject={() => handleOpenRejectDialog(claim)}
                    isPending={approveMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="historical">
            {historicalClaims.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>No hay historial de reclamaciones</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicalClaims.map(claim => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    isHistorical
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar reclamación</DialogTitle>
            <DialogDescription>
              Estás a punto de rechazar la reclamación de {selectedClaim?.user?.fullName || 'este usuario'} para el miembro {selectedClaim?.member?.fullName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm">Puedes proporcionar un motivo para el rechazo (opcional):</p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Procesando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Helper component for displaying claims
function ClaimCard({ 
  claim, 
  onApprove, 
  onReject, 
  isPending = false,
  isHistorical = false 
}: { 
  claim: MemberClaim; 
  onApprove?: () => void; 
  onReject?: () => void; 
  isPending?: boolean;
  isHistorical?: boolean;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Aprobada</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Rechazada</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            <User className="inline-block h-4 w-4 mr-1" />
            {claim.user?.fullName || 'Usuario'} ({claim.user?.username})
          </div>
          <div className="text-xs text-muted-foreground">
            <Mail className="inline-block h-3 w-3 mr-1" /> 
            {claim.user?.email || 'Email no disponible'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Reclama ser:
            <span className="font-medium ml-1">
              {claim.member?.fullName || 'Miembro'}
              {claim.member?.role && <span className="ml-1">({claim.member.role})</span>}
              {claim.member?.position && <span className="ml-1">- {claim.member.position}</span>}
              {claim.member?.jerseyNumber && <span className="ml-1">#{claim.member.jerseyNumber}</span>}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Solicitado el {format(new Date(claim.requestedAt), 'dd/MM/yyyy HH:mm')}
          </div>
          
          {claim.reviewedAt && (
            <div className="text-xs text-muted-foreground">
              Revisado el {format(new Date(claim.reviewedAt), 'dd/MM/yyyy HH:mm')}
            </div>
          )}
          
          {claim.rejectionReason && (
            <div className="text-xs text-red-500 mt-2">
              Motivo de rechazo: {claim.rejectionReason}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end">
          {getStatusBadge(claim.status)}
          
          {!isHistorical && (
            <div className="mt-4 space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReject}
                disabled={isPending}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onApprove}
                disabled={isPending}
                className="text-green-500 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}