/**
 * Authentication routes for the API
 */
import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage-implementation";
import { generateVerificationToken, generateTokenExpiry, comparePasswords, hashPassword } from "@shared/auth-utils";
import { isAuthenticated } from "./auth-middleware";
import { generateVerificationEmail, generatePasswordResetEmail, sendEmail } from "@shared/email-utils";
import { z } from "zod";
import { randomBytes } from "crypto";

// Function to generate a random join code
function generateRandomCode(length: number): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding 0, 1, I, O
  let result = '';
  
  const randomBytesBuffer = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters[randomBytesBuffer[i] % characters.length];
  }
  
  return result;
}

// Create a router
const router = Router();

/**
 * Route to request email verification
 * POST /api/auth/verify-email/request
 */
router.post("/verify-email/request", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get the user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a verification token
    const token = generateVerificationToken();
    const expires = generateTokenExpiry(24); // 24 hours

    // Store the token in the user record
    await storage.updateUser(userId, {
      verificationToken: token,
      verificationTokenExpiry: expires
    });

    // Generate the verification link
    const baseUrl = `${req.protocol}://${req.get("host")}/verify-email`;
    
    // Generate and send verification email
    const emailContent = generateVerificationEmail(
      user.username,
      token,
      baseUrl
    );

    // Send the email using nodemailer
    const emailResult = await sendEmail(
      user.email || '',
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send verification email", message: emailResult.message });
    }

    return res.status(200).json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Email verification request error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to process verification request" });
  }
});

/**
 * Route to verify email with token
 * GET /api/auth/verify-email/:token
 */
router.get("/verify-email/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find user with this verification token
    const users = await storage.getAllUsers();
    const user = users.find((u: any) => u.verificationToken === token);
    
    if (!user) {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    // Check if token is expired
    const now = new Date();
    if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < now) {
      return res.status(400).json({ error: "Verification token expired" });
    }

    // Update user as verified
    await storage.updateUser(user.id, {
      isEmailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null
    });

    return res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to verify email" });
  }
});

/**
 * Route to request password reset
 * POST /api/auth/reset-password/request
 */
router.post("/reset-password/request", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user with this email
    const users = await storage.getAllUsers();
    const user = users.find((u: any) => u.email === email);
    
    // For security reasons, always return success even if user not found
    if (!user) {
      return res.status(200).json({ success: true, message: "Password reset email sent" });
    }

    // Generate a reset token
    const token = generateVerificationToken();
    const expires = generateTokenExpiry(1); // 1 hour

    // Store the token in the user record
    await storage.updateUser(user.id, {
      resetPasswordToken: token,
      resetPasswordTokenExpiry: expires
    });

    // Generate the reset link
    const baseUrl = `${req.protocol}://${req.get("host")}/reset-password`;
    
    // Generate and send reset email
    const emailContent = generatePasswordResetEmail(
      user.username,
      token,
      baseUrl
    );

    // Send the email using nodemailer
    const emailResult = await sendEmail(
      user.email || '',
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send password reset email", message: emailResult.message });
    }

    return res.status(200).json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to process password reset request" });
  }
});

/**
 * Route to reset password with token
 * POST /api/auth/reset-password
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    // Find user with this reset token
    const users = await storage.getAllUsers();
    const user = users.find((u: any) => u.resetPasswordToken === token);
    
    if (!user) {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    // Check if token is expired
    const now = new Date();
    if (user.resetPasswordTokenExpiry && new Date(user.resetPasswordTokenExpiry) < now) {
      return res.status(400).json({ error: "Reset token expired" });
    }

    // Update user password and clear reset token
    // We need to hash the password before updating
    const hashedPassword = await hashPassword(password);
    
    await storage.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordTokenExpiry: null
    });

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to reset password" });
  }
});

// Schema for registration data validation
const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "coach", "player"]),
  teamCode: z.string().optional(),
  agreedToTerms: z.boolean().optional()
});

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    
    // Check if email already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Generate a verification token and expiry
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = generateTokenExpiry(24); // 24 hours
    
    // Create the user with verification token
    const user = await storage.createUser({
      username: validatedData.username,
      password: validatedData.password, // Will be hashed in storage implementation
      fullName: validatedData.fullName,
      firstName: null, // We'll extract these later if needed
      lastName: null,  // We'll extract these later if needed
      email: validatedData.email,
      role: validatedData.role,
      onboardingCompleted: false,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpiry
    });
    
    // If teamCode is provided, try to join the team
    if (validatedData.teamCode) {
      const team = await storage.getTeamByJoinCode(validatedData.teamCode);
      
      if (team) {
        // Create team member relationship
        await storage.createTeamMember({
          teamId: team.id,
          userId: user.id,
          role: validatedData.role === "admin" ? "admin" : 
                validatedData.role === "coach" ? "coach" : "player"
        });
        
        // Mark onboarding as completed
        await storage.updateUser(user.id, { onboardingCompleted: true });
        
        // Update the user object for response
        user.onboardingCompleted = true;
      }
    }

    // Generate the verification link
    const baseUrl = `${req.protocol}://${req.get("host")}/verify-email`;
    
    // Generate and send verification email
    const emailContent = generateVerificationEmail(
      user.username,
      verificationToken,
      baseUrl
    );

    // Send the verification email
    sendEmail(
      user.email || '',
      emailContent.subject,
      emailContent.html,
      emailContent.text
    ).then(emailResult => {
      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.message);
      } else {
        console.log("Verification email sent successfully");
      }
    }).catch(err => {
      console.error("Error sending verification email:", err);
    });

    // Start session
    req.login(user, (err) => {
      if (err) {
        console.error("Error logging in after registration:", err);
        return res.status(500).json({ error: "Failed to create session" });
      }
      
      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * Complete user onboarding
 * POST /api/auth/onboarding/complete
 */
