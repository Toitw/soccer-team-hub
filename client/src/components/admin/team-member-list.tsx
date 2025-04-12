import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TeamMemberListProps {
  teamId: number;
  onSuccess?: () => void;
}

export function TeamMemberList({ teamId, onSuccess }: TeamMemberListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('player');

  // Fetch team members
  const {
    data: teamMembers = [],
    isLoading: isLoadingMembers,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: [`/api/admin/teams/${teamId}/members`],
    queryFn: () => apiRequest(`/api/admin/teams/${teamId}/members`),
  });

  // Fetch all users for adding team members
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
    enabled: isAddingMember,
  });

  // Add team member mutation
  const addMemberMutation = useMutation({
    mutationFn: (data: { userId: number; role: string }) => {
      return apiRequest(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Member Added',
        description: 'The user has been added to the team.',
      });
      setIsAddingMember(false);
      refetchMembers();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update team member mutation
  const updateMemberMutation = useMutation({
    mutationFn: (data: { memberId: number; role: string }) => {
      return apiRequest(`/api/admin/teams/${teamId}/members/${data.memberId}`, {
        method: 'PUT',
        data: { role: data.role },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Member Updated',
        description: 'The team member role has been updated.',
      });
      setIsEditingMember(false);
      refetchMembers();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team member. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete team member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: number) => {
      return apiRequest(`/api/admin/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Member Removed',
        description: 'The user has been removed from the team.',
      });
      setIsDeleteDialogOpen(false);
      refetchMembers();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team member. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle adding a member
  const handleAddMember = () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to add.',
        variant: 'destructive',
      });
      return;
    }

    addMemberMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
    });
  };

  // Handle updating a member role
  const handleUpdateMember = () => {
    if (!selectedMemberId) {
      toast({
        title: 'Error',
        description: 'Unable to update team member.',
        variant: 'destructive',
      });
      return;
    }

    updateMemberMutation.mutate({
      memberId: selectedMemberId,
      role: selectedRole,
    });
  };

  // Handle removing a member
  const handleRemoveMember = () => {
    if (!selectedMemberId) return;
    deleteMemberMutation.mutate(selectedMemberId);
  };

  // Open edit dialog
  const openEditDialog = (member: any) => {
    setSelectedMember(member);
    setSelectedMemberId(member.id);
    setSelectedRole(member.role);
    setIsEditingMember(true);
  };

  // Open delete dialog
  const openDeleteDialog = (member: any) => {
    setSelectedMember(member);
    setSelectedMemberId(member.id);
    setIsDeleteDialogOpen(true);
  };

  // Filter out users who are already team members
  const availableUsers = users.filter(
    (user: any) =>
      !teamMembers.some((member: any) => member.userId === user.id)
  );

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'coach':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoadingMembers) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setIsAddingMember(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.length > 0 ? (
              teamMembers.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {member.user?.profilePicture && (
                        <img
                          src={member.user.profilePicture}
                          alt={member.user.username}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{member.user?.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          @{member.user?.username}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.user?.position || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {member.user?.email && (
                        <span className="text-xs">{member.user.email}</span>
                      )}
                      {member.user?.phoneNumber && (
                        <span className="text-xs">{member.user.phoneNumber}</span>
                      )}
                      {!member.user?.email && !member.user?.phoneNumber && 'No contact info'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={() => openDeleteDialog(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No team members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a user to this team and assign their role.
            </DialogDescription>
          </DialogHeader>

          {isLoadingUsers ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select User</label>
                <Select onValueChange={(value) => setSelectedUserId(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length > 0 ? (
                      availableUsers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName} (@{user.username})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm">
                        No available users to add
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role in Team</label>
                <Select
                  defaultValue="player"
                  onValueChange={(value) => setSelectedRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingMember(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={addMemberMutation.isPending || !selectedUserId}
            >
              {addMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditingMember} onOpenChange={setIsEditingMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.user?.fullName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role in Team</label>
              <Select
                defaultValue={selectedRole}
                onValueChange={(value) => setSelectedRole(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingMember(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMember}
              disabled={updateMemberMutation.isPending}
            >
              {updateMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.user?.fullName} from this team?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}