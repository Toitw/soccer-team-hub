import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { comparePasswords, hashPassword } from "./auth";
import { eventTypeEnum, matchStatusEnum, userRoleEnum } from "../shared/schema";
import { z } from "zod";

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// Role middleware
function hasRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userRole = req.session.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const passwordMatches = await comparePasswords(password, user.password);
      
      if (!passwordMatches) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Create session
      req.session.user = user;
      
      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/session", (req: Request, res: Response) => {
    if (req.session && req.session.user) {
      const { password: _, ...userWithoutPassword } = req.session.user;
      return res.status(200).json(userWithoutPassword);
    }
    return res.status(401).json({ error: "Not authenticated" });
  });
  
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, fullName, email, position, jerseyNumber, phoneNumber } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create new user
      const newUser = await storage.insertUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        position,
        jerseyNumber,
        phoneNumber,
        role: "player", // Default role
      });
      
      // Create session
      req.session.user = newUser;
      
      // Don't send password to client
      const { password: _, ...userWithoutPassword } = newUser;
      
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Team routes
  app.get("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user.id;
      const teams = await storage.getTeamsByUserId(userId);
      return res.status(200).json(teams);
    } catch (error) {
      console.error("Get teams error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user.id;
      const { name, description, logo, primaryColor, secondaryColor, website } = req.body;
      
      // Create team
      const newTeam = await storage.insertTeam({
        name,
        description,
        logo,
        primaryColor,
        secondaryColor,
        website,
        ownerId: userId,
        joinCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      });
      
      // Add creator as admin member
      await storage.insertTeamMember({
        teamId: newTeam.id,
        userId,
        role: "admin",
      });
      
      return res.status(201).json(newTeam);
    } catch (error) {
      console.error("Create team error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/teams/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const team = await storage.getTeamById(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      return res.status(200).json(team);
    } catch (error) {
      console.error("Get team error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/teams/players/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const players = await storage.getTeamPlayers(teamId);
      return res.status(200).json(players);
    } catch (error) {
      console.error("Get team players error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Match routes
  app.get("/api/matches/next/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const nextMatch = await storage.getNextMatch(teamId);
      return res.status(200).json(nextMatch);
    } catch (error) {
      console.error("Get next match error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/matches/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const matches = await storage.getMatchesByTeamId(teamId);
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Get matches error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Event routes
  app.get("/api/events/upcoming/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const events = await storage.getUpcomingEvents(teamId);
      return res.status(200).json(events);
    } catch (error) {
      console.error("Get upcoming events error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Announcement routes
  app.get("/api/announcements/recent/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const announcements = await storage.getRecentAnnouncements(teamId);
      return res.status(200).json(announcements);
    } catch (error) {
      console.error("Get recent announcements error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Team stats
  app.get("/api/teams/stats/:teamId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const stats = await storage.getTeamStats(teamId);
      return res.status(200).json(stats);
    } catch (error) {
      console.error("Get team stats error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Diagnostics
  app.get("/api/diagnostics", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
