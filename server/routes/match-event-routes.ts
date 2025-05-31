import { Router } from "express";
import { storage } from "../storage-implementation";
import { z } from "zod";
import { isAuthenticated, isTeamAdmin, isTeamMember } from "../auth-middleware";

export function createMatchEventRouter(): Router {
  const router = Router();

  // Get all matches for a team
  router.get("/teams/:id/matches", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      const matches = await storage.getMatches(teamId);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // Get recent matches for a team
  router.get("/teams/:id/matches/recent", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      
      const matches = await storage.getRecentMatches(teamId, limit);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent matches" });
    }
  });

  // Create a new match
  router.post("/teams/:id/matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to create matches" });
      }

      // Check if there is an active season
      const activeSeason = await storage.getActiveSeason(teamId);
      if (!activeSeason) {
        return res.status(400).json({ 
          error: "No active season found", 
          message: "You must create and activate a season before adding matches. Go to the Seasons tab to create one."
        });
      }

      // Parse and validate the match date
      const { matchDate, ...otherData } = req.body;
      if (!matchDate) {
        return res.status(400).json({ error: "Match date is required" });
      }

      const parsedMatchDate = new Date(matchDate);
      if (isNaN(parsedMatchDate.getTime())) {
        return res.status(400).json({ error: "Invalid match date format" });
      }

      const matchData = {
        ...otherData,
        matchDate: parsedMatchDate,
        teamId,
        seasonId: activeSeason.id // Automatically assign to active season
      };

      const newMatch = await storage.createMatch(matchData);
      res.status(201).json(newMatch);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ error: "Failed to create match" });
    }
  });

  // Update a match
  router.patch("/teams/:teamId/matches/:matchId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update matches" });
      }

      // Parse the match date if it's being updated
      const updateData = { ...req.body };
      if (updateData.matchDate) {
        const parsedMatchDate = new Date(updateData.matchDate);
        if (isNaN(parsedMatchDate.getTime())) {
          return res.status(400).json({ error: "Invalid match date format" });
        }
        updateData.matchDate = parsedMatchDate;
      }

      const updatedMatch = await storage.updateMatch(matchId, updateData);
      res.json(updatedMatch);
    } catch (error) {
      console.error("Error updating match:", error);
      res.status(500).json({ error: "Failed to update match" });
    }
  });

  // Delete a match
  router.delete("/teams/:teamId/matches/:matchId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const matchId = parseInt(req.params.matchId);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete matches" });
      }

      await storage.deleteMatch(matchId);
      res.json({ message: "Match deleted successfully" });
    } catch (error) {
      console.error("Error deleting match:", error);
      res.status(500).json({ error: "Failed to delete match" });
    }
  });

  // Get all events for a team
  router.get("/teams/:id/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      // Verify user has access to this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const events = await storage.getEvents(teamId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get upcoming events for a team
  router.get("/teams/:id/events/upcoming", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 10;

      // Verify user has access to this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const events = await storage.getUpcomingEvents(teamId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ error: "Failed to fetch upcoming events" });
    }
  });

  // Create a new event
  router.post("/teams/:id/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const { title, eventType, startTime, endTime, location, description } = req.body;

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to create events" });
      }

      if (!title || !eventType || !startTime || !location) {
        return res.status(400).json({ error: "Title, event type, start time, and location are required" });
      }

      // Parse dates
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = endTime ? new Date(endTime) : null;

      if (isNaN(parsedStartTime.getTime())) {
        return res.status(400).json({ error: "Invalid start time format" });
      }

      if (parsedEndTime && isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({ error: "Invalid end time format" });
      }

      const eventData = {
        title,
        eventType,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        location,
        description: description || null,
        teamId,
        createdById: req.user.id
      };

      const newEvent = await storage.createEvent(eventData);
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Update an event
  router.patch("/teams/:teamId/events/:eventId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update events" });
      }

      const updatedEvent = await storage.updateEvent(eventId, req.body);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Delete an event
  router.delete("/teams/:teamId/events/:eventId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete events" });
      }

      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Get event attendance
  router.get("/teams/:teamId/events/:eventId/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);

      // Verify user has access to this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const attendance = await storage.getAttendance(eventId);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching event attendance:", error);
      res.status(500).json({ error: "Failed to fetch event attendance" });
    }
  });

  // Update event attendance
  router.post("/teams/:teamId/events/:eventId/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const eventId = parseInt(req.params.eventId);
      const { status } = req.body;

      // Verify user has access to this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      if (!status || !["confirmed", "declined", "pending"].includes(status)) {
        return res.status(400).json({ error: "Valid attendance status is required" });
      }

      // Find existing attendance record or create new one
      const existingAttendance = await storage.getAttendance(eventId);
      const userAttendance = existingAttendance.find(a => a.userId === req.user.id);
      
      let attendance;
      if (userAttendance) {
        // Update existing attendance
        attendance = await storage.updateAttendance(userAttendance.id, { status });
      } else {
        // Create new attendance record
        attendance = await storage.createAttendance({
          userId: req.user.id,
          eventId: eventId,
          status: status
        });
      }
      
      res.json(attendance);
    } catch (error) {
      console.error("Error updating event attendance:", error);
      res.status(500).json({ error: "Failed to update event attendance" });
    }
  });

  return router;
}