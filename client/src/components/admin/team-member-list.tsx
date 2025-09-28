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

type TeamMemberListProps = {
  team: Team;
};

export function TeamMemberList({ team }: TeamMemberListProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch team users (members with roles)
  const { data: teamUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: [`/api/teams/${team.id}/users`],
    queryFn: () => apiRequest(`/api/teams/${team.id}/users`),
  });

  // Fetch all users for details
  const { data: allUsers = [], isLoading: allUsersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  // Delete team user mutation
  const deleteMutation = useMutation({
    mutationFn: (teamUserId: number) =>
      apiRequest(`/api/admin/teams/${team.id}/users/${teamUserId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({
        titleKey: 'toasts.memberRemoved',
        descriptionKey: 'toasts.memberRemovedDesc',
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/teams/${team.id}/users`],
      });
    },
    onError: (error) => {
      toast({
        titleKey: 'toasts.error',
        descriptionKey: 'toasts.actionFailed',
        variant: 'destructive',
      });
    },
  });

  // Handle team user deletion
  const handleDeleteMember = () => {
    if (memberToDelete) {
      deleteMutation.mutate(memberToDelete.id);
    }
  };

  // Find user details for a team user
  const getUserForTeamUser = (userId: number) => {
    return allUsers.find((user: User) => user.id === userId);
  };

  // Open delete confirmation dialog
  const confirmDelete = (teamUser: any) => {
    setMemberToDelete(teamUser);
    setIsDeleteDialogOpen(true);
  };

  // Get badge and icon for team role
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'coach':
        return 'secondary';
      case 'player':
        return 'outline';
      case 'colaborador':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3 mr-1" />;
      case 'coach':
        return <UserCog className="h-3 w-3 mr-1" />;
      case 'player':
      case 'colaborador':
      default:
        return null;
    }
  };

  if (usersLoading || allUsersLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Team Members</h3>
      {teamUsers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Jersey #</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamUsers.map((teamUser: any) => {
              const user = getUserForTeamUser(teamUser.userId);
              // Create display data object from user and teamUser data
              const displayData = {
                fullName: user?.fullName || 'Unknown User',
                username: user?.username || 'unknown',
                profilePicture: user?.profilePicture,
                role: teamUser.role, // Use role from teamUsers table
                position: user?.position,
                jerseyNumber: user?.jerseyNumber
              };

              return (
                <TableRow key={teamUser.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        {displayData.profilePicture ? (
                          <img 
                            src={displayData.profilePicture} 
                            alt={displayData.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">${displayData.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}</div>`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {displayData.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{displayData.fullName}</p>
                        <p className="text-sm text-gray-500">@{displayData.username}</p>
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
                      onClick={() => confirmDelete(teamUser)}
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
          No members found for this team.
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}