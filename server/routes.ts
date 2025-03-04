import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, hashPasswordInStorage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  const httpServer = createServer(app);

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
          
          const { password, ...userWithoutPassword } = user;
          return {
            ...member,
            user: userWithoutPassword,
          };
        })
      );
      
      res.json(teamMembersWithUserDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
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
      
      const { userId, role } = req.body;
      
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
      
      if (existingTeams.length === 0) {
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
