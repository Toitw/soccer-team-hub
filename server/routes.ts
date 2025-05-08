import express, { type Express, Router } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-implementation";
import { hashPassword } from "@shared/auth-utils";
import { hashPasswordInStorage } from "./optimized-storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { createAdminRouter } from "./routes/admin-routes";
import authRoutes from "./auth-routes";
import { checkDatabaseHealth } from "./db-health";
import { db, pool } from "./db";

// Mock data creation has been disabled
async function createMockData() {
  // This function has been modified to no longer create any mock players
  // It now returns an empty array of users
  const generateMockPlayers = () => {
    // Return an empty array instead of generating random players
    return [];
  };

  const mockUsers = generateMockPlayers();

  // Create a mock team
  const mockTeam = {
    id: Math.floor(Math.random() * 1000) + 100,
    name: "Team FC",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Football_pictogram.svg",
    division: "League Division",
    createdAt: new Date(),
    createdById: 1
  };

  return { mockUsers, mockTeam };
}

// Function to generate a unique, readable join code
function generateJoinCode(): string {
  // Generate a 6-character alphanumeric code (excluding similar looking characters)
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding 0, 1, I, O
  const codeLength = 6;
  let joinCode = '';
  
  // Generate random characters
  const randomBytesBuffer = randomBytes(codeLength);
  for (let i = 0; i < codeLength; i++) {
    joinCode += characters[randomBytesBuffer[i] % characters.length];
  }
  
  return joinCode;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Register our custom auth routes for email verification and password reset
  app.use('/api/auth', authRoutes);
  
  // Register admin routes using the imported admin router that has our fixes
  const adminRouter = createAdminRouter(storage);
  
  // Attach admin router to main app
  app.use('/api', adminRouter);

  // Database monitoring endpoints
  app.get("/api/health", async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Detailed database health endpoint (for authenticated superusers only)
  app.get("/api/admin/database/health", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user is a superuser
      if (req.user.role !== 'superuser') {
        return res.status(403).json({ error: "Not authorized to access database health information" });
      }
      
      // Run the comprehensive database health check
      const healthData = await checkDatabaseHealth();
      
      res.json(healthData);
    } catch (error) {
      console.error("Error checking database health:", error);
      res.status(500).json({ 
        error: "Failed to check database health",
        details: String(error)
      });
    }
  });

  const httpServer = createServer(app);

  // Route to create a new team for the user
  app.post("/api/mock-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // First, get user's current teams to avoid duplicate default teams
      const existingTeams = await storage.getTeamsByUserId(req.user.id);
      if (existingTeams.length > 0) {
        return res.json({
          message: "User already has a team",
          details: {
            team: existingTeams[0].name,
            info: "You already have a team set up."
          }
        });
      }

      // Generate a join code for the team
      const joinCode = generateJoinCode();
      
      // Create a basic empty team specifically for this user
      // Use direct SQL to bypass the schema validation with pool.query
      const result = await pool.query(
        `INSERT INTO teams (name, logo, division, season_year, created_by_id, team_type, category, join_code, owner_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          "My Team",
          "https://upload.wikimedia.org/wikipedia/commons/5/5d/Football_pictogram.svg",
          "League Division",
          new Date().getFullYear().toString(),
          req.user.id,
          "11-a-side", 
          "AMATEUR",
          joinCode,
          req.user.id // Set owner_id to user's ID
        ]
      );
      
      const team = result.rows[0];

      console.log(`Created new team: ${team.name} (ID: ${team.id})`);

      // Always add the current user as admin of the new team
      await storage.createTeamMember({
        teamId: team.id,
        userId: req.user.id,
        role: "admin"
      });

      res.json({ 
        message: "Team created successfully", 
        details: {
          team: team.name,
          info: "You can add members manually from the team page."
        }
      });
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  // Team routes
  app.get("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teams = await storage.getTeamsByUserId(req.user.id);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Generate a join code for the team
      const joinCode = generateJoinCode();
      
      // Use direct SQL to create team with owner_id using pool.query
      const result = await pool.query(
        `INSERT INTO teams (
          name, logo, division, season_year, created_by_id, team_type, 
          category, join_code, owner_id, created_at, updated_at,
          description, website, primary_color, secondary_color, is_public
        ) 
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(),
          $10, $11, $12, $13, $14
        )
        RETURNING *`,
        [
          req.body.name || "My Team",
          req.body.logo || "/default-team-logo.png",
          req.body.division || null,
          req.body.seasonYear || new Date().getFullYear().toString(),
          req.user.id,
          req.body.teamType || "11-a-side",
          req.body.category || "AMATEUR",
          joinCode,
          req.user.id, // Set owner_id to user's ID
          req.body.description || null,
          req.body.website || null,
          req.body.primaryColor || null,
          req.body.secondaryColor || null,
          req.body.isPublic || true
        ]
      );
      
      const team = result.rows[0];

      // Always add the current user as the admin of the team they create
      await storage.createTeamMember({
        teamId: team.id,
        userId: req.user.id,
        role: "admin"
      });

      res.status(201).json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  });
  
  // Generate a new join code for a team
  app.post("/api/teams/:id/join-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      // Check if user has admin role for this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to generate join code for this team" });
      }
      
      // Generate a new unique join code
      const joinCode = generateJoinCode();
      
      // Update the team with the new join code
      const updatedTeam = await storage.updateTeam(teamId, { joinCode });
      if (!updatedTeam) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      res.json({ 
        message: "Join code generated successfully", 
        joinCode: updatedTeam.joinCode 
      });
    } catch (error) {
      console.error("Error generating join code:", error);
      res.status(500).json({ error: "Failed to generate join code" });
    }
  });

  // Validate a team join code (public route, no authentication required)
  app.get("/api/validate-join-code/:code", async (req, res) => {
    try {
      const joinCode = req.params.code;
      
      // Get the team with this join code, if any
      const team = await storage.getTeamByJoinCode(joinCode);
      
      if (team) {
        // Return minimal team info to avoid exposing sensitive team details
        return res.json({ 
          valid: true, 
          team: { 
            id: team.id, 
            name: team.name,
            logo: team.logo
          } 
        });
      } else {
        return res.json({ valid: false });
      }
    } catch (error) {
      console.error("Error validating join code:", error);
      res.status(500).json({ error: "Failed to validate join code" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);

      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });
  
  // Upload team logo (base64)
  app.post("/api/teams/:id/logo", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      
      // Get the team
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Check if user is admin of this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      if (teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can update team logo" });
      }
      
      // Get base64 data from request body
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: "No image data provided" });
      }
      
      // Update the team with the new logo (base64 data)
      const updatedTeam = await storage.updateTeam(teamId, {
        logo: imageData
      });
      
      res.json({ success: true, logo: imageData });
    } catch (error) {
      console.error("Error uploading team logo:", error);
      res.status(500).json({ error: "Failed to upload team logo" });
    }
  });

  // Update team settings
  app.patch("/api/teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      
      // Get the team
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Check if user is admin of this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      if (teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can update team settings" });
      }
      
      // Get update data from request body
      const { name, division, seasonYear, logo } = req.body;
      
      // Update the team
      const updatedTeam = await storage.updateTeam(teamId, {
        name,
        division,
        seasonYear,
        logo
      });
      
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  // Regenerate team join code
  app.post("/api/teams/:id/regenerate-join-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      
      // Get the team
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Check if user is admin of this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      if (teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can regenerate join codes" });
      }
      
      // Generate new join code
      const newJoinCode = generateJoinCode();
      
      // Update the team with new join code
      const updatedTeam = await storage.updateTeam(teamId, {
        joinCode: newJoinCode
      });
      
      res.json({ joinCode: newJoinCode });
    } catch (error) {
      console.error("Error regenerating join code:", error);
      res.status(500).json({ error: "Failed to regenerate join code" });
    }
  });

  // Team Members routes
  // Get specific team member by userId
  app.get("/api/teams/:id/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      // Check if user is a member of the team
      const userTeamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!userTeamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Get the requested team member
      const teamMember = await storage.getTeamMember(teamId, userId);
      if (!teamMember) {
        return res.status(404).json({ error: "Team member not found" });
      }

      res.json(teamMember);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team member" });
    }
  });

  // Get all team members
  app.get("/api/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      console.log(`GET /api/teams/${teamId}/members - Request from user: ${req.user.id}`);

      // Check if user is a member of the team
      const userTeamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!userTeamMember) {
        console.log(`User ${req.user.id} is not authorized to access team ${teamId}`);
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const teamMembers = await storage.getTeamMembers(teamId);
      console.log(`Found ${teamMembers.length} team members for team ${teamId}`);

      // Get user details for each team member
      const teamMembersWithUserDetails = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) {
            console.log(`No user found for team member with userId: ${member.userId}`);
            return null;
          }

          // Exclude password but include all other user fields explicitly
          const { password, ...userWithoutPassword } = user;
          return {
            ...member,
            user: {
              ...userWithoutPassword,
              // Explicitly ensure these fields are included
              profilePicture: user.profilePicture || "/default-avatar.png",
              position: user.position || "",
              jerseyNumber: user.jerseyNumber || null,
              email: user.email || "",
              phoneNumber: user.phoneNumber || ""
            },
          };
        })
      );

      const filteredMembers = teamMembersWithUserDetails.filter(Boolean);
      console.log(`Returning ${filteredMembers.length} team members with user details for team ${teamId}`);
      res.json(filteredMembers);
    } catch (error) {
      console.error(`Error fetching team members for team ${req.params.id}:`, error);
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Update a team member
  app.patch("/api/teams/:teamId/members/:memberId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);

      // Check if user has admin role for the team
      const userTeamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!userTeamMember || userTeamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update team members" });
      }

      // Validate the request body
      const { role, position, jerseyNumber, profilePicture } = req.body;

      // Get all team members and find the one with matching ID
      const members = await storage.getTeamMembers(teamId);
      const teamMember = members.find(member => member.id === memberId);

      if (!teamMember) {
        return res.status(404).json({ error: "Team member not found" });
      }

      console.log(`Updating team member ID: ${memberId} for user ID: ${teamMember.userId}`);

      // Update the team member role
      const updatedTeamMember = await storage.updateTeamMember(memberId, {
        role
      });

      // Update the user's profile data (position, jerseyNumber, profilePicture)
      const user = await storage.getUser(teamMember.userId);
      if (user) {
        console.log(`Updating user ${user.fullName} (ID: ${user.id}) with new data:`, {
          position,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber.toString()) : null,
          profilePicture: profilePicture ? "..." : "no change"
        });

        // Handle empty profile picture values
        const profilePictureValue = profilePicture === "" || profilePicture === null || profilePicture === undefined
          ? user.profilePicture  // Keep existing picture if empty
          : profilePicture;      // Otherwise use the new value

        const updatedUser = await storage.updateUser(user.id, {
          position,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber.toString()) : null,
          profilePicture: profilePictureValue
        });

        if (updatedUser) {
          // Return the updated team member with user details
          const { password, ...userWithoutPassword } = updatedUser;

          // Return the complete updated record with all relevant fields
          const response = {
            ...updatedTeamMember,
            user: {
              ...userWithoutPassword,
              profilePicture: updatedUser.profilePicture || `/default-avatar.png?u=${user.id}`,
              position: updatedUser.position || "",
              jerseyNumber: updatedUser.jerseyNumber || null
            }
          };

          console.log("Sending updated team member response:", JSON.stringify(response, null, 2));
          res.json(response);
        } else {
          res.status(500).json({ error: "Failed to update user" });
        }
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.post("/api/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      console.log(`POST /api/teams/${teamId}/members - Request body:`, JSON.stringify(req.body));

      // Check if user has admin role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to add team members" });
      }

      const { userId, role, user } = req.body;
      let profilePicture = user?.profilePicture;

      // Handle profile picture URL or base64
      if (profilePicture) {
        if (profilePicture.startsWith('data:image')) {
          // For base64 encoded images, we'll just use them as-is
          // Client-side will handle displaying base64 images correctly
          // No need to save to disk since we'll store the base64 string directly
        } else if (!profilePicture.startsWith('http')) {
          // If not a URL and not base64, use a consistent default avatar icon
          profilePicture = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
        }
      }

      // For the simplified member creation (without accounts)
      if (user) {
        // Generate a random user ID for the mock user
        const mockUserId = Math.floor(Math.random() * 10000) + 1000;

        // Create a password hash for the mock user
        const password = await hashPassword("password123");

        // Handle profile picture (use default avatar if none provided or empty string)
        const profilePicture = user.profilePicture && user.profilePicture.trim() !== '' 
          ? user.profilePicture 
          : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

        // Create the user with basic info
        const newUser = await storage.createUser({
          username: user.username || user.fullName.toLowerCase().replace(/\s+/g, '.') + mockUserId,
          password,
          fullName: user.fullName,
          role: "player", // Use a valid role from the schema
          position: user.position || null,
          jerseyNumber: user.jerseyNumber ? parseInt(user.jerseyNumber.toString()) : null,
          profilePicture
        });

        // Add to team
        const newTeamMember = await storage.createTeamMember({
          teamId,
          userId: newUser.id,
          role
        });

        // Get the user with all properties
        const fullUser = await storage.getUser(newUser.id);

        if (!fullUser) {
          return res.status(500).json({ error: "Failed to retrieve created user" });
        }

        // Return the complete team member with user details
        const { password: pwd, ...userWithoutPassword } = fullUser;

        // Return member with full user details
        const memberResponse = {
          id: newTeamMember.id,
          teamId: newTeamMember.teamId,
          userId: newTeamMember.userId,
          role: newTeamMember.role,
          joinedAt: newTeamMember.joinedAt,
          user: {
            id: fullUser.id,
            username: fullUser.username,
            fullName: fullUser.fullName,
            role: fullUser.role,
            profilePicture: fullUser.profilePicture || `https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png`,
            position: fullUser.position || "",
            jerseyNumber: fullUser.jerseyNumber || null,
            email: fullUser.email || "",
            phoneNumber: fullUser.phoneNumber || ""
          }
        };

        console.log("Created new team member:", JSON.stringify(memberResponse, null, 2));
        res.status(201).json(memberResponse);
        return;
      }

      // Regular team member addition (existing user)
      // Check if user is already a member of the team
      const existingMember = await storage.getTeamMember(teamId, userId);
      if (existingMember) {
        return res.status(400).json({ error: "User is already a member of this team" });
      }

      const newTeamMember = await storage.createTeamMember({
        teamId,
        userId,
        role
      });

      res.status(201).json(newTeamMember);
    } catch (error) {
      res.status(500).json({ error: "Failed to add team member" });
    }
  });

  // Delete a team member
  app.delete("/api/teams/:teamId/members/:memberId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);

      // Check if user has admin role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to remove team members" });
      }

      // Get the member to be removed
      const members = await storage.getTeamMembers(teamId);
      const memberToRemove = members.find(m => m.id === memberId);

      if (!memberToRemove) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Don't allow removing yourself
      if (memberToRemove.userId === req.user.id) {
        return res.status(400).json({ error: "Cannot remove yourself from the team" });
      }

      const success = await storage.deleteTeamMember(memberId);

      if (success) {
        res.status(200).json({ message: "Team member removed successfully" });
      } else {
        res.status(500).json({ error: "Failed to remove team member" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Matches routes
  app.get("/api/teams/:id/matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const matches = await storage.getMatches(teamId);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/teams/:id/matches/recent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const matches = await storage.getRecentMatches(teamId, limit);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent matches" });
    }
  });

  app.post("/api/teams/:id/matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to create matches" });
      }

      // Extract and validate match data
      const matchData = {
        ...req.body,
        teamId,
      };
      
      // Ensure matchDate is a valid Date object
      if (matchData.matchDate && typeof matchData.matchDate === 'string') {
        try {
          const date = new Date(matchData.matchDate);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date format");
          }
          // Store as a proper Date instance
          matchData.matchDate = date;
        } catch (dateError) {
          console.error("Error parsing match date:", dateError);
          return res.status(400).json({ error: "Invalid match date format" });
        }
      }
      
      console.log("Creating match with data:", matchData);
      
      const match = await storage.createMatch(matchData);
      
      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ error: "Failed to create match" });
    }
  });

  // Update a match
  app.patch("/api/teams/:teamId/matches/:matchId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update matches" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }
      
      // Extract and validate match data
      const matchData = { ...req.body };
      
      // Ensure matchDate is a valid Date object
      if (matchData.matchDate && typeof matchData.matchDate === 'string') {
        try {
          const date = new Date(matchData.matchDate);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date format");
          }
          // Store as a proper Date instance
          matchData.matchDate = date;
        } catch (dateError) {
          console.error("Error parsing match date:", dateError);
          return res.status(400).json({ error: "Invalid match date format" });
        }
      }
      
      console.log("Updating match with data:", matchData);

      const updatedMatch = await storage.updateMatch(matchId, matchData);
      res.json(updatedMatch);
    } catch (error) {
      console.error("Error updating match:", error);
      res.status(500).json({ error: "Failed to update match" });
    }
  });

  // Delete a match
  app.delete("/api/teams/:teamId/matches/:matchId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete matches" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const success = await storage.deleteMatch(matchId);

      if (success) {
        res.status(200).json({ message: "Match deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete match" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match" });
    }
  });

  // Events routes
  app.get("/api/teams/:id/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const events = await storage.getEvents(teamId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/teams/:id/events/upcoming", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const events = await storage.getUpcomingEvents(teamId, limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming events" });
    }
  });

  app.post("/api/teams/:id/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to create events" });
      }

      const event = await storage.createEvent({
        ...req.body,
        teamId,
        createdById: req.user.id,
      });

      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Update an event
  app.patch("/api/teams/:teamId/events/:eventId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update events" });
      }

      // Check if event belongs to the team
      const event = await storage.getEvent(eventId);
      if (!event || event.teamId !== teamId) {
        return res.status(404).json({ error: "Event not found" });
      }

      const updatedEvent = await storage.updateEvent(eventId, req.body);
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Delete an event
  app.delete("/api/teams/:teamId/events/:eventId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete events" });
      }

      // Check if event belongs to the team
      const event = await storage.getEvent(eventId);
      if (!event || event.teamId !== teamId) {
        return res.status(404).json({ error: "Event not found" });
      }

      const success = await storage.deleteEvent(eventId);

      if (success) {
        res.status(200).json({ message: "Event deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete event" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Get attendance for an event
  app.get("/api/teams/:teamId/events/:eventId/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);

      // Check if user is a team member
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if event belongs to the team
      const event = await storage.getEvent(eventId);
      if (!event || event.teamId !== teamId) {
        return res.status(404).json({ error: "Event not found" });
      }

      const attendance = await storage.getAttendance(eventId);
      
      // Get count of confirmed attendees
      const confirmedCount = attendance.filter(a => a.status === "confirmed").length;
      
      res.json({
        total: attendance.length,
        confirmed: confirmedCount,
        attendees: attendance
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  // Create or update attendance status for an event
  app.post("/api/teams/:teamId/events/:eventId/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);
      const { status } = req.body;

      // Check if user is a team member
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if event belongs to the team
      const event = await storage.getEvent(eventId);
      if (!event || event.teamId !== teamId) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Get existing attendance or create new one
      const attendances = await storage.getAttendance(eventId);
      const existingAttendance = attendances.find(a => a.userId === req.user.id);

      let attendance;
      if (existingAttendance) {
        // Update existing attendance
        attendance = await storage.updateAttendance(existingAttendance.id, { status });
      } else {
        // Create new attendance
        attendance = await storage.createAttendance({
          eventId,
          userId: req.user.id,
          status
        });
      }

      res.status(201).json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  // Announcements routes
  app.get("/api/teams/:id/announcements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const announcements = await storage.getAnnouncements(teamId);

      // Get user details for the creator of each announcement
      const announcementsWithCreator = await Promise.all(
        announcements.map(async (announcement) => {
          const user = await storage.getUser(announcement.createdById);
          if (!user) return announcement;

          const { password, ...creatorWithoutPassword } = user;
          return {
            ...announcement,
            creator: creatorWithoutPassword,
          };
        })
      );

      res.json(announcementsWithCreator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/teams/:id/announcements/recent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 1; // Default to 1 to get only the most recent

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const announcements = await storage.getRecentAnnouncements(teamId, limit);

      // Get user details for the creator of each announcement
      const announcementsWithCreator = await Promise.all(
        announcements.map(async (announcement) => {
          const user = await storage.getUser(announcement.createdById);
          if (!user) return announcement;

          const { password, ...creatorWithoutPassword } = user;
          return {
            ...announcement,
            creator: creatorWithoutPassword,
          };
        })
      );

      res.json(announcementsWithCreator);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent announcements" });
    }
  });

  app.post("/api/teams/:id/announcements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to create announcements" });
      }

      const announcement = await storage.createAnnouncement({
        ...req.body,
        teamId,
        createdById: req.user.id,
      });

      // Get user details for the creator
      const user = await storage.getUser(announcement.createdById);
      let announcementWithCreator = announcement;

      if (user) {
        const { password, ...creatorWithoutPassword } = user;
        // Use type assertion to avoid TypeScript error while still adding creator info
        announcementWithCreator = {
          ...announcement,
          // Adding creator info for UI display purposes
          // This will be removed by TypeScript but will be in the JSON response
        } as any;
        (announcementWithCreator as any).creator = creatorWithoutPassword;
      }

      res.status(201).json(announcementWithCreator);
    } catch (error) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.patch("/api/teams/:id/announcements/:announcementId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const announcementId = parseInt(req.params.announcementId);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update announcements" });
      }

      // Check if announcement belongs to the team
      const announcement = await storage.getAnnouncement(announcementId);
      if (!announcement || announcement.teamId !== teamId) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      // Update announcement
      const updatedAnnouncement = await storage.updateAnnouncement(announcementId, {
        title: req.body.title,
        content: req.body.content
      });

      if (updatedAnnouncement) {
        // Get user details for the creator
        const user = await storage.getUser(updatedAnnouncement.createdById);
        let announcementWithCreator = updatedAnnouncement;

        if (user) {
          const { password, ...creatorWithoutPassword } = user;
          // Use type assertion to avoid TypeScript error while still adding creator info
          announcementWithCreator = {
            ...updatedAnnouncement,
            // Adding creator info for UI display purposes
          } as any;
          (announcementWithCreator as any).creator = creatorWithoutPassword;
        }

        res.status(200).json(announcementWithCreator);
      } else {
        res.status(500).json({ error: "Failed to update announcement" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/teams/:id/announcements/:announcementId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const announcementId = parseInt(req.params.announcementId);

      // Check if user has admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete announcements" });
      }

      // Check if announcement belongs to the team
      const announcement = await storage.getAnnouncement(announcementId);
      if (!announcement || announcement.teamId !== teamId) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      const success = await storage.deleteAnnouncement(announcementId);

      if (success) {
        res.status(200).json({ message: "Announcement deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete announcement" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // Player Stats routes
  app.get("/api/teams/:teamId/matches/:matchId/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const playerStats = await storage.getMatchPlayerStats(matchId);

      // Get user details for each player stat
      const playerStatsWithUserDetails = await Promise.all(
        playerStats.map(async (stat) => {
          const user = await storage.getUser(stat.userId);
          if (!user) return null;

          const { password, ...userWithoutPassword } = user;
          return {
            ...stat,
            user: userWithoutPassword,
          };
        })
      );

      res.json(playerStatsWithUserDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player stats" });
    }
  });

  // Match Lineup routes
  app.get("/api/teams/:teamId/matches/:matchId/lineup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const lineup = await storage.getMatchLineup(matchId);

      if (!lineup) {
        return res.status(404).json({ error: "Lineup not found" });
      }

      // Get player details for each player in the starting lineup
      const playersDetails = await Promise.all(
        lineup.playerIds.map(async (playerId) => {
          const user = await storage.getUser(playerId);
          if (!user) return null;

          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );
      
      // Get player details for bench players if they exist
      let benchPlayersDetails: any[] = [];
      if (lineup.benchPlayerIds && lineup.benchPlayerIds.length > 0) {
        benchPlayersDetails = await Promise.all(
          lineup.benchPlayerIds.map(async (playerId) => {
            const user = await storage.getUser(playerId);
            if (!user) return null;

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
          })
        );
      }

      res.json({
        ...lineup,
        players: playersDetails.filter(Boolean),
        benchPlayers: benchPlayersDetails.filter(Boolean)
      });
    } catch (error) {
      console.error("Error fetching lineup:", error);
      res.status(500).json({ error: "Failed to fetch match lineup" });
    }
  });

  app.post("/api/teams/:teamId/matches/:matchId/lineup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const { playerIds, benchPlayerIds, formation, positionMapping } = req.body;

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Check if lineup already exists
      const existingLineup = await storage.getMatchLineup(matchId);
      if (existingLineup) {
        const updatedLineup = await storage.updateMatchLineup(existingLineup.id, {
          playerIds,
          benchPlayerIds,
          formation,
          positionMapping
        });
        return res.json(updatedLineup);
      }

      // Create new lineup
      const lineup = await storage.createMatchLineup({
        matchId,
        teamId,
        playerIds,
        benchPlayerIds,
        formation,
        positionMapping
      });

      res.status(201).json(lineup);
    } catch (error) {
      console.error("Error creating/updating lineup:", error);
      res.status(500).json({ error: "Failed to create match lineup" });
    }
  });

  // Team Lineup routes
  app.get("/api/teams/:teamId/lineup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const lineup = await storage.getTeamLineup(teamId);

      if (!lineup) {
        return res.status(404).json({ error: "Team lineup not found" });
      }

      res.json(lineup);
    } catch (error) {
      console.error("Error retrieving team lineup:", error);
      res.status(500).json({ error: "Failed to retrieve team lineup" });
    }
  });

  app.post("/api/teams/:teamId/lineup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const { formation, positionMapping } = req.body;

      // Check if user is admin or coach of this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      if (teamMember.role !== "admin" && teamMember.role !== "coach") {
        return res.status(403).json({ error: "Only admins and coaches can manage lineups" });
      }

      // Validate input
      if (!formation) {
        return res.status(400).json({ error: "Formation is required" });
      }

      // Check if a lineup already exists for this team
      const existingLineup = await storage.getTeamLineup(teamId);

      if (existingLineup) {
        // Update existing lineup
        const updatedLineup = await storage.updateTeamLineup(existingLineup.id, {
          formation,
          positionMapping
        });
        return res.json(updatedLineup);
      }

      // Create new lineup
      const lineup = await storage.createTeamLineup({
        teamId,
        formation,
        positionMapping
      });

      res.status(201).json(lineup);
    } catch (error) {
      console.error("Error creating/updating team lineup:", error);
      res.status(500).json({ error: "Failed to create team lineup" });
    }
  });

  // Match Substitutions routes
  app.get("/api/teams/:teamId/matches/:matchId/substitutions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const substitutions = await storage.getMatchSubstitutions(matchId);

      // Get player details for substitutions
      const substitutionsWithPlayerDetails = await Promise.all(
        substitutions.map(async (sub) => {
          const playerIn = await storage.getUser(sub.playerInId);
          const playerOut = await storage.getUser(sub.playerOutId);

          if (!playerIn || !playerOut) return null;

          // Remove password from user details
          const { password: p1, ...playerInWithoutPassword } = playerIn;
          const { password: p2, ...playerOutWithoutPassword } = playerOut;

          return {
            ...sub,
            playerIn: playerInWithoutPassword,
            playerOut: playerOutWithoutPassword
          };
        })
      );

      res.json(substitutionsWithPlayerDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match substitutions" });
    }
  });

  app.post("/api/teams/:teamId/matches/:matchId/substitutions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const { playerInId, playerOutId, minute, reason } = req.body;

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Create new substitution
      const substitution = await storage.createMatchSubstitution({
        matchId,
        playerInId,
        playerOutId,
        minute,
        reason
      });

      res.status(201).json(substitution);
    } catch (error) {
      res.status(500).json({ error: "Failed to create match substitution" });
    }
  });

  app.delete("/api/teams/:teamId/matches/:matchId/substitutions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const substitutionId = parseInt(req.params.id);

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const result = await storage.deleteMatchSubstitution(substitutionId);
      if (!result) {
        return res.status(404).json({ error: "Substitution not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match substitution" });
    }
  });

  // Match Goals routes
  app.get("/api/teams/:teamId/matches/:matchId/goals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const goals = await storage.getMatchGoals(matchId);

      // Get player details for goals
      const goalsWithPlayerDetails = await Promise.all(
        goals.map(async (goal) => {
          const scorer = await storage.getUser(goal.scorerId);
          if (!scorer) return null;

          // Remove password from user details
          const { password, ...scorerWithoutPassword } = scorer;

          let assistPlayerWithoutPassword = null;
          if (goal.assistId) {
            const assistPlayer = await storage.getUser(goal.assistId);
            if (assistPlayer) {
              const { password, ...assistDetails } = assistPlayer;
              assistPlayerWithoutPassword = assistDetails;
            }
          }

          return {
            ...goal,
            scorer: scorerWithoutPassword,
            assistPlayer: assistPlayerWithoutPassword
          };
        })
      );

      res.json(goalsWithPlayerDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match goals" });
    }
  });

  app.post("/api/teams/:teamId/matches/:matchId/goals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const { scorerId, assistId, minute, type, description } = req.body;

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Create new goal
      const goal = await storage.createMatchGoal({
        matchId,
        scorerId,
        assistId,
        minute,
        type,
        description
      });

      res.status(201).json(goal);
    } catch (error) {
      res.status(500).json({ error: "Failed to create match goal" });
    }
  });

  app.delete("/api/teams/:teamId/matches/:matchId/goals/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const goalId = parseInt(req.params.id);

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const result = await storage.deleteMatchGoal(goalId);
      if (!result) {
        return res.status(404).json({ error: "Goal not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match goal" });
    }
  });

  // Match Cards routes
  app.get("/api/teams/:teamId/matches/:matchId/cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const cards = await storage.getMatchCards(matchId);

      // Get player details for cards
      const cardsWithPlayerDetails = await Promise.all(
        cards.map(async (card) => {
          const player = await storage.getUser(card.playerId);
          if (!player) return null;

          // Remove password from user details
          const { password, ...playerWithoutPassword } = player;

          return {
            ...card,
            player: playerWithoutPassword
          };
        })
      );

      res.json(cardsWithPlayerDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match cards" });
    }
  });

  app.post("/api/teams/:teamId/matches/:matchId/cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const { playerId, type, minute, reason } = req.body;

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Create new card
      const card = await storage.createMatchCard({
        matchId,
        playerId,
        type,
        minute,
        reason
      });

      res.status(201).json(card);
    } catch (error) {
      res.status(500).json({ error: "Failed to create match card" });
    }
  });

  app.delete("/api/teams/:teamId/matches/:matchId/cards/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const cardId = parseInt(req.params.id);

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const result = await storage.deleteMatchCard(cardId);
      if (!result) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match card" });
    }
  });

  // Match Photos routes
  app.get("/api/teams/:teamId/matches/:matchId/photos", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const photos = await storage.getMatchPhotos(matchId);

      // Get uploader details for photos
      const photosWithUploaderDetails = await Promise.all(
        photos.map(async (photo) => {
          const uploader = await storage.getUser(photo.uploadedById);
          if (!uploader) return null;

          // Remove password from user details
          const { password, ...uploaderWithoutPassword } = uploader;

          return {
            ...photo,
            uploader: uploaderWithoutPassword
          };
        })
      );

      res.json(photosWithUploaderDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match photos" });
    }
  });

  app.post("/api/teams/:teamId/matches/:matchId/photos", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const { url, caption } = req.body;

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Create new photo
      const photo = await storage.createMatchPhoto({
        matchId,
        url,
        caption,
        uploadedById: req.user.id
      });

      res.status(201).json(photo);
    } catch (error) {
      res.status(500).json({ error: "Failed to create match photo" });
    }
  });

  app.delete("/api/teams/:teamId/matches/:matchId/photos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);
      const photoId = parseInt(req.params.id);

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      
      // Get the photo
      const photo = await storage.getMatchPhoto(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // Allow deletion only for admin/coach or the original uploader
      if (!teamMember || 
          ((teamMember.role !== "admin" && teamMember.role !== "coach") && 
           photo.uploadedById !== req.user.id)) {
        return res.status(403).json({ error: "Not authorized to delete this photo" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        return res.status(404).json({ error: "Match not found" });
      }

      const result = await storage.deleteMatchPhoto(photoId);
      if (!result) {
        return res.status(404).json({ error: "Photo not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match photo" });
    }
  });

  // Mock data creation for demo
  app.post("/api/mock-data", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Mock data creation not allowed in production" });
    }

    try {
      // Create mock users and team if none exists
      const existingTeams = await storage.getTeams();

      // Always create a new team for the current user when requested
      if (true) {
        // Create admin user
        const admin = await storage.getUserByUsername("admin");
        let adminUser = admin;

        if (!admin) {
          adminUser = await storage.createUser({
            username: "admin",
            password: await hashPassword("password"),
            fullName: "Admin User",
            role: "admin",
            profilePicture: "https://i.pravatar.cc/150?u=admin",
            email: "admin@example.com",
            phoneNumber: "+1 (555) 123-4567"
          });
        }

        // Create coach if not exists
        const existingCoach = await storage.getUserByUsername("coach");
        let coachUser = existingCoach;

        if (!existingCoach) {
          coachUser = await storage.createUser({
            username: "coach",
            password: await hashPassword("password"),
            fullName: "Erik Ten Hag",
            role: "coach",
            profilePicture: "https://i.pravatar.cc/150?u=coach",
            position: "Head Coach",
            email: "coach@example.com",
            phoneNumber: "+1 (555) 234-5678"
          });
        }

        // Create team
        const team = await storage.createTeam({
          name: "Manchester United FC",
          logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
          division: "Premier League",
          seasonYear: "2023/24",
          createdById: adminUser!.id,
        });

        // Add members
        await storage.createTeamMember({
          teamId: team.id,
          userId: adminUser!.id,
          role: "admin"
        });

        if (coachUser) {
          await storage.createTeamMember({
            teamId: team.id,
            userId: coachUser.id,
            role: "coach"
          });
        }

        // No mock players will be created automatically
        // The app will start with only admin and coach users

        // Create some matches
        const matchesData = [
          {
            opponentName: "Arsenal",
            opponentLogo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
            matchDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            location: "Emirates Stadium",
            isHome: false,
            goalsScored: 3,
            goalsConceded: 1,
            status: "completed" as "completed",
            notes: "Great performance by the team"
          },
          {
            opponentName: "Chelsea",
            opponentLogo: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
            matchDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            location: "Old Trafford",
            isHome: true,
            goalsScored: 1,
            goalsConceded: 2,
            status: "completed" as "completed",
            notes: "Need to improve defensive play"
          },
          {
            opponentName: "Liverpool",
            opponentLogo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
            matchDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
            location: "Anfield Stadium",
            isHome: false,
            status: "scheduled" as "scheduled",
            notes: "Important match against a top rival"
          }
        ];

        for (const matchData of matchesData) {
          await storage.createMatch({
            teamId: team.id,
            ...matchData,
          });
        }

        // Create events
        const eventsData = [
          {
            title: "Tactical Training",
            type: "training" as "training",
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 minutes later
            location: "Training Ground",
            description: "Focus on tactical positioning and set pieces"
          },
          {
            title: "vs. Liverpool FC",
            type: "match" as "match",
            startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
            endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 110 * 60 * 1000), // 110 minutes later
            location: "Anfield Stadium",
            description: "Premier League match"
          },
          {
            title: "Team Meeting",
            type: "meeting" as "meeting",
            startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
            endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 60 minutes later
            location: "Club House",
            description: "Review of recent performances and upcoming strategy"
          }
        ];

        for (const eventData of eventsData) {
          await storage.createEvent({
            teamId: team.id,
            createdById: coachUser ? coachUser.id : adminUser!.id,
            ...eventData,
          });
        }

        // Create announcements
        const announcementsData = [
          {
            title: "New Training Schedule",
            content: "Starting next week, we'll be training on Mondays and Thursdays at 6 PM."
          },
          {
            title: "Team Equipment Update",
            content: "New uniforms will be distributed at the next training session."
          },
          {
            title: "End of Season Party",
            content: "We'll be having an end of season celebration next month. Details to follow."
          }
        ];

        for (const announcementData of announcementsData) {
          await storage.createAnnouncement({
            teamId: team.id,
            createdById: coachUser ? coachUser.id : adminUser!.id,
            ...announcementData,
          });
        }

        // No player statistics will be added initially
        // These will be added when team members are created and matches are recorded
      }

      res.status(200).json({ message: "Mock data created successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create mock data" });
    }
  });

  // League Classification routes
  // Get all league classifications for a team
  app.get('/api/teams/:teamId/classification', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.teamId);
    
    try {
      // Check if user is a member of this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to view this team's classification" });
      }
      
      const classifications = await storage.getLeagueClassifications(teamId);
      res.json(classifications);
    } catch (error) {
      console.error("Error fetching classifications:", error);
      res.status(500).json({ error: "Failed to fetch league classifications" });
    }
  });
  
  // Add a new league classification entry
  app.post('/api/teams/:teamId/classification', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.teamId);
    
    try {
      // Check if user has admin or coach role for this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to add classification for this team" });
      }
      
      const classification = await storage.createLeagueClassification({
        ...req.body,
        teamId
      });
      
      res.status(201).json(classification);
    } catch (error) {
      console.error("Error creating classification:", error);
      res.status(500).json({ error: "Failed to create league classification entry" });
    }
  });
  
  // Update a league classification entry
  app.put('/api/classification/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const classificationId = parseInt(req.params.id);
    
    try {
      // Get the classification to check team ownership
      const classification = await storage.getLeagueClassification(classificationId);
      if (!classification) {
        return res.status(404).json({ error: "Classification entry not found" });
      }
      
      // Check if user has admin or coach role for this team
      const teamMember = await storage.getTeamMember(classification.teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update classification for this team" });
      }
      
      const updatedClassification = await storage.updateLeagueClassification(classificationId, req.body);
      
      res.json(updatedClassification);
    } catch (error) {
      console.error("Error updating classification:", error);
      res.status(500).json({ error: "Failed to update league classification entry" });
    }
  });
  
  // Delete a league classification entry
  app.delete('/api/classification/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const classificationId = parseInt(req.params.id);
    
    try {
      // Get the classification to check team ownership
      const classification = await storage.getLeagueClassification(classificationId);
      if (!classification) {
        return res.status(404).json({ error: "Classification entry not found" });
      }
      
      // Check if user has admin or coach role for this team
      const teamMember = await storage.getTeamMember(classification.teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete classification for this team" });
      }
      
      const deleted = await storage.deleteLeagueClassification(classificationId);
      
      if (deleted) {
        res.json({ message: "Classification entry deleted successfully" });
      } else {
        res.status(404).json({ error: "Classification entry not found" });
      }
    } catch (error) {
      console.error("Error deleting classification:", error);
      res.status(500).json({ error: "Failed to delete league classification entry" });
    }
  });
  
  // Delete all classification entries for a team
  app.delete('/api/teams/:teamId/classification', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.teamId);
    
    try {
      // Check if user has admin or coach role for this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete classifications for this team" });
      }
      
      const deleted = await storage.deleteAllTeamClassifications(teamId);
      
      if (deleted) {
        res.json({ message: "All classification entries deleted successfully" });
      } else {
        res.json({ message: "No classification entries to delete" });
      }
    } catch (error) {
      console.error("Error deleting classifications:", error);
      res.status(500).json({ error: "Failed to delete league classification entries" });
    }
  });
  
  // Bulk create league classification entries from CSV
  app.post('/api/teams/:teamId/classification/bulk', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.teamId);
    
    try {
      // Check if user has admin or coach role for this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to add classifications for this team" });
      }
      
      const { classifications } = req.body;
      
      if (!Array.isArray(classifications) || classifications.length === 0) {
        return res.status(400).json({ error: "Invalid or empty classifications data" });
      }
      
      // Delete all existing classifications for this team before adding new ones
      const existingClassifications = await storage.getLeagueClassifications(teamId);
      for (const classification of existingClassifications) {
        await storage.deleteLeagueClassification(classification.id);
      }
      
      // Add teamId to each classification
      const classificationsWithTeamId = classifications.map(c => ({
        ...c,
        teamId
      }));
      
      const createdClassifications = await storage.bulkCreateLeagueClassifications(classificationsWithTeamId);
      
      res.status(201).json({
        message: `Created ${createdClassifications.length} classification entries`,
        classifications: createdClassifications
      });
    } catch (error) {
      console.error("Error creating bulk classifications:", error);
      res.status(500).json({ error: "Failed to create league classification entries" });
    }
  });

  // Get player statistics for a team
  app.get('/api/teams/:teamId/player-stats', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.teamId);
    
    try {
      // Verify team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Get all team members who are players
      const teamMembers = await storage.getTeamMembers(teamId);
      const playerMembers = teamMembers.filter(member => member.role === 'player');
      
      // Get all matches for the team
      const matches = await storage.getMatches(teamId);
      const completedMatches = matches.filter(match => match.status === 'completed');
      const matchIds = completedMatches.map(match => match.id);
      
      // For each player, collect their statistics across all matches
      const playerStatsPromises = playerMembers.map(async (member) => {
        // Get user details
        const user = await storage.getUser(member.userId);
        if (!user) return null;
        
        // Initialize player summary
        const playerSummary = {
          id: user.id,
          name: user.fullName || user.username,
          position: user.position || "Unknown",
          matchesPlayed: 0,
          minutesPlayed: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          image: user.profilePicture || "/default-avatar.png"
        };
        
        // For each player, get their stats from all matches
        for (const matchId of matchIds) {
          // Check match stats
          const matchStats = await storage.getMatchPlayerStats(matchId);
          const playerStat = matchStats.find(stat => stat.userId === user.id);
          
          if (playerStat) {
            playerSummary.matchesPlayed++;
            playerSummary.goals += playerStat.goals || 0;
            playerSummary.assists += playerStat.assists || 0;
            playerSummary.yellowCards += playerStat.yellowCards || 0;
            playerSummary.redCards += playerStat.redCards || 0;
            playerSummary.minutesPlayed += playerStat.minutesPlayed || 0;
          }
          
          // Check for goals in match goals table (ensures we catch everything)
          const matchGoals = await storage.getMatchGoals(matchId);
          // Count goals scored by this player
          const goalsScored = matchGoals.filter(goal => goal.scorerId === user.id).length;
          // Count assists by this player
          const assistsProvided = matchGoals.filter(goal => goal.assistId === user.id).length;
          
          if (goalsScored > 0 || assistsProvided > 0) {
            playerSummary.matchesPlayed = playerSummary.matchesPlayed || 1;  // Ensure we count this match
            playerSummary.goals += goalsScored;
            playerSummary.assists += assistsProvided;
          }
          
          // Check for cards in match cards
          const matchCards = await storage.getMatchCards(matchId);
          const yellowCards = matchCards.filter(card => 
            card.playerId === user.id && card.type === 'yellow'
          ).length;
          const redCards = matchCards.filter(card => 
            card.playerId === user.id && card.type === 'red'
          ).length;
          
          if (yellowCards > 0 || redCards > 0) {
            playerSummary.matchesPlayed = playerSummary.matchesPlayed || 1;  // Ensure we count this match
            playerSummary.yellowCards += yellowCards;
            playerSummary.redCards += redCards;
          }
        }
        
        return playerSummary;
      });
      
      const playerStats = (await Promise.all(playerStatsPromises)).filter(Boolean);
      res.json(playerStats);
    } catch (error) {
      console.error("Error fetching player statistics:", error);
      res.status(500).json({ error: "Failed to retrieve player statistics" });
    }
  });

  return httpServer;
}