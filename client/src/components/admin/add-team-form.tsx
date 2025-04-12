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
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Schema for adding a team
const teamSchema = z.object({
  name: z.string().min(2, 'Team name is required'),
  logo: z.string().optional(),
  division: z.string().optional(),
  seasonYear: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamSchema>;

interface AddTeamFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddTeamForm({ onSuccess, onCancel }: AddTeamFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Define the form with validation
  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      logo: '',
      division: '',
      seasonYear: new Date().getFullYear().toString(),
    },
  });

  // Create team mutation
  const createTeam = useMutation({
    mutationFn: (data: TeamFormData) => {
      return apiRequest('/api/admin/teams', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Team Created',
        description: 'The team has been created successfully.',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: TeamFormData) => {
    setIsLoading(true);
    createTeam.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Real Madrid" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="division"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Division</FormLabel>
                <FormControl>
                  <Input placeholder="First Division" {...field} />
                </FormControl>
                <FormDescription>League or division name</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seasonYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Season Year</FormLabel>
                <FormControl>
                  <Input placeholder={new Date().getFullYear().toString()} {...field} />
                </FormControl>
                <FormDescription>Current season year</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Logo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/logo.png" {...field} />
              </FormControl>
              <FormDescription>URL to the team's logo image</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Team
          </Button>
        </div>
      </form>
    </Form>
  );
}