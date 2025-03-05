import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, hashPasswordInStorage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";

// Helper to create mock data for testing the team functionality
async function createMockData() {
  // Create mock users
  const mockUsers = [
    {
      id: 1001,
      username: "david.gea",
      fullName: "David De Gea",
      role: "player",
      position: "Goalkeeper",
      jerseyNumber: 1,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/6/68/David_de_Gea_2017.jpg"
    },
    {
      id: 1002,
      username: "harry.maguire",
      fullName: "Harry Maguire",
      role: "player",
      position: "Defender",
      jerseyNumber: 5,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Harry_Maguire_2018.jpg"
    },
    {
      id: 1003,
      username: "raphael.varane",
      fullName: "Raphael Varane",
      role: "player",
      position: "Defender",
      jerseyNumber: 19,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Rapha%C3%ABl_Varane_2018.jpg"
    },
    {
      id: 1004,
      username: "luke.shaw",
      fullName: "Luke Shaw",
      role: "player",
      position: "Defender",
      jerseyNumber: 23,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/1/16/Uk224-Luke_Shaw_%28cropped%29.jpg"
    },
    {
      id: 1005,
      username: "aaron.bissaka",
      fullName: "Aaron Wan-Bissaka",
      role: "player",
      position: "Defender",
      jerseyNumber: 29,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Wan-Bissaka_2019.jpg"
    },
    {
      id: 1006,
      username: "scott.mctominay",
      fullName: "Scott McTominay",
      role: "player",
      position: "Midfielder",
      jerseyNumber: 39,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/20180612_FIFA_Friendly_Match_Austria_vs._Russia_Scott_McTominay_850_1605.jpg/800px-20180612_FIFA_Friendly_Match_Austria_vs._Russia_Scott_McTominay_850_1605.jpg"
    },
    {
      id: 1007,
      username: "fred.midfielder",
      fullName: "Fred",
      role: "player",
      position: "Midfielder",
      jerseyNumber: 17,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/8/88/Fred_2018.jpg"
    },
    {
      id: 1008,
      username: "bruno.fernandes",
      fullName: "Bruno Fernandes",
      role: "player",
      position: "Attacking Midfielder",
      jerseyNumber: 8,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/1/14/Bruno_Fernandes_%28footballer%2C_born_1994%29.jpg"
    },
    {
      id: 1009,
      username: "marcus.rashford",
      fullName: "Marcus Rashford",
      role: "player",
      position: "Forward",
      jerseyNumber: 10,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Press_Briefing_Discussing_the_Upcoming_England_V._Italy_European_Cup_Final_%28cropped%29.jpg"
    },
    {
      id: 1010,
      username: "anthony.martial",
      fullName: "Anthony Martial",
      role: "player",
      position: "Forward",
      jerseyNumber: 9,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Anthony_Martial_27_September_2017.jpg"
    },
    {
      id: 1011,
      username: "mason.greenwood",
      fullName: "Mason Greenwood",
      role: "player",
      position: "Forward",
      jerseyNumber: 11,
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Mason_Greenwood.jpg/800px-Mason_Greenwood.jpg"
    },
    {
      id: 1012,
      username: "erik.tenhag",
      fullName: "Erik ten Hag",
      role: "coach",
      position: "Head Coach",
      profilePicture: "https://upload.wikimedia.org/wikipedia/commons/7/76/Erik_ten_Hag%2C_2017.jpg"
    }
  ];

  // Create a mock team
  const mockTeam = {
    id: 101,
    name: "Manchester United FC",
    logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
    division: "Premier League",
    createdAt: new Date(),
    createdById: 1
  };

  return { mockUsers, mockTeam };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  const httpServer = createServer(app);
  
  // Route to create mock data for testing
  app.post("/api/mock-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { mockUsers, mockTeam } = await createMockData();
      
      // Create the team
      const team = await storage.createTeam({
        ...mockTeam,
        createdById: req.user.id,
      });
      
      // Make current user an admin of the team
      await storage.createTeamMember({
        teamId: team.id,
        userId: req.user.id,
        role: "admin"
      });
      
      // Create the mock players and add them to the team
      for (const mockUser of mockUsers) {
        // Create a test password hash
        const password = await hashPasswordInStorage("password123");
        
        // Create the user
        const user = await storage.createUser({
          username: mockUser.username,
          password,
          fullName: mockUser.fullName,
          role: "player"
        });
        
        // Add the user to the team as a player or coach
        await storage.createTeamMember({
          teamId: team.id,
          userId: user.id,
          role: mockUser.role as "player" | "coach" | "admin"
        });
        
        // Add player-specific information (for display purposes)
        if (mockUser.position) {
          const teamMember = await storage.getTeamMember(team.id, user.id);
          // In a real app with an expanded schema, we'd update the user's profile
          // information with the position and jersey number
          console.log(`Would update user ${user.id} with position: ${mockUser.position}, 
          jerseyNumber: ${mockUser.jerseyNumber}, profilePicture: ${mockUser.profilePicture}`);
        }
      }
      
      res.json({ message: "Mock data created successfully" });
    } catch (error) {
      console.error("Error creating mock data:", error);
      res.status(500).json({ error: "Failed to create mock data" });
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
      const team = await storage.createTeam({
        ...req.body,
        createdById: req.user.id,
      });
      
      // Add creator as team admin
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

  // Team Members routes
  app.get("/api/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      
      // Check if user is a member of the team
      const userTeamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!userTeamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      const teamMembers = await storage.getTeamMembers(teamId);
      
      // Get user details for each team member
      const teamMembersWithUserDetails = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return null;
          
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
      
      res.json(teamMembersWithUserDetails.filter(Boolean));
    } catch (error) {
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
      
      // This is key: get the team member to update by ID instead of userId
      // Get all team members and find the one with matching ID
      const members = await storage.getTeamMembers(teamId);
      const teamMember = members.find(member => member.id === memberId);
      
      if (!teamMember) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      // Update the team member role
      const updatedTeamMember = await storage.updateTeamMember(memberId, {
        role
      });
      
      // Update the user's profile data (position, jerseyNumber, profilePicture)
      const user = await storage.getUser(teamMember.userId);
      if (user) {
        const updatedUser = await storage.updateUser(user.id, {
          position,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber.toString()) : null,
          profilePicture: profilePicture || user.profilePicture
        });
        
        if (updatedUser) {
          // Return the updated team member with user details
          const { password, ...userWithoutPassword } = updatedUser;
          res.json({
            ...updatedTeamMember,
            user: {
              ...userWithoutPassword,
              profilePicture: updatedUser.profilePicture || "/default-avatar.png",
              position: updatedUser.position || "",
              jerseyNumber: updatedUser.jerseyNumber || null
            }
          });
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
      
      // Check if user has admin role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to add team members" });
      }
      
      const { userId, role, user } = req.body;
      
      // For the simplified member creation (without accounts)
      if (user) {
        // Generate a random user ID for the mock user
        const mockUserId = Math.floor(Math.random() * 10000) + 1000;
        
        // Create a password hash for the mock user
        const password = await hashPasswordInStorage("password123");
        
        // Create the user with basic info
        const newUser = await storage.createUser({
          username: user.username || user.fullName.toLowerCase().replace(/\s+/g, '.') + mockUserId,
          password,
          fullName: user.fullName,
          role: "player", // Use a valid role from the schema
          position: user.position || null,
          jerseyNumber: user.jerseyNumber ? parseInt(user.jerseyNumber.toString()) : null,
          profilePicture: user.profilePicture || `https://i.pravatar.cc/150?u=${mockUserId}`
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
        return res.status(201).json({
          ...newTeamMember,
          user: {
            ...userWithoutPassword,
            profilePicture: fullUser.profilePicture || "/default-avatar.png",
            position: fullUser.position || "",
            jerseyNumber: fullUser.jerseyNumber || null
          }
        });
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
      
      const match = await storage.createMatch({
        ...req.body,
        teamId,
      });
      
      res.status(201).json(match);
    } catch (error) {
      res.status(500).json({ error: "Failed to create match" });
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
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/teams/:id/announcements/recent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      
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
      
      res.status(201).json(announcement);
    } catch (error) {
      res.status(500).json({ error: "Failed to create announcement" });
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
            password: await hashPasswordInStorage("password"),
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
            password: await hashPasswordInStorage("password"),
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
        
        // Create and add players
        const playerPositions = [
          { name: "David de Gea", position: "Goalkeeper", jersey: 1 },
          { name: "Harry Maguire", position: "Defender", jersey: 5 },
          { name: "Bruno Fernandes", position: "Midfielder", jersey: 8 },
          { name: "Marcus Rashford", position: "Forward", jersey: 10 },
          { name: "Casemiro", position: "Midfielder", jersey: 18 }
        ];

        for (let i = 0; i < playerPositions.length; i++) {
          const player = playerPositions[i];
          const username = `player${i + 1}`;
          
          // Check if player already exists
          const existingPlayer = await storage.getUserByUsername(username);
          let playerUser = existingPlayer;
          
          if (!existingPlayer) {
            playerUser = await storage.createUser({
              username,
              password: await hashPasswordInStorage("password"),
              fullName: player.name,
              role: "player",
              profilePicture: `https://i.pravatar.cc/150?u=${username}`,
              position: player.position,
              jerseyNumber: player.jersey,
              email: `${username}@example.com`,
              phoneNumber: `+1 (555) ${100 + i}-${1000 + i}`
            });
          }
          
          if (playerUser) {
            // Add the player to the team
            await storage.createTeamMember({
              teamId: team.id,
              userId: playerUser.id,
              role: "player"
            });
          }
        }
        
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
        
        // Add player stats
        if (await storage.getUser(3) && await storage.getMatch(1)) {
          await storage.createPlayerStat({
            userId: 3, // Player 1
            matchId: 1,
            goals: 2,
            assists: 1,
            yellowCards: 0,
            redCards: 0,
            minutesPlayed: 90,
            performance: 9
          });
        }
        
        if (await storage.getUser(4) && await storage.getMatch(1)) {
          await storage.createPlayerStat({
            userId: 4, // Player 2
            matchId: 1,
            goals: 1,
            assists: 2,
            yellowCards: 1,
            redCards: 0,
            minutesPlayed: 90,
            performance: 8
          });
        }
        
        if (await storage.getUser(5) && await storage.getMatch(1)) {
          await storage.createPlayerStat({
            userId: 5, // Player 3
            matchId: 1,
            goals: 0,
            assists: 1,
            yellowCards: 0,
            redCards: 0,
            minutesPlayed: 80,
            performance: 7
          });
        }
      }
      
      res.status(200).json({ message: "Mock data created successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create mock data" });
    }
  });

  return httpServer;
}
