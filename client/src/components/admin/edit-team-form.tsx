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
import { Loader2, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Team } from '@shared/schema';

// Schema for editing a team
const teamEditSchema = z.object({
  name: z.string().min(2, 'Team name is required'),
  logo: z.string().optional(),
  division: z.string().optional(),
  seasonYear: z.string().optional(),
});

type TeamEditFormData = z.infer<typeof teamEditSchema>;

interface EditTeamFormProps {
  team: Team;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditTeamForm({ team, onSuccess, onCancel }: EditTeamFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingJoinCode, setIsGeneratingJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(team.joinCode);

  // Define the form with validation
  const form = useForm<TeamEditFormData>({
    resolver: zodResolver(teamEditSchema),
    defaultValues: {
      name: team.name || '',
      logo: team.logo || '',
      division: team.division || '',
      seasonYear: team.seasonYear || '',
    },
  });

  // Update team mutation
  const updateTeam = useMutation({
    mutationFn: (data: TeamEditFormData) => {
      return apiRequest(`/api/admin/teams/${team.id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Team Updated',
        description: 'The team has been updated successfully.',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Generate join code mutation
  const generateJoinCode = useMutation({
    mutationFn: () => {
      return apiRequest(`/api/admin/teams/${team.id}/join-code`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      setJoinCode(data.joinCode);
      toast({
        title: 'Join Code Generated',
        description: `New join code: ${data.joinCode}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate join code. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsGeneratingJoinCode(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: TeamEditFormData) => {
    setIsLoading(true);
    updateTeam.mutate(data);
  };

  // Handle join code generation
  const handleGenerateJoinCode = () => {
    setIsGeneratingJoinCode(true);
    generateJoinCode.mutate();
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

        {/* Join Code Field (not editable directly) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <label className="text-sm font-medium">Join Code</label>
              <p className="text-xs text-muted-foreground">Used for players to join the team</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateJoinCode}
              disabled={isGeneratingJoinCode}
            >
              {isGeneratingJoinCode ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>
          <div className="bg-muted rounded-md p-2 text-center font-mono">
            {joinCode || 'No join code available'}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Team
          </Button>
        </div>
      </form>
    </Form>
  );
}