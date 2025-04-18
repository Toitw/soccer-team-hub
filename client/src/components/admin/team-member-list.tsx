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
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        title: 'Member Removed',
        description: 'Team member has been removed successfully.',
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/admin/teams/${team.id}/members`],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove team member. Please try again.',
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
  const getUserForMember = (userId: number) => {
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
      <h3 className="text-lg font-medium">Team Members</h3>
      {teamMembers.length > 0 ? (
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
            {teamMembers.map((member: TeamMember) => {
              const user = getUserForMember(member.userId);
              if (!user) return null;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.fullName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserCog className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      <div className="flex items-center">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>{user.position || "N/A"}</TableCell>
                  <TableCell>{user.jerseyNumber || "N/A"}</TableCell>
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