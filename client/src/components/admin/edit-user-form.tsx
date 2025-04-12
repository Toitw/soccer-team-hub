import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Schema for editing a user
const userEditSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  role: z.enum(['superuser', 'admin', 'coach', 'player']),
  profilePicture: z.string().optional(),
  position: z.string().optional(),
  jerseyNumber: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  password: z.string().optional().or(z.literal('')),
});

type UserEditFormData = z.infer<typeof userEditSchema>;

interface EditUserFormProps {
  user: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Convert numeric jersey number to string for the form
  const jerseyNumberStr = user.jerseyNumber !== null ? user.jerseyNumber.toString() : '';

  // Define the form with validation
  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'player',
      profilePicture: user.profilePicture || '',
      position: user.position || '',
      jerseyNumber: jerseyNumberStr,
      phoneNumber: user.phoneNumber || '',
      password: '',
    },
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: (data: UserEditFormData) => {
      return apiRequest(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'User Updated',
        description: 'The user has been updated successfully.',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: UserEditFormData) => {
    setIsLoading(true);
    
    // Clean up data before submission
    const formData = { ...data };
    
    // Only include password if it was provided
    if (!formData.password) {
      delete formData.password;
    }
    
    // Convert jersey number to number if provided
    if (formData.jerseyNumber) {
      formData.jerseyNumber = formData.jerseyNumber.toString();
    }
    
    updateUser.mutate(formData);
  };

  // Handle original role to determine if role can be changed
  const isOriginalSuperuser = user.role === 'superuser';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Username</p>
            <p className="rounded-md border border-input px-3 py-2 text-sm bg-muted">
              {user.username}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password (optional)</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Leave blank to keep current" {...field} />
                </FormControl>
                <FormDescription>Only fill this if you want to change the password</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} />
              </FormControl>
              <FormDescription>Contact email for the user</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isOriginalSuperuser}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isOriginalSuperuser ? (
                    <SelectItem value="superuser">Superuser</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="superuser">Superuser</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {isOriginalSuperuser
                  ? 'Superuser role cannot be changed'
                  : 'Determines the user\'s permissions in the system'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Picture URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/image.jpg" {...field} />
                </FormControl>
                <FormDescription>User's profile image URL</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Show position for all users */}
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input placeholder="Forward, Goalkeeper, etc." {...field} />
                </FormControl>
                <FormDescription>Position on the field</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jerseyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jersey Number</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10" {...field} />
                </FormControl>
                <FormDescription>Player's jersey number</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormDescription>Contact number</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update User
          </Button>
        </div>
      </form>
    </Form>
  );
}