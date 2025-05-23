import { Router } from "express";
import { storage } from "../storage-implementation";
import { isAuthenticated } from "../auth-middleware";

export function createClaimsRouter(): Router {
  const router = Router();

  // Get all claims for a team (admin/coach only)
  router.get("/teams/:id/claims", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      
      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to access team claims" });
      }
      
      const claims = await storage.getMemberClaims(teamId);
      
      // Enhance claims with member and user details
      const enhancedClaims = await Promise.all(claims.map(async (claim) => {
        const member = await storage.getTeamMemberById(claim.teamMemberId);
        const user = await storage.getUser(claim.userId);
        
        return {
          ...claim,
          member: member ? {
            id: member.id,
            fullName: member.fullName,
            position: member.position,
            jerseyNumber: member.jerseyNumber,
            role: member.role
          } : null,
          user: user ? {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePicture: user.profilePicture,
            email: user.email
          } : null
        };
      }));
      
      res.json(enhancedClaims);
    } catch (error) {
      console.error("Error getting member claims:", error);
      res.status(500).json({ error: "Failed to get team member claims" });
    }
  });
  
  // Get my claims for a team
  router.get("/teams/:id/my-claims", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user has access to the team
      const teamUser = await storage.getTeamUser(teamId, userId);
      if (!teamUser) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      // Get all claims by this user for this team
      const allUserClaims = await storage.getMemberClaimsByUser(userId);
      const teamClaims = allUserClaims.filter(claim => claim.teamId === teamId);
      
      // Enhance claims with member details
      const enhancedClaims = await Promise.all(teamClaims.map(async (claim) => {
        const member = await storage.getTeamMemberById(claim.teamMemberId);
        
        return {
          ...claim,
          member: member ? {
            id: member.id,
            fullName: member.fullName,
            position: member.position,
            jerseyNumber: member.jerseyNumber,
            role: member.role
          } : null
        };
      }));
      
      res.json(enhancedClaims);
    } catch (error) {
      console.error("Error getting user claims:", error);
      res.status(500).json({ error: "Failed to get your member claims" });
    }
  });
  
  // Create a claim for a member
  router.post("/teams/:id/claims", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const userId = req.user.id;
      const { teamMemberId } = req.body;
      
      if (!teamMemberId) {
        return res.status(400).json({ error: "Team member ID is required" });
      }
      
      // Check if user has access to the team
      const teamUser = await storage.getTeamUser(teamId, userId);
      if (!teamUser) {
        return res.status(403).json({ error: "Not authorized to access this team" });
      }
      
      // Check if the member exists
      const member = await storage.getTeamMemberById(teamMemberId);
      if (!member || member.teamId !== teamId) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      // Check if claim already exists
      const allUserClaims = await storage.getMemberClaimsByUser(userId);
      const existingClaim = allUserClaims.find(
        claim => claim.teamId === teamId && claim.teamMemberId === teamMemberId
      );
      
      if (existingClaim) {
        return res.status(409).json({ 
          error: "You already have a claim for this team member",
          claim: existingClaim
        });
      }
      
      // Create new claim
      const newClaim = await storage.createMemberClaim({
        teamId,
        teamMemberId,
        userId
      });
      
      res.status(201).json(newClaim);
    } catch (error) {
      console.error("Error creating member claim:", error);
      res.status(500).json({ error: "Failed to create team member claim" });
    }
  });
  
  // Update claim status (admin/coach only)
  router.put("/teams/:teamId/claims/:claimId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.teamId);
      const claimId = parseInt(req.params.claimId);
      const { status, rejectionReason } = req.body;
      
      // Get the claim
      const claim = await storage.getMemberClaimById(claimId);
      if (!claim || claim.teamId !== teamId) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      // Update claim
      const updatedClaim = await storage.updateMemberClaim(claimId, {
        status,
        rejectionReason: status === "rejected" ? rejectionReason : null,
        reviewedAt: new Date(),
        reviewedById: req.user.id
      });
      
      // If approved, update the team member with the userId
      if (status === "approved") {
        await storage.updateTeamMember(claim.teamMemberId, {
          userId: claim.userId,
          isVerified: true
        });
      }
      
      res.json(updatedClaim);
    } catch (error) {
      console.error("Error updating member claim:", error);
      res.status(500).json({ error: "Failed to update claim" });
    }
  });
  
  // Approve claim (shortcut route for admin/coach)
  router.post("/teams/:teamId/claims/:claimId/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.teamId);
      const claimId = parseInt(req.params.claimId);
      
      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to approve claims" });
      }
      
      // Get the claim
      const claim = await storage.getMemberClaimById(claimId);
      if (!claim || claim.teamId !== teamId) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      // Update claim
      const updatedClaim = await storage.updateMemberClaim(claimId, {
        status: "approved",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedById: req.user.id
      });
      
      // Update the team member with the userId
      await storage.updateTeamMember(claim.teamMemberId, {
        userId: claim.userId,
        isVerified: true
      });
      
      res.json(updatedClaim);
    } catch (error) {
      console.error("Error approving member claim:", error);
      res.status(500).json({ error: "Failed to approve claim" });
    }
  });
  
  // Reject claim (shortcut route for admin/coach)
  router.post("/teams/:teamId/claims/:claimId/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.teamId);
      const claimId = parseInt(req.params.claimId);
      const { reason } = req.body;
      
      // Verify user is team admin or coach
      const teamMember = await storage.getTeamMember(teamId, req.user.id);
      if (!teamMember || (teamMember.role !== "admin" && teamMember.role !== "coach")) {
        return res.status(403).json({ error: "Not authorized to reject claims" });
      }
      
      // Get the claim
      const claim = await storage.getMemberClaimById(claimId);
      if (!claim || claim.teamId !== teamId) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      // Update claim
      const updatedClaim = await storage.updateMemberClaim(claimId, {
        status: "rejected",
        rejectionReason: reason || null,
        reviewedAt: new Date(),
        reviewedById: req.user.id
      });
      
      res.json(updatedClaim);
    } catch (error) {
      console.error("Error rejecting member claim:", error);
      res.status(500).json({ error: "Failed to reject claim" });
    }
  });
  
  // Get notifications for pending claims
  router.get("/notifications/claims", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Get all teams where the user is an admin
      const userTeams = await storage.getTeamsByUserId(userId);
      const adminTeams = [];
      
      // Check each team if the user is an admin
      for (const team of userTeams) {
        const teamMember = await storage.getTeamMember(team.id, userId);
        if (teamMember && teamMember.role === 'admin') {
          adminTeams.push(team);
        }
      }
      
      if (adminTeams.length === 0) {
        return res.json([]);
      }
      
      // For each team, get the pending claims and count them
      const notifications = [];
      
      for (const team of adminTeams) {
        const claims = await storage.getMemberClaims(team.id);
        const pendingClaims = claims.filter(claim => claim.status === 'pending');
        
        if (pendingClaims.length > 0) {
          // Sort by date to get the latest
          const sortedClaims = pendingClaims.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          notifications.push({
            type: 'claims',
            teamId: team.id,
            teamName: team.name,
            count: pendingClaims.length,
            latestClaim: sortedClaims[0],
            message: `${pendingClaims.length} pending member claim${pendingClaims.length > 1 ? 's' : ''} for ${team.name}`
          });
        }
      }
      
      res.json(notifications);
    } catch (error) {
      console.error("Error getting claim notifications:", error);
      res.status(500).json({ error: "Failed to get claim notifications" });
    }
  });

  return router;
}