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
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  RefreshCw, 
  Shield, 
  ShieldAlert,
  UserCog
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';
// We'll implement these components later
import { AddUserForm } from './add-user-form';
import { EditUserForm } from './edit-user-form';

export default function UsersPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
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
    (user: User) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle user deletion
  const handleDeleteUser = () => {
    if (currentUserId) {
      deleteMutation.mutate(currentUserId);
    }
  };

  // Open edit user modal
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setCurrentUserId(user.id);
    setIsEditUserOpen(true);
  };

  // Open delete confirmation modal
  const confirmDelete = (user: User) => {
    setSelectedUser(user);
    setCurrentUserId(user.id);
    setIsDeleteDialogOpen(true);
  };

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
            <Button onClick={() => setIsAddUserOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
          <CardDescription>
            Manage all users in the system. You can add, edit, or remove users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, username, role, or email..."
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
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
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
                          <span className="font-medium">{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          <div className="flex items-center">
                            {getRoleIcon(user.role)}
                            {user.role}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive"
                            onClick={() => confirmDelete(user)}
                            title="Delete user"
                            disabled={user.role === 'superuser'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
                Update user information for {selectedUser.fullName}.
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
              Are you sure you want to delete this user? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteMutation.isPending || (selectedUser?.role === 'superuser')}
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