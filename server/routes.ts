import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, hasRole } from "./auth-middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for teams
  app.get("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const teams = await storage.getTeamsByUserId(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API routes for team members
  app.get("/api/teams/:id/members", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API routes for matches
  app.get("/api/teams/:id/matches", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const matches = await storage.getMatches(teamId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/teams/:id/matches/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      const matches = await storage.getRecentMatches(teamId, limit);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching recent matches:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API routes for events
  app.get("/api/teams/:id/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const events = await storage.getEvents(teamId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/teams/:id/events/upcoming", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      const events = await storage.getUpcomingEvents(teamId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API routes for announcements
  app.get("/api/teams/:id/announcements", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const announcements = await storage.getAnnouncements(teamId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/teams/:id/announcements/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      const announcements = await storage.getRecentAnnouncements(teamId, limit);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching recent announcements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API routes for player statistics
  app.get("/api/players/:id/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const stats = await storage.getPlayerStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching player stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API routes for league classifications
  app.get("/api/teams/:id/classifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.id);
      const classifications = await storage.getTeamClassifications(teamId);
      res.json(classifications);
    } catch (error) {
      console.error("Error fetching league classifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
