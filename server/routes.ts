import express, { type Express, Router } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-implementation";

import { setupAuth } from "./auth";
import { z } from "zod";
import { UserRole, TeamMemberRole } from "@shared/roles";
import { randomBytes } from "crypto";
import { createAdminRouter } from "./routes/admin-routes";
import authRoutes from "./optimized/auth-routes";
import { createClaimsRouter } from "./routes/claims-routes";
import { createTeamRouter } from "./routes/team-routes";
import { createMemberRouter } from "./routes/member-routes";
import { createMatchEventRouter } from "./routes/match-event-routes";
import { createAnnouncementRouter } from "./routes/announcement-routes";
import { createSeasonRouter } from "./routes/season-routes";
import { checkDatabaseHealth } from "./db-health";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import { teamMembers } from "@shared/schema";
import { isAuthenticated, isAdmin, isTeamAdmin, isTeamMember, requireRole, requireTeamRole, checkApiPermission } from "./auth-middleware";



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
  
  // Feedback routes are now handled in the admin router
  
  // Add the permissions middleware after authentication is setup
  app.use(checkApiPermission());
  
  // Register admin routes using the imported admin router that has our fixes
  const adminRouter = createAdminRouter(storage);
  
  // Register claims routes
  const claimsRouter = createClaimsRouter();
  
  // Register team routes
  const teamRouter = createTeamRouter();
  
  // Register member routes
  const memberRouter = createMemberRouter();
  
  // Register match and event routes
  const matchEventRouter = createMatchEventRouter();
  
  // Register announcement routes
  const announcementRouter = createAnnouncementRouter();
  
  // Register season routes
  const seasonRouter = createSeasonRouter();
  
  // Attach routers to main app
  app.use('/api', adminRouter);
  app.use('/api', claimsRouter);
  app.use('/api', teamRouter);
  app.use('/api', memberRouter);
  app.use('/api', matchEventRouter);
  app.use('/api', announcementRouter);
  app.use('/api', seasonRouter);

  // Database monitoring endpoints
  app.get("/api/health", async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Detailed database health endpoint (for authenticated superusers only)
  app.get("/api/admin/database/health", requireRole([UserRole.SUPERUSER]), async (req, res) => {
    try {
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
          // First try to get user directly
          let user = await storage.getUser(playerId);
          
          // If no user found, try to find team member and get associated user
          if (!user) {
            const teamMembers = await storage.getTeamMembers(teamId);
            const teamMember = teamMembers.find(m => m.id === playerId || m.userId === playerId);
            
            if (teamMember && teamMember.userId) {
              user = await storage.getUser(teamMember.userId);
            } else if (teamMember) {
              // If team member exists but no linked user, return team member data as user-like object
              return {
                id: teamMember.userId || teamMember.id,
                fullName: teamMember.fullName,
                position: teamMember.position,
                jerseyNumber: teamMember.jerseyNumber
              };
            }
          }
          
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
            // First try to get user directly
            let user = await storage.getUser(playerId);
            
            // If no user found, try to find team member and get associated user
            if (!user) {
              const teamMembers = await storage.getTeamMembers(teamId);
              const teamMember = teamMembers.find(m => m.id === playerId || m.userId === playerId);
              
              if (teamMember && teamMember.userId) {
                user = await storage.getUser(teamMember.userId);
              } else if (teamMember) {
                // If team member exists but no linked user, return team member data as user-like object
                return {
                  id: teamMember.userId || teamMember.id,
                  fullName: teamMember.fullName,
                  position: teamMember.position,
                  jerseyNumber: teamMember.jerseyNumber
                };
              }
            }
            
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

      console.log("Lineup save request:", { teamId, matchId, playerIds, benchPlayerIds, formation, positionMapping });
      
      // Validate that playerIds is an array and has content
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        console.log("Invalid or empty playerIds:", playerIds);
        return res.status(400).json({ error: "At least one player must be in the starting lineup" });
      }

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
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const lineup = await storage.getTeamLineup(teamId);

      if (!lineup) {
        // Return a default empty lineup structure instead of 404
        // This allows the frontend to display an empty formation that can be edited
        return res.json({
          id: -1,
          teamId: teamId,
          formation: "4-4-2", // Default formation
          positionMapping: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
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
      
      // Return empty array if no substitutions found
      if (!substitutions || substitutions.length === 0) {
        return res.json([]);
      }

      // Get player details for substitutions
      const substitutionsWithPlayerDetails = await Promise.all(
        substitutions.map(async (sub) => {
          const playerIn = await storage.getTeamMemberById(sub.playerInId);
          const playerOut = await storage.getTeamMemberById(sub.playerOutId);

          if (!playerIn || !playerOut) return null;

          return {
            ...sub,
            playerIn,
            playerOut
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
      const { playerInId, playerOutId, minute } = req.body;

      console.log('Substitution request:', { teamId, matchId, playerInId, playerOutId, minute, userId: req.user.id });

      // Check if user is a member of the team with admin or coach role
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      console.log('Team member check result:', teamMember);
      
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        console.log('Authorization failed - user role:', teamMember?.role);
        return res.status(403).json({ error: "Not authorized to modify team data" });
      }

      // Check if match belongs to the team
      const match = await storage.getMatch(matchId);
      if (!match || match.teamId !== teamId) {
        console.log('Match not found or wrong team:', { match, expectedTeamId: teamId });
        return res.status(404).json({ error: "Match not found" });
      }

      // Create new substitution (removed reason field as it doesn't exist in database)
      const substitution = await storage.createMatchSubstitution({
        matchId,
        playerInId,
        playerOutId,
        minute
      });

      console.log('Substitution created successfully:', substitution);
      res.status(201).json(substitution);
    } catch (error) {
      console.error('Error creating substitution:', error);
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
      
      // Return empty array if no goals found
      if (!goals || goals.length === 0) {
        return res.json([]);
      }

      // Get player details for goals
      const goalsWithPlayerDetails = await Promise.all(
        goals.map(async (goal) => {
          const scorer = await storage.getTeamMemberById(goal.scorerId);
          if (!scorer) return null;

          let assistPlayer = null;
          if (goal.assistId) {
            assistPlayer = await storage.getTeamMemberById(goal.assistId);
          }

          return {
            ...goal,
            scorer,
            assistPlayer
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
        isOwnGoal: req.body.isOwnGoal || false,
        isPenalty: req.body.isPenalty || false
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
          const player = await storage.getTeamMemberById(card.playerId);
          if (!player) return null;

          return {
            ...card,
            player
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

      console.log('Card request:', { teamId, matchId, playerId, type, minute, reason, userId: req.user.id });

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

      // Map card type to database fields
      const isYellow = type === "yellow" || type === "second_yellow";
      const isSecondYellow = type === "second_yellow";

      // Create new card
      const card = await storage.createMatchCard({
        matchId,
        playerId,
        minute,
        isYellow,
        isSecondYellow,
        reason
      });

      console.log('Card created successfully:', card);
      res.status(201).json(card);
    } catch (error) {
      console.error('Error creating card:', error);
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
            role: UserRole.ADMIN,
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
            role: UserRole.COACH,
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
          fullName: adminUser!.fullName,
          createdById: adminUser!.id,
          userId: adminUser!.id,
          role: TeamMemberRole.ADMIN,
          isVerified: true
        });

        if (coachUser) {
          await storage.createTeamMember({
            teamId: team.id,
            fullName: coachUser.fullName,
            createdById: adminUser!.id,
            userId: coachUser.id,
            role: TeamMemberRole.COACH,
            isVerified: true
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

  // Season routes
  // Get all seasons for a team
  app.get("/api/teams/:id/seasons", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      const seasons = await storage.getSeasons(teamId);
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ error: "Failed to fetch seasons" });
    }
  });

  // Get active seasons for a team
  app.get("/api/teams/:id/seasons/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      const seasons = await storage.getActiveSeasons(teamId);
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching active seasons:", error);
      res.status(500).json({ error: "Failed to fetch active seasons" });
    }
  });

  // Get a specific season by ID
  app.get("/api/seasons/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const seasonId = parseInt(req.params.id);
      const season = await storage.getSeason(seasonId);
      
      if (!season) {
        return res.status(404).json({ error: "Season not found" });
      }
      
      // Check if user is a member of the team that owns this season
      const teamMember = await storage.getTeamMember(season.teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this season" });
      }
      
      res.json(season);
    } catch (error) {
      console.error("Error fetching season:", error);
      res.status(500).json({ error: "Failed to fetch season" });
    }
  });

  // Create a new season for a team
  app.post("/api/teams/:id/seasons", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      // Check if user is an admin of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can create seasons" });
      }
      
      // Validate request body
      const { name, startDate } = req.body;
      if (!name || !startDate) {
        return res.status(400).json({ error: "Season name and start date are required" });
      }
      
      // Create the season
      const season = await storage.createSeason({
        name,
        startDate: new Date(startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        teamId
      });
      
      res.status(201).json(season);
    } catch (error) {
      console.error("Error creating season:", error);
      res.status(500).json({ error: "Failed to create season" });
    }
  });

  // Update a season
  app.patch("/api/seasons/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const seasonId = parseInt(req.params.id);
      const season = await storage.getSeason(seasonId);
      
      if (!season) {
        return res.status(404).json({ error: "Season not found" });
      }
      
      // Check if user is an admin of the team that owns this season
      const teamMember = await storage.getTeamMember(season.teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can update seasons" });
      }
      
      // Update the season
      const updatedSeason = await storage.updateSeason(seasonId, req.body);
      res.json(updatedSeason);
    } catch (error) {
      console.error("Error updating season:", error);
      res.status(500).json({ error: "Failed to update season" });
    }
  });

  // Delete a season
  app.delete("/api/seasons/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const seasonId = parseInt(req.params.id);
      const season = await storage.getSeason(seasonId);
      
      if (!season) {
        return res.status(404).json({ error: "Season not found" });
      }
      
      // Check if user is an admin of the team that owns this season
      const teamMember = await storage.getTeamMember(season.teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can delete seasons" });
      }
      
      // Delete the season
      const deleted = await storage.deleteSeason(seasonId);
      
      if (deleted) {
        res.json({ message: "Season deleted successfully" });
      } else {
        res.status(400).json({ error: "Cannot delete season as it has related classifications" });
      }
    } catch (error) {
      console.error("Error deleting season:", error);
      res.status(500).json({ error: "Failed to delete season" });
    }
  });

  // Mark a season as finished (set end date and isActive=false)
  app.post("/api/seasons/:id/finish", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const seasonId = parseInt(req.params.id);
      const season = await storage.getSeason(seasonId);
      
      if (!season) {
        return res.status(404).json({ error: "Season not found" });
      }
      
      // Check if user is an admin of the team that owns this season
      const teamMember = await storage.getTeamMember(season.teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can finish seasons" });
      }
      
      // Finish the season
      const finishedSeason = await storage.finishSeason(seasonId);
      
      if (finishedSeason) {
        res.json(finishedSeason);
      } else {
        res.status(500).json({ error: "Failed to finish season" });
      }
    } catch (error) {
      console.error("Error finishing season:", error);
      res.status(500).json({ error: "Failed to finish season" });
    }
  });

  // Get league classifications for a specific season
  app.get("/api/teams/:teamId/seasons/:seasonId/classifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const seasonId = parseInt(req.params.seasonId);
      
      // Check if user is a member of the team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      // Verify the season exists and belongs to this team
      const season = await storage.getSeason(seasonId);
      if (!season || season.teamId !== teamId) {
        return res.status(404).json({ error: "Season not found for this team" });
      }
      
      const classifications = await storage.getLeagueClassificationsBySeason(teamId, seasonId);
      res.json(classifications);
    } catch (error) {
      console.error("Error fetching classifications by season:", error);
      res.status(500).json({ error: "Failed to fetch classifications" });
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
      
      // Check if a seasonId was provided and validate it belongs to the team
      if (req.body.seasonId) {
        const season = await storage.getSeason(req.body.seasonId);
        if (!season || season.teamId !== teamId) {
          return res.status(400).json({ error: "Invalid season ID provided" });
        }
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
      
      // Check if a seasonId was provided and validate it belongs to the team
      if (req.body.seasonId) {
        const season = await storage.getSeason(req.body.seasonId);
        if (!season || season.teamId !== classification.teamId) {
          return res.status(400).json({ error: "Invalid season ID provided" });
        }
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
      
      // Check if a seasonId was provided for all classifications and validate it belongs to the team
      const { seasonId } = req.body;
      if (seasonId) {
        const season = await storage.getSeason(seasonId);
        if (!season || season.teamId !== teamId) {
          return res.status(400).json({ error: "Invalid season ID provided" });
        }
      }

      // Delete all existing classifications for this team before adding new ones
      let existingClassifications = await storage.getLeagueClassifications(teamId);
      
      // If a seasonId is provided, only delete classifications for that season
      if (seasonId) {
        existingClassifications = existingClassifications.filter(c => c.seasonId === seasonId);
      }
      
      for (const classification of existingClassifications) {
        await storage.deleteLeagueClassification(classification.id);
      }
      
      // Add teamId to each classification
      const classificationsWithTeamId = classifications.map(c => ({
        ...c,
        teamId,
        seasonId: seasonId || null
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