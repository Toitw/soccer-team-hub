import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Extend the insert schema with validation
const addUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

type AddUserFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function AddUserForm({ onSuccess, onCancel }: AddUserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Set up form
  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "player",
      email: "",
      phoneNumber: "",
      profilePicture: "",
      position: "",
      jerseyNumber: undefined,
    },
  });

  // Create user mutation
  const mutation = useMutation({
    mutationFn: (values: AddUserFormValues) => {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userData } = values;
      return apiRequest('/api/admin/users', {
        method: 'POST',
        data: userData,
      });
    },
    onSuccess: (data) => {
      // 1) Invalidate admin users list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      // 2) Invalidate all team-related queries
      queryClient.invalidateQueries({
        predicate: (query: any) => 
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/teams')
      });
      
      // 2.1) Specifically target team members lists
      queryClient.invalidateQueries({
        predicate: (query: any) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("/api/teams") &&
          query.queryKey[0].includes("/members")
      });
      
      // 3) Invalidate any individual user queries
      queryClient.invalidateQueries({
        predicate: (query: any) => 
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/users')
      });
      
      // 3.1) Specifically target user-by-ID queries
      queryClient.invalidateQueries({
        predicate: (query: any) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("/api/users/")
      });
      
      toast({
        titleKey: "toasts.success",
        description: `Usuario creado: ${data.fullName}`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        titleKey: 'toasts.error',
        descriptionKey: 'toasts.actionFailed',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: AddUserFormValues) => {
    mutation.mutate(values);
  };

  // Handle avatar preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue("profilePicture", value);
    setAvatarPreview(value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Username field */}
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

          {/* Full Name field */}
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

          {/* Password field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Role field */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="superuser">Superuser</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="colaborador">Collaborator</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Position field */}
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input placeholder="Forward, Midfielder, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Jersey Number field */}
          <FormField
            control={form.control}
            name="jerseyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jersey Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                        ? parseInt(e.target.value)
                        : undefined;
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone Number field */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Profile Picture field */}
          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Profile Picture URL</FormLabel>
                <div className="flex space-x-4">
                  <FormControl>
                    <Input
                      placeholder="https://example.com/avatar.png"
                      {...field}
                      onChange={handleAvatarChange}
                    />
                  </FormControl>
                  {avatarPreview && (
                    <div className="flex-shrink-0">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-10 w-10 rounded-full object-cover"
                        onError={() => setAvatarPreview(null)}
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
            Create User
          </Button>
        </div>
      </form>
    </Form>
  );
}