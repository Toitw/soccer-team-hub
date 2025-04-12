import { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  RefreshCw, 
  UserCog, 
  Shield,
  ShieldAlert,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { User as UserType } from '@shared/schema';
import { AddUserForm } from './add-user-form';
import { EditUserForm } from './edit-user-form';

export default function UsersPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users
  const { data: apiResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });
  
  // Handle errors from the query
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading users',
        description: 'There was a problem loading the user data.',
        variant: 'destructive',
      });
      console.error('Error loading users:', error);
    }
  }, [error, toast]);

  // Convert the API response to an array, ensuring we always have an array even if the API returns unexpected data
  const users = Array.isArray(apiResponse) ? apiResponse : apiResponse ? [apiResponse] : [];

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
    (user: UserType) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.position && user.position.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle user deletion
  const handleDeleteUser = () => {
    if (currentUserId) {
      deleteMutation.mutate(currentUserId);
    }
  };

  // Open edit user modal
  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setCurrentUserId(user.id);
    setIsEditUserOpen(true);
  };

  // Open delete confirmation modal
  const confirmDelete = (user: UserType) => {
    setSelectedUser(user);
    setCurrentUserId(user.id);
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
            Manage users, their roles, and profiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, username, role, email, or position..."
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
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: UserType) => (
                    <TableRow key={user.id}>
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
                              <User className="h-4 w-4" />
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
                      <TableCell>{user.position || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.email && (
                            <div className="text-muted-foreground">{user.email}</div>
                          )}
                          {user.phoneNumber && (
                            <div className="text-muted-foreground">{user.phoneNumber}</div>
                          )}
                          {!user.email && !user.phoneNumber && 'N/A'}
                        </div>
                      </TableCell>
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
                            disabled={user.role === 'superuser'} // Prevent deleting superusers
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
              Are you sure you want to delete this user? This action cannot be undone.
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