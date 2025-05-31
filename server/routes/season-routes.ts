import { Router } from "express";
import { storage } from "../storage-implementation";
import { z } from "zod";
import { isAuthenticated, isTeamAdmin, isTeamMember } from "../auth-middleware";
import { insertSeasonSchema } from "@shared/schema";

export function createSeasonRouter(): Router {
  const router = Router();

  // Get all seasons for a team
  router.get("/teams/:teamId/seasons", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      const seasons = await storage.getSeasons(teamId);
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ error: "Failed to fetch seasons" });
    }
  });

  // Get active season for a team
  router.get("/teams/:teamId/seasons/active", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      const activeSeason = await storage.getActiveSeason(teamId);
      res.json(activeSeason);
    } catch (error) {
      console.error("Error fetching active season:", error);
      res.status(500).json({ error: "Failed to fetch active season" });
    }
  });

  // Create a new season
  router.post("/teams/:teamId/seasons", isTeamAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      // Parse dates first before validation
      const { startDate, endDate, ...otherData } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // Validate date logic
      if (parsedStartDate >= parsedEndDate) {
        return res.status(400).json({ error: "Start date must be before end date" });
      }

      const seasonData = {
        ...otherData,
        teamId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isActive: true // Default to active for new seasons
      };

      // If this season is being set as active, deactivate other seasons
      await storage.deactivateAllSeasons(teamId);

      const newSeason = await storage.createSeason(seasonData);
      res.status(201).json(newSeason);
    } catch (error) {
      console.error("Error creating season:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid season data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create season" });
    }
  });

  // Update a season
  router.patch("/teams/:teamId/seasons/:seasonId", isTeamAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const seasonId = parseInt(req.params.seasonId);

      // Check if season belongs to team
      const existingSeason = await storage.getSeason(seasonId);
      if (!existingSeason || existingSeason.teamId !== teamId) {
        return res.status(404).json({ error: "Season not found" });
      }

      // Parse dates if provided
      const updateData = { ...req.body };
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      // If setting this season as active, deactivate others
      if (updateData.isActive === true) {
        await storage.deactivateAllSeasons(teamId);
      }

      const updatedSeason = await storage.updateSeason(seasonId, updateData);
      res.json(updatedSeason);
    } catch (error) {
      console.error("Error updating season:", error);
      res.status(500).json({ error: "Failed to update season" });
    }
  });

  // Delete a season
  router.delete("/teams/:teamId/seasons/:seasonId", isTeamAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const seasonId = parseInt(req.params.seasonId);

      // Check if season belongs to team
      const existingSeason = await storage.getSeason(seasonId);
      if (!existingSeason || existingSeason.teamId !== teamId) {
        return res.status(404).json({ error: "Season not found" });
      }

      // Check if there are matches or other data tied to this season
      const seasonMatches = await storage.getMatchesBySeason(seasonId);
      if (seasonMatches.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete season with existing matches", 
          details: `This season has ${seasonMatches.length} matches. Please delete the matches first.`
        });
      }

      await storage.deleteSeason(seasonId);
      res.json({ message: "Season deleted successfully" });
    } catch (error) {
      console.error("Error deleting season:", error);
      res.status(500).json({ error: "Failed to delete season" });
    }
  });

  // Get season statistics
  router.get("/teams/:teamId/seasons/:seasonId/stats", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const seasonId = parseInt(req.params.seasonId);

      // Check if season belongs to team
      const season = await storage.getSeason(seasonId);
      if (!season || season.teamId !== teamId) {
        return res.status(404).json({ error: "Season not found" });
      }

      const stats = await storage.getSeasonStats(seasonId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching season stats:", error);
      res.status(500).json({ error: "Failed to fetch season statistics" });
    }
  });

  return router;
}