router.post("/onboarding/complete", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    
    // Mark onboarding as completed
    const updatedUser = await storage.updateUser(userId, { onboardingCompleted: true });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Return updated user data
    const { password, ...userWithoutPassword } = updatedUser;
    return res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

/**
 * Join team with code
 * POST /api/auth/onboarding/join-team
 */
router.post("/onboarding/join-team", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { teamCode } = req.body;
    const userId = (req.user as any).id;
    
    if (!teamCode) {
      return res.status(400).json({ error: "Team code is required" });
    }
    
    // Find team by code
    const team = await storage.getTeamByJoinCode(teamCode);
    
    if (!team) {
      return res.status(404).json({ error: "Invalid team code" });
    }
    
    // Check if user is already a member of this team
    const existingMembership = await storage.getTeamMember(team.id, userId);
    
    if (existingMembership) {
      return res.status(400).json({ error: "Already a member of this team" });
    }
    
    // Get user to determine role
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Create team member relationship
    await storage.createTeamMember({
      teamId: team.id,
      userId: userId,
      role: user.role === "admin" ? "admin" : 
            user.role === "coach" ? "coach" : "player"
    });
    
    // Mark onboarding as completed
    const updatedUser = await storage.updateUser(userId, { onboardingCompleted: true });
    
    // Return updated user and team info
    const { password, ...userWithoutPassword } = updatedUser!;
    return res.json({ 
      user: userWithoutPassword,
      team
    });
  } catch (error) {
    console.error("Error joining team:", error);
    return res.status(500).json({ error: "Failed to join team" });
  }
});

/**
 * Create a new team (for admins only)
 * POST /api/auth/onboarding/create-team
 */
router.post("/onboarding/create-team", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user is an admin
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create teams" });
    }
    
    // Validate team data
    const teamSchema = z.object({
      name: z.string().min(1, "Team name is required"),
      category: z.enum(["PROFESSIONAL", "FEDERATED", "AMATEUR"]),
      teamType: z.enum(["11-a-side", "7-a-side", "Futsal"]),
      division: z.string().optional(),
      seasonYear: z.string().optional(),
      logo: z.string().optional()
    });
    
    const validatedData = teamSchema.parse(req.body);
    
    // Generate unique join code
    const joinCode = generateRandomCode(6);
    
    // Create team data object
    const teamData = {
      name: validatedData.name,
      category: validatedData.category,
      teamType: validatedData.teamType,
      division: validatedData.division || null,
      seasonYear: validatedData.seasonYear || null,
      logo: validatedData.logo || null,
      createdById: userId,
      joinCode
    };
    
    console.log("Creating team with data:", teamData);
    
    // Create team
    const team = await storage.createTeam(teamData);
  
    // Add current user as team admin
    await storage.createTeamMember({
      teamId: team.id,
      userId: userId,
      role: "admin"
    });
    
    // Mark onboarding as completed
    const updatedUser = await storage.updateUser(userId, { onboardingCompleted: true });
    
    // Return created team with join code
    return res.status(201).json({
      team,
      user: updatedUser
    });
  } catch (error) {
    console.error("Error creating team:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: "Failed to create team" });
  }
});

export default router;