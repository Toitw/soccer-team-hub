import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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

// Create a partial schema for editing (password is optional)
const editUserSchema = insertUserSchema
  .partial()
  .extend({
    changePassword: z.boolean().default(false),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If changePassword is true, then password and confirmPassword are required and must match
      if (data.changePassword) {
        return data.password && data.confirmPassword && data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

type EditUserFormValues = z.infer<typeof editUserSchema>;

type EditUserFormProps = {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
};

export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.profilePicture);
  const [changePassword, setChangePassword] = useState(false);

  // Set up form with safe default values (converting null to empty string to avoid type errors)
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      profilePicture: user.profilePicture || "",
      position: user.position || "",
      jerseyNumber: user.jerseyNumber || undefined,
      changePassword: false,
      password: "",
      confirmPassword: "",
    },
  });

  // Watch for password change checkbox
  const watchChangePassword = form.watch("changePassword");
  
  // Update local state when checkbox changes
  useEffect(() => {
    setChangePassword(watchChangePassword);
  }, [watchChangePassword]);

  // Update user mutation
  const mutation = useMutation({
    mutationFn: (values: EditUserFormValues) => {
      // Process form data
      const { confirmPassword, changePassword, ...userData } = values;
      
      // If we're not changing the password, remove it from the request
      if (!changePassword) {
        delete userData.password;
      }
      
      return apiRequest(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        data: userData,
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'User Updated',
        description: `Successfully updated user ${data.fullName}.`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: EditUserFormValues) => {
    mutation.mutate(values);
  };

  // Handle avatar preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || ""; // Ensure we always have a string
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

          {/* Change Password checkbox */}
          <FormField
            control={form.control}
            name="changePassword"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Change Password</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {/* Password fields (conditionally shown) */}
          {changePassword && (
            <>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
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
            </>
          )}

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
            render={({ field }) => {
              // Convert null to empty string to avoid type errors
              const safeValue = field.value ?? "";
              return (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      value={safeValue}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Position field */}
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => {
              const safeValue = field.value ?? "";
              return (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Forward, Midfielder, etc."
                      {...field}
                      value={safeValue}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
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
                    value={field.value || ""}
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
            render={({ field }) => {
              const safeValue = field.value ?? "";
              return (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+1234567890" 
                      {...field}
                      value={safeValue}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Profile Picture field */}
          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => {
              const safeValue = field.value ?? "";
              return (
                <FormItem className="col-span-2">
                  <FormLabel>Profile Picture URL</FormLabel>
                  <div className="flex space-x-4">
                    <FormControl>
                      <Input
                        placeholder="https://example.com/avatar.png"
                        {...field}
                        value={safeValue}
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
              );
            }}
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
            Update User
          </Button>
        </div>
      </form>
    </Form>
  );
}