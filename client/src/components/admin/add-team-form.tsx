import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertTeamSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Create a schema for the add team form
const addTeamSchema = insertTeamSchema.omit({ 
  createdById: true, 
  joinCode: true 
});

type AddTeamFormValues = z.infer<typeof addTeamSchema>;

type AddTeamFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function AddTeamForm({ onSuccess, onCancel }: AddTeamFormProps) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Set up form
  const form = useForm<AddTeamFormValues>({
    resolver: zodResolver(addTeamSchema),
    defaultValues: {
      name: "",
      division: "",
      seasonYear: new Date().getFullYear().toString(),
      logo: "",
    },
  });

  // Create team mutation
  const mutation = useMutation({
    mutationFn: (values: AddTeamFormValues) => {
      return apiRequest('/api/admin/teams', {
        method: 'POST',
        data: values,
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Team Created',
        description: `Successfully created team ${data.name}.`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: AddTeamFormValues) => {
    mutation.mutate(values);
  };

  // Handle logo preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue("logo", value);
    setLogoPreview(value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Team Name field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Team Name</FormLabel>
                <FormControl>
                  <Input placeholder="City Football Club" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Division field */}
          <FormField
            control={form.control}
            name="division"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Division</FormLabel>
                <FormControl>
                  <Input placeholder="Premier League, Division 1, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Season Year field */}
          <FormField
            control={form.control}
            name="seasonYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Season Year</FormLabel>
                <FormControl>
                  <Input placeholder="2023" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Logo URL field */}
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Team Logo URL</FormLabel>
                <div className="flex space-x-4">
                  <FormControl>
                    <Input
                      placeholder="https://example.com/logo.png"
                      {...field}
                      onChange={handleLogoChange}
                    />
                  </FormControl>
                  {logoPreview && (
                    <div className="flex-shrink-0">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-10 w-10 rounded-full object-cover"
                        onError={() => setLogoPreview(null)}
                      />
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Team
          </Button>
        </div>
      </form>
    </Form>
  );
}