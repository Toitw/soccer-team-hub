import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Team, TeamMember, User } from "@shared/schema";
import { Loader2, UserCog, Shield, ShieldAlert, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

type TeamMemberListProps = {
  team: Team;
};

export function TeamMemberList({ team }: TeamMemberListProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: [`/api/admin/teams/${team.id}/members`],
    queryFn: () => apiRequest(`/api/admin/teams/${team.id}/members`),
  });

  // Fetch users for member details
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  // Delete team member mutation
  const deleteMutation = useMutation({
    mutationFn: (memberId: number) =>
      apiRequest(`/api/admin/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({
        title: t('toasts.memberRemoved'),
        description: t('toasts.memberRemovedDesc'),
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/admin/teams/${team.id}/members`],
      });
    },
    onError: (error) => {
      toast({
        title: t('toasts.error'),
        description: t('toasts.memberRemoveError'),
        variant: 'destructive',
      });
    },
  });

  // Handle member deletion
  const handleDeleteMember = () => {
    if (memberToDelete) {
      deleteMutation.mutate(memberToDelete.id);
    }
  };

  // Find user details for a team member
  const getUserForMember = (userId: number | null) => {
    if (!userId) return null;
    return users.find((user: User) => user.id === userId);
  };

  // Open delete confirmation dialog
  const confirmDelete = (member: TeamMember) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  // Get badge and icon for user role
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superuser':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'coach':
        return 'secondary';
      case 'player':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser':
        return <ShieldAlert className="h-3 w-3 mr-1" />;
      case 'admin':
        return <Shield className="h-3 w-3 mr-1" />;
      case 'coach':
        return <UserCog className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  if (membersLoading || usersLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('teamMembers.title')}</h3>
      {teamMembers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('teamMembers.user')}</TableHead>
              <TableHead>{t('teamMembers.role')}</TableHead>
              <TableHead>{t('teamMembers.position')}</TableHead>
              <TableHead>{t('teamMembers.jersey')}</TableHead>
              <TableHead className="text-right">{t('teamMembers.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member: TeamMember) => {
              const user = getUserForMember(member.userId);
              // Create a display data object with either user data or member data
              const displayData = user ? {
                fullName: user.fullName,
                username: user.username,
                profilePicture: user.profilePicture,
                role: user.role,
                position: user.position,
                jerseyNumber: user.jerseyNumber
              } : {
                fullName: member.fullName,
                username: "Unclaimed Member",
                profilePicture: member.profilePicture,
                role: member.role,
                position: member.position,
                jerseyNumber: member.jerseyNumber
              };

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {displayData.profilePicture ? (
                        <img
                          src={displayData.profilePicture}
                          alt={displayData.fullName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserCog className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{displayData.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {!user && <span className="text-amber-500 font-semibold">Unclaimed</span>}
                          {user && displayData.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(displayData.role)}>
                      <div className="flex items-center">
                        {getRoleIcon(displayData.role)}
                        {displayData.role}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>{displayData.position || "N/A"}</TableCell>
                  <TableCell>{displayData.jerseyNumber || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(member)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {t('teamMembers.noMembers')}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('teamMembers.removeMember')}</DialogTitle>
            <DialogDescription>
              {t('teamMembers.removeConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('actions.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}