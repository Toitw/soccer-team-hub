import React, { useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: number;
  fullName: string;
  role: string;
  position: string | null;
  jerseyNumber: number | null;
  userId: number | null;
  isVerified: boolean | null;
}

export function MemberClaimButton({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id: teamId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't show claim button if member already has a verified user
  if (member.userId && member.isVerified) {
    return null;
  }

  const createClaimMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      try {
        return await apiRequest(`/api/teams/${teamId}/claims`, {
          method: "POST",
          body: { teamMemberId: member.id },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/my-claims`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      setOpen(false);
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud para reclamar este jugador ha sido enviada. Un administrador la revisará pronto.",
      });
    },
    onError: (error: any) => {
      const errorMsg = error?.error || "Ha ocurrido un error al enviar la solicitud.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleClaim = () => {
    createClaimMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="ml-2">
          Reclamar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reclamar jugador</DialogTitle>
          <DialogDescription>
            Estás a punto de reclamar que eres {member.fullName}.
            {member.role === "player" && (
              <span>
                {member.position && <> ({member.position})</>}
                {member.jerseyNumber && <>, #{member.jerseyNumber}</>}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Al reclamar este perfil, un administrador del equipo revisará tu solicitud.
          Una vez aprobada, podrás acceder a todas las funcionalidades asociadas a este jugador.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleClaim} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}