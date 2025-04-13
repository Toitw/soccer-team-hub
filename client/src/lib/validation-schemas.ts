import { z } from "zod";

/**
 * Password validation schema with security requirements
 */
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .refine(
    password => /[A-Z]/.test(password),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    password => /[0-9]/.test(password),
    "Password must contain at least one number"
  )
  .refine(
    password => /[^A-Za-z0-9]/.test(password),
    "Password must contain at least one special character"
  );

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email("Invalid email format")
  .max(255, "Email is too long");

/**
 * Username validation schema
 */
export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .refine(
    username => /^[a-zA-Z0-9_.-]+$/.test(username),
    "Username can only contain letters, numbers, underscores, dots, and hyphens"
  );

/**
 * Login form schema - uses enhanced validation
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * Registration form schema with all security validations
 */
export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  role: z.enum(["player", "coach", "admin"]),
  email: emailSchema,
  joinCode: z.string().optional(),
  agreedToTerms: z.boolean().refine(val => val, {
    message: "You must agree to the terms and conditions"
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;