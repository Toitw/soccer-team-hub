import { Router } from "express";
import { storage } from "../storage-implementation";
import { isAuthenticated, isTeamAdmin, isTeamMember } from "../auth-middleware";

export function createAnnouncementRouter(): Router {
  const router = Router();

  // Get all announcements for a team
  router.get("/teams/:id/announcements", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const announcements = await storage.getAnnouncements(teamId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Get recent announcements for a team
  router.get("/teams/:id/announcements/recent", isTeamMember, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      
      const announcements = await storage.getRecentAnnouncements(teamId, limit);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching recent announcements:", error);
      res.status(500).json({ error: "Failed to fetch recent announcements" });
    }
  });

  // Create a new announcement
  router.post("/teams/:id/announcements", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { title, content } = req.body;

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to create announcements" });
      }

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const newAnnouncement = await storage.createAnnouncement({
        teamId,
        title,
        content,
        createdById: req.user.id
      });

      res.status(201).json(newAnnouncement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Update an announcement
  router.patch("/teams/:teamId/announcements/:announcementId", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const announcementId = parseInt(req.params.announcementId);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to update announcements" });
      }

      const updatedAnnouncement = await storage.updateAnnouncement(announcementId, req.body);
      res.json(updatedAnnouncement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Delete an announcement
  router.delete("/teams/:teamId/announcements/:announcementId", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const announcementId = parseInt(req.params.announcementId);

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to delete announcements" });
      }

      await storage.deleteAnnouncement(announcementId);
      res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  return router;
}