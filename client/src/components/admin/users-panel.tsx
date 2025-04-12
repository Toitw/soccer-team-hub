import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { AddUserForm } from './add-user-form';
import { EditUserForm } from './edit-user-form';

export default function AdminUsersPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddSuperuserOpen, setIsAddSuperuserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: 'User deleted',
        description: 'The user has been deleted successfully.',
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user: any) =>
      user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle user deletion
  const handleDeleteUser = () => {
    if (currentUserId) {
      deleteMutation.mutate(currentUserId);
    }
  };

  // Open edit user modal
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setCurrentUserId(user.id);
    setIsEditUserOpen(true);
  };

  // Open delete confirmation modal
  const confirmDelete = (user: any) => {
    setCurrentUserId(user.id);
    setIsDeleteDialogOpen(true);
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superuser':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'coach':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Users Management</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsAddSuperuserOpen(true)}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Add Superuser
              </Button>
              <Button onClick={() => setIsAddUserOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage all users in the system. You can add, edit, or remove users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {user.profilePicture && (
                            <img
                              src={user.profilePicture}
                              alt={user.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{user.fullName}</span>
                            <span className="text-xs text-muted-foreground">@{user.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive"
                            onClick={() => confirmDelete(user)}
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
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </CardFooter>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user in the system. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <AddUserForm
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
              setIsAddUserOpen(false);
            }}
            onCancel={() => setIsAddUserOpen(false)}
            isSuperuser={false}
          />
        </DialogContent>
      </Dialog>

      {/* Add Superuser Dialog */}
      <Dialog open={isAddSuperuserOpen} onOpenChange={setIsAddSuperuserOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Superuser</DialogTitle>
            <DialogDescription>
              Create a new superuser with full system access. Use with caution.
            </DialogDescription>
          </DialogHeader>
          <AddUserForm
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
              setIsAddSuperuserOpen(false);
            }}
            onCancel={() => setIsAddSuperuserOpen(false)}
            isSuperuser={true}
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information for {selectedUser.username}.
              </DialogDescription>
            </DialogHeader>
            <EditUserForm
              user={selectedUser}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                setIsEditUserOpen(false);
              }}
              onCancel={() => setIsEditUserOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will remove the user from all teams.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}