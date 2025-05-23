import { Router } from "express";
import { storage } from "../storage-implementation";
import { z } from "zod";
import { UserRole, TeamMemberRole } from "@shared/roles";
import { randomBytes } from "crypto";
import { pool } from "../db";
import { isAuthenticated, isAdmin, isTeamAdmin, isTeamMember } from "../auth-middleware";

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

export function createTeamRouter(): Router {
  const router = Router();

  // Route to create a new team for the user
  router.post("/teams/create-default", async (req, res) => {
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

      // Add the current user to the team_users table
      await storage.createTeamUser({
        teamId: team.id,
        userId: req.user.id
      });
      
      // Also add as team admin (member) for now
      await storage.createTeamMember({
        teamId: team.id,
        fullName: req.user.fullName || "Team Admin",
        role: TeamMemberRole.ADMIN,
        createdById: req.user.id,
        userId: req.user.id,
        isVerified: true
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

  // Get all teams for the authenticated user
  router.get("/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Fetching teams for user ID:", req.user.id);
      const teams = await storage.getTeamsByUserId(req.user.id);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Create a new team
  router.post("/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { name, logo, division, teamType, category, seasonYear } = req.body;
      
      if (!name || !division) {
        return res.status(400).json({ error: "Team name and division are required" });
      }

      // Generate a join code for the team
      const joinCode = generateJoinCode();
      
      const newTeam = await storage.createTeam({
        name,
        logo: logo || "",
        division,
        seasonYear: seasonYear || new Date().getFullYear().toString(),
        createdById: req.user.id,
        teamType: teamType || "11-a-side",
        category: category || "AMATEUR",
        joinCode,
        ownerId: req.user.id
      });

      // Add the current user to the team_users table
      await storage.createTeamUser({
        teamId: newTeam.id,
        userId: req.user.id
      });
      
      // Also add as team admin (member)
      await storage.createTeamMember({
        teamId: newTeam.id,
        fullName: req.user.fullName || "Team Admin",
        role: TeamMemberRole.ADMIN,
        createdById: req.user.id,
        userId: req.user.id,
        isVerified: true
      });

      res.status(201).json(newTeam);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  // Generate join code for a team
  router.post("/teams/:id/join-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Join code is required" });
      }

      // Find team by join code
      const team = await storage.getTeamByJoinCode(code);
      if (!team) {
        return res.status(404).json({ error: "Invalid join code" });
      }

      // Add user to team_users table
      await storage.createTeamUser({
        teamId: team.id,
        userId: req.user.id
      });

      res.json({ 
        message: "Successfully joined team",
        team: {
          id: team.id,
          name: team.name,
          logo: team.logo
        }
      });
    } catch (error) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        return res.status(409).json({ error: "You are already a member of this team" });
      }
      console.error("Error joining team:", error);
      res.status(500).json({ error: "Failed to join team" });
    }
  });

  // Validate join code
  router.get("/validate-join-code/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      
      const team = await storage.getTeamByJoinCode(code);
      if (!team) {
        return res.status(404).json({ error: "Invalid join code" });
      }

      res.json({
        valid: true,
        team: {
          id: team.id,
          name: team.name,
          logo: team.logo,
          division: team.division
        }
      });
    } catch (error) {
      console.error("Error validating join code:", error);
      res.status(500).json({ error: "Failed to validate join code" });
    }
  });

  // Get team details
  router.get("/teams/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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

  // Update team logo
  router.post("/teams/:id/logo", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      const { logo } = req.body;
      
      if (!logo) {
        return res.status(400).json({ error: "Logo URL is required" });
      }

      // Verify user is team admin
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update team logo" });
      }

      const updatedTeam = await storage.updateTeam(teamId, { logo });
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team logo:", error);
      res.status(500).json({ error: "Failed to update team logo" });
    }
  });

  // Update team details
  router.patch("/teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      const updateData = req.body;

      // Verify user is team admin
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update team" });
      }

      const updatedTeam = await storage.updateTeam(teamId, updateData);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  // Regenerate team join code
  router.post("/teams/:id/regenerate-join-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);

      // Verify user is team admin
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to regenerate join code" });
      }

      // Generate new join code
      const newJoinCode = generateJoinCode();
      
      const updatedTeam = await storage.updateTeam(teamId, { joinCode: newJoinCode });
      res.json({ 
        joinCode: newJoinCode,
        message: "Join code regenerated successfully"
      });
    } catch (error) {
      console.error("Error regenerating join code:", error);
      res.status(500).json({ error: "Failed to regenerate join code" });
    }
  });

  return router;
}