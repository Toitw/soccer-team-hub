/**
 * Authentication routes for Cancha+ application
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage-implementation";
import { hashPassword } from "../auth";
import { isAuthenticated } from "../auth-middleware";
import { generateRandomCode } from "../utils";

// Create a router for auth-related routes
const router = Router();

// Schema for registration data validation
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "coach", "player"]),
  teamCode: z.string().optional()
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
    
    // Generate username from email (before @ symbol)
    const username = validatedData.email.split('@')[0];
    
    // Create the user
    const user = await storage.createUser({
      username,
      password: validatedData.password, // Will be hashed in storage implementation
      fullName: `${validatedData.firstName} ${validatedData.lastName}`,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      role: validatedData.role,
      onboardingCompleted: false
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
      logo: z.string().optional(),
    });
    
    const validatedData = teamSchema.parse(req.body);
    
    // Generate unique join code
    const joinCode = generateRandomCode(6);
    
    // Create team
    const team = await storage.createTeam({
      name: validatedData.name,
      category: validatedData.category,
      teamType: validatedData.teamType,
      division: validatedData.division || null,
      seasonYear: validatedData.seasonYear || null,
      logo: validatedData.logo || null,
      createdById: userId,
      joinCode
    });
    
    // Add current user as team admin with required fields
    await storage.createTeamMember({
      teamId: team.id,
      fullName: user.fullName,
      createdById: userId,
      userId: userId,
      role: "admin",
      isVerified: true
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