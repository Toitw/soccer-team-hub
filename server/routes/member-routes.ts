import { Router } from "express";
import { storage } from "../storage-implementation";
import { z } from "zod";
import { TeamMemberRole } from "@shared/roles";
import { isAuthenticated, isTeamAdmin, isTeamMember } from "../auth-middleware";

export function createMemberRouter(): Router {
  const router = Router();

  // GET /api/teams/:id/users - Get team users with roles for permission checking
  router.get("/teams/:id/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      // Verify user has access to this team
      const teamUser = await storage.getTeamUser(teamId, req.user.id);
      if (!teamUser) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const teamUsers = await storage.getTeamUsers(teamId);
      res.json(teamUsers);
    } catch (error) {
      console.error("Error fetching team users:", error);
      res.status(500).json({ error: "Failed to fetch team users" });
    }
  });

  // Get specific team member by userId
  router.get("/teams/:id/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      // Verify user has access to this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const member = await storage.getTeamMember(teamId, userId);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error("Error fetching team member:", error);
      res.status(500).json({ error: "Failed to fetch team member" });
    }
  });

  // Get all team members
  router.get("/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      
      console.log(`GET /api/teams/${teamId}/members - Request from user: ${req.user.id}`);
      
      // Verify user has access to this team
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const teamMembers = await storage.getTeamMembers(teamId);
      console.log(`Found ${teamMembers.length} team members for team ${teamId}`);
      
      // Enhance team members with user details
      const teamMembersWithUserDetails = await Promise.all(teamMembers.map(async (member) => {
        if (!member.userId) {
          // Handle members that aren't linked to a user yet
          console.log(`Team member ${member.id} has no linked user yet`);
          return {
            ...member,
            user: null,
            email: null,
            username: null,
            phoneNumber: null,
            profilePicture: member.profilePicture || null,
            isEmailVerified: false,
            onboardingCompleted: false,
            lastLoginAt: null
          };
        } else {
          // Handle members with linked users
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? {
              id: user.id,
              username: user.username,
              email: user.email,
              phoneNumber: user.phoneNumber,
              profilePicture: user.profilePicture,
              isEmailVerified: user.isEmailVerified,
              onboardingCompleted: user.onboardingCompleted,
              lastLoginAt: user.lastLoginAt
            } : null,
            email: user?.email || null,
            username: user?.username || null,
            phoneNumber: user?.phoneNumber || null,
            profilePicture: user?.profilePicture || member.profilePicture || null,
            isEmailVerified: user?.isEmailVerified || false,
            onboardingCompleted: user?.onboardingCompleted || false,
            lastLoginAt: user?.lastLoginAt || null
          };
        }
      }));

      console.log(`Returning ${teamMembersWithUserDetails.length} team members for team ${teamId}`);
      res.json(teamMembersWithUserDetails);
    } catch (error) {
      console.error(`Error fetching team members for team ${req.params.id}:`, error);
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Update a team member
  router.patch("/teams/:teamId/members/:memberId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);
      const updateData = req.body;

      // Verify user is team admin or coach or updating their own profile
      const requesterMember = await storage.getTeamMember(teamId, req.user.id);
      if (!requesterMember) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }

      const memberToUpdate = await storage.getTeamMemberById(memberId);
      if (!memberToUpdate || memberToUpdate.teamId !== teamId) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Check if user can update this member
      const canUpdate = requesterMember.role === "admin" || 
                       requesterMember.role === "coach" || 
                       memberToUpdate.userId === req.user.id;

      if (!canUpdate) {
        return res.status(403).json({ error: "Not authorized to update this team member" });
      }

      // If updating role, only admins can do it
      if (updateData.role && requesterMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can update member roles" });
      }

      const updatedMember = await storage.updateTeamMember(memberId, updateData);
      
      // Get the updated member with all fields for response
      const updatedMemberWithFields = await storage.getTeamMemberById(memberId);
      
      res.json({
        id: updatedMemberWithFields.id,
        fullName: updatedMemberWithFields.fullName,
        role: updatedMemberWithFields.role,
        position: updatedMemberWithFields.position,
        jerseyNumber: updatedMemberWithFields.jerseyNumber
      });
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Create a new team member
  router.post("/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.id);
      const { fullName, role, position, jerseyNumber, profilePicture } = req.body;

      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to add team members" });
      }

      if (!fullName) {
        return res.status(400).json({ error: "Full name is required" });
      }

      // Create the team member
      const newMember = await storage.createTeamMember({
        teamId,
        fullName,
        role: role || TeamMemberRole.PLAYER,
        position: position || null,
        jerseyNumber: jerseyNumber || null,
        profilePicture: profilePicture || null,
        createdById: req.user.id,
        isVerified: false // New members start as unverified
      });

      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  // Delete a team member
  router.delete("/teams/:teamId/members/:memberId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);

      // Verify user is team admin
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || teamMember.role !== "admin") {
        return res.status(403).json({ error: "Only team administrators can delete members" });
      }

      const memberToDelete = await storage.getTeamMemberById(memberId);
      if (!memberToDelete || memberToDelete.teamId !== teamId) {
        return res.status(404).json({ error: "Team member not found" });
      }

      await storage.deleteTeamMember(memberId);
      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  return router;
}