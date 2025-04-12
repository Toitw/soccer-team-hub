import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireSuperuser } from "../middleware/auth-middleware";
import { generateJoinCode } from "../utils/join-code";
import { hashPassword } from "../auth";

export function registerAdminRoutes(app: Express) {
  // Get all teams (admin access)
  app.get("/api/admin/teams", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Get team by ID (admin access)
  app.get("/api/admin/teams/:id", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // Create team (admin access)
  app.post("/api/admin/teams", requireSuperuser, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Generate a join code for the team
      const joinCode = generateJoinCode();
      
      const team = await storage.createTeam({
        ...req.body,
        joinCode,
        createdById: req.user.id
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  // Update team (admin access)
  app.put("/api/admin/teams/:id", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const updatedTeam = await storage.updateTeam(teamId, req.body);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  // Get all users (admin access)
  app.get("/api/admin/users", requireSuperuser, async (req: Request, res: Response) => {
    try {
      // For each user, we'll want to exclude the password field for security
      const users = await storage.getAllUsers();
      
      if (!users || !Array.isArray(users)) {
        return res.status(500).json({ error: "Failed to retrieve users" });
      }
      
      // Map to remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get user by ID (admin access)
  app.get("/api/admin/users/:id", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password for security
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Create user (admin access)
  app.post("/api/admin/users", requireSuperuser, async (req: Request, res: Response) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash the password before storing
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user (admin access)
  app.put("/api/admin/users/:id", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      let updateData = { ...req.body };
      
      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get team members for a team (admin access)
  app.get("/api/admin/teams/:id/members", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const teamMembers = await storage.getTeamMembers(teamId);
      
      // Enhance team members with user details
      const enhancedTeamMembers = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return member;
          
          // Remove password from user object
          const { password, ...userWithoutPassword } = user;
          
          return {
            ...member,
            user: userWithoutPassword
          };
        })
      );
      
      res.json(enhancedTeamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Add a user to a team (admin access)
  app.post("/api/admin/teams/:id/members", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const { userId, role } = req.body;
      
      // Verify team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user is already a member of this team
      const existingMember = await storage.getTeamMember(teamId, userId);
      if (existingMember) {
        return res.status(400).json({ error: "User is already a member of this team" });
      }
      
      // Add user to team
      const teamMember = await storage.createTeamMember({
        teamId,
        userId,
        role: role || "player"
      });
      
      // Enhance response with user details
      const { password, ...userWithoutPassword } = user;
      const enhancedTeamMember = {
        ...teamMember,
        user: userWithoutPassword
      };
      
      res.status(201).json(enhancedTeamMember);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ error: "Failed to add team member" });
    }
  });

  // Update a team member (admin access)
  app.put("/api/admin/teams/:teamId/members/:userId", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      // Get the team member
      const teamMember = await storage.getTeamMember(teamId, userId);
      if (!teamMember) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      // Update the team member
      const updatedTeamMember = await storage.updateTeamMember(teamMember.id, req.body);
      
      if (!updatedTeamMember) {
        return res.status(500).json({ error: "Failed to update team member" });
      }
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.json(updatedTeamMember);
      }
      
      // Enhance response with user details
      const { password, ...userWithoutPassword } = user;
      const enhancedTeamMember = {
        ...updatedTeamMember,
        user: userWithoutPassword
      };
      
      res.json(enhancedTeamMember);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Remove a user from a team (admin access)
  app.delete("/api/admin/teams/:teamId/members/:userId", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      // Get the team member
      const teamMember = await storage.getTeamMember(teamId, userId);
      if (!teamMember) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      // Delete the team member
      const result = await storage.deleteTeamMember(teamMember.id);
      
      if (!result) {
        return res.status(500).json({ error: "Failed to remove team member" });
      }
      
      res.status(200).json({ message: "Team member removed successfully" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Create a superuser (admin access)
  app.post("/api/admin/superuser", requireSuperuser, async (req: Request, res: Response) => {
    try {
      // Validate required fields
      const { username, password, fullName, email } = req.body;
      
      if (!username || !password || !fullName) {
        return res.status(400).json({ error: "Username, password, and fullName are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Create the superuser
      const superuser = await storage.createUser({
        username,
        password: await hashPassword(password),
        fullName,
        role: "superuser",
        email,
        profilePicture: req.body.profilePicture,
      });
      
      // Remove password from response
      const { password: pwd, ...superuserWithoutPassword } = superuser;
      
      res.status(201).json(superuserWithoutPassword);
    } catch (error) {
      console.error("Error creating superuser:", error);
      res.status(500).json({ error: "Failed to create superuser" });
    }
  });
  
  // Get dashboard stats for admin (admin access)
  app.get("/api/admin/stats", requireSuperuser, async (req: Request, res: Response) => {
    try {
      const teams = await storage.getTeams();
      const users = await storage.getAllUsers();
      
      if (!users || !Array.isArray(users)) {
        return res.status(500).json({ error: "Failed to retrieve users" });
      }
      
      // Count users by role
      const usersByRole = {
        superuser: 0,
        admin: 0,
        coach: 0,
        player: 0,
      };
      
      users.forEach(user => {
        if (user.role in usersByRole) {
          usersByRole[user.role as keyof typeof usersByRole]++;
        }
      });
      
      // Get some basic stats
      const stats = {
        totalTeams: teams.length,
        totalUsers: users.length,
        usersByRole,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });
}