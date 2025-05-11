import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, User } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Create a partial schema for editing (password optional)
const editUserSchema = insertUserSchema
  .partial()
  .extend({
    changePassword: z.boolean().default(false),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.changePassword) {
        return (
          typeof data.password === "string" &&
          data.password.length >= 6 &&
          data.confirmPassword === data.password
        );
      }
      return true;
    },
    {
      message: (data) => {
        if (!data.changePassword) return "";
        if (!data.password || data.password.length < 6) {
          return "Password must be at least 6 characters";
        }
        return "Passwords do not match";
      },
      path: ["confirmPassword"],
    },
  );

type EditUserFormValues = z.infer<typeof editUserSchema>;

type EditUserFormProps = {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
};

export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.profilePicture,
  );

  const form = useForm<EditUserFormValues>({
    mode: "onChange",
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      profilePicture: user.profilePicture || "",
      position: user.position || "",
      jerseyNumber: user.jerseyNumber ?? undefined,
      changePassword: false,
      // ← make these undefined so optional schema skips them
      password: undefined,
      confirmPassword: undefined,
    },
  });

  // Watch for changePassword toggle
  const watchChangePassword = form.watch("changePassword");
  useEffect(() => {
    if (!watchChangePassword) {
      form.setValue("password", "");
      form.setValue("confirmPassword", "");
    }
  }, [watchChangePassword, form]);

  // Mutation to update user
  const mutation = useMutation({
    mutationFn: (values: EditUserFormValues) => {
      const { confirmPassword, changePassword, ...userData } = values;
      if (!changePassword) delete userData.password;
      return apiRequest(`/api/admin/users/${user.id}`, {
        method: "PUT",
        data: userData,
      });
    },
    onSuccess: (data) => {
      // 1) Invalidate admin users list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      // 2) Invalidate all team-related queries and team members lists
      queryClient.invalidateQueries({
        predicate: query => 
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/teams')
      });
      
      // 2.1) Specifically target team members lists to ensure role updates are reflected
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("/api/teams") &&
          query.queryKey[0].includes("/members")
      });
      
      // 3) Invalidate current user data if the updated user is the logged-in user
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // 4) Invalidate any individual user queries
      queryClient.invalidateQueries({
        predicate: query => 
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/users')
      });
      
      // 4.1) Specifically target user-by-ID queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("/api/users/")
      });
      
      // 5) Invalidate auth context
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      
      toast({ title: "User Updated", description: `Updated ${data.fullName}` });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EditUserFormValues) => {
    mutation.mutate(values);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue("profilePicture", url);
    setAvatarPreview(url);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John Doe" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="changePassword"
            render={({ field }) => (
              <FormItem className="flex items-start space-x-3 col-span-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Change Password</FormLabel>
              </FormItem>
            )}
          />

          {watchChangePassword && (
            <>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superuser">Superuser</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="colaborador">Collaborator</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="jerseyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jersey Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      )
                    }
                  />
                </FormControl>
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Profile Picture URL</FormLabel>
                <div className="flex items-center space-x-4">
                  <FormControl>
                    <Input {...field} onChange={handleAvatarChange} />
                  </FormControl>
                  {avatarPreview && (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-10 w-10 rounded-full object-cover"
                      onError={() => setAvatarPreview(null)}
                    />
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
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            )}
            Update User
          </Button>
        </div>
      </form>
    </Form>
  );
}
