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

// Schema for adding a user
const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  role: z.enum(['superuser', 'admin', 'coach', 'player']),
  profilePicture: z.string().optional(),
  position: z.string().optional(),
  jerseyNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface AddUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  isSuperuser: boolean;
}

export function AddUserForm({ onSuccess, onCancel, isSuperuser }: AddUserFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Define the form with validation
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: isSuperuser ? 'superuser' : 'player',
      profilePicture: '',
      position: '',
      jerseyNumber: '',
      phoneNumber: '',
    },
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: (data: UserFormData) => {
      const endpoint = isSuperuser ? '/api/admin/superuser' : '/api/admin/users';
      return apiRequest(endpoint, {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'User Created',
        description: `The ${isSuperuser ? 'superuser' : 'user'} has been created successfully.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    
    // Convert jersey number to number if provided
    if (data.jerseyNumber) {
      data.jerseyNumber = data.jerseyNumber.toString();
    }
    
    createUser.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
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
              <FormDescription>Optional contact email for the user</FormDescription>
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
                disabled={isSuperuser}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isSuperuser ? (
                    <SelectItem value="superuser">Superuser</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {isSuperuser
                  ? 'Superusers have complete administrative access'
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
                <FormDescription>Optional profile image URL</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Only show position for players */}
          {(form.watch('role') === 'player' || form.watch('role') === 'coach') && (
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="Forward, Goalkeeper, etc." {...field} />
                  </FormControl>
                  <FormDescription>Player's position on the field</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Only show jersey number for players */}
        {form.watch('role') === 'player' && (
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
                  <FormDescription>Optional contact number</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSuperuser ? 'Add Superuser' : 'Add User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}