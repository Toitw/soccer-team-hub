import { Router, Request, Response, NextFunction } from 'express';
import { IStorage } from '../storage';
import { hashPassword } from '../auth';
import { asyncHandler, jsonResponse, errorResponse, notFoundResponse, successResponse, createdResponse } from '../route-utils';
import { insertUserSchema, insertTeamSchema } from '@shared/schema';
import { generateJoinCode } from '../utils/join-code';
import { z } from 'zod';

export function createAdminRouter(storage: IStorage) {
  const router = Router();
  // Middleware to check if user is a superuser
  const requireSuperuser = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'superuser') {
      // Set content type to ensure proper JSON response
      res.setHeader('Content-Type', 'application/json');
      next();
    } else {
      res.status(403).json({ error: 'Forbidden - Superuser access required' });
    }
  };

  // Feedback routes - allow authenticated users to submit, superusers to view/manage
  router.post('/feedback', asyncHandler(async (req: Request, res: Response) => {
    // Allow any authenticated user to submit feedback
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    try {
      console.log('ADMIN ROUTER FEEDBACK: Request body received:', req.body);
      const { name, email, type, message } = req.body;
      
      console.log('ADMIN ROUTER FEEDBACK: Extracted fields:', { name, email, type, message });
      
      if (!type || !message) {
        console.log('ADMIN ROUTER FEEDBACK: Validation failed - missing type or message');
        return res.status(400).json({ error: 'Type and message are required' });
      }

      const feedback = await storage.createFeedback({
        userId: req.user.id,
        name,
        email,
        type,
        subject: `${type.charAt(0).toUpperCase() + type.slice(1)} feedback`, // Generate subject from type
        message
      });

      res.status(201).json({ 
        success: true, 
        message: "Feedback submitted successfully" 
      });
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }));

  router.get('/feedback', requireSuperuser, asyncHandler(async (req: Request, res: Response) => {
    try {
      const feedback = await storage.getAllFeedback();
      return jsonResponse(res, feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return errorResponse(res, 'Failed to fetch feedback');
    }
  }));

  router.patch('/feedback/:id', requireSuperuser, asyncHandler(async (req: Request, res: Response) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      const updatedFeedback = await storage.updateFeedbackStatus(feedbackId, status);
      return jsonResponse(res, updatedFeedback);
    } catch (error) {
      console.error('Error updating feedback:', error);
      return errorResponse(res, 'Failed to update feedback');
    }
  }));

  // Admin routes - all protected by superuser check
  router.use('/admin', requireSuperuser);

  // Get all users (only actual users, not team members)
  router.get('/admin/users', asyncHandler(async (req: Request, res: Response) => {
    // Get only actual users from the users table
    const users = await storage.getAllUsers();
    
    // Filter out any entities that aren't actual users
    // This ensures we only return proper user accounts, not team members
    const filteredUsers = users.filter(user => 
      // A valid user must have a username and password
      user && user.username && user.password
    );
    
    return jsonResponse(res, filteredUsers);
  }));

  // Get user by ID - ensure we only return actual users
  router.get('/admin/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Verify this is a real user account, not a team member
    if (!user.username || !user.password) {
      return notFoundResponse(res, 'User');
    }
    
    return jsonResponse(res, user);
  }));
  
  // Get teams for a specific user (for admin panel)
  router.get('/admin/users/:id/teams', asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Get teams the user belongs to
    try {
      const teams = await storage.getTeamsByUserId(userId);
      return jsonResponse(res, teams);
    } catch (error) {
      console.error(`Error fetching teams for user ${userId}:`, error);
      return jsonResponse(res, []);
    }
  }));

  // Create a new user
  router.post('/admin/users', asyncHandler(async (req: Request, res: Response) => {
    // Parse and validate request body
    const validData = insertUserSchema.parse(req.body);
    
    // Hash password if provided
    if (validData.password) {
      validData.password = await hashPassword(validData.password);
    }
    
    // Create user
    const newUser = await storage.createUser(validData);
    
    return createdResponse(res, {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      email: newUser.email,
      profilePicture: newUser.profilePicture,
      position: newUser.position,
      jerseyNumber: newUser.jerseyNumber,
      phoneNumber: newUser.phoneNumber
    });
  }));

  // Create a new superuser
  router.post('/admin/superuser', asyncHandler(async (req: Request, res: Response) => {
    // Parse and validate request body
    const validData = insertUserSchema.parse({
      ...req.body,
      role: 'superuser' // Force role to be superuser
    });
    
    // Hash password if provided
    if (validData.password) {
      validData.password = await hashPassword(validData.password);
    }
    
    // Create user
    const newUser = await storage.createUser(validData);
    
    return createdResponse(res, {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      email: newUser.email,
      profilePicture: newUser.profilePicture,
      position: newUser.position,
      jerseyNumber: newUser.jerseyNumber,
      phoneNumber: newUser.phoneNumber
    });
  }));

  // Update user
  router.put('/admin/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const existingUser = await storage.getUser(id);
    
    if (!existingUser) {
      return notFoundResponse(res, 'User');
    }
    
    // Validate request body
    const updateSchema = insertUserSchema.partial();
    const validData = updateSchema.parse(req.body);
    
    // Hash password if it's being updated
    if (validData.password) {
      validData.password = await hashPassword(validData.password);
    }
    
    // Check if role is being updated
    const isRoleChanged = validData.role && validData.role !== existingUser.role;
    
    // Update user
    const updatedUser = await storage.updateUser(id, validData);
    
    if (!updatedUser) {
      return errorResponse(res, 'Failed to update user');
    }
    
    // If role changed, update the user's team memberships to match the new role
    if (isRoleChanged && validData.role) {
      try {
        // Get all team memberships for this user
        const userTeamMemberships = await storage.getTeamMembersByUserId(id);
        
        if (userTeamMemberships.length > 0) {
          console.log(`Found ${userTeamMemberships.length} team memberships for user ${id}`);
          
          // Update all team memberships to the new role
          // For admin users, we respect the team context, so if a user is being set as global admin,
          // we'll also set them as team admin
          for (const member of userTeamMemberships) {
            // If user is being set to 'admin' or 'superuser', set team role to 'admin'
            // Otherwise use the exact same role (player/coach)
            const newTeamRole = (validData.role === 'admin' || validData.role === 'superuser') 
              ? 'admin' 
              : validData.role;
              
            await storage.updateTeamMember(member.id, { 
              role: newTeamRole as 'admin' | 'coach' | 'player' 
            });
            
            console.log(`Updated team membership ${member.id} for user ${id} in team ${member.teamId} to role: ${newTeamRole}`);
          }
        }
      } catch (error) {
        console.error(`Error updating team memberships for user ${id}:`, error);
        // Don't fail the request if membership updates fail
      }
    }
    
    return jsonResponse(res, {
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
      position: updatedUser.position,
      jerseyNumber: updatedUser.jerseyNumber,
      phoneNumber: updatedUser.phoneNumber
    });
  }));

  // Delete user
  router.delete('/admin/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Prevent deletion of superusers
    if (user.role === 'superuser') {
      return errorResponse(res, 'Cannot delete superuser accounts', 403);
    }
    
    // Borra todas sus membresías
    const memberships = await storage.getTeamMembersByUserId(id);
    await Promise.all(memberships.map(m => storage.deleteTeamMember(m.id)));
    
    // Borra al usuario
    const ok = await storage.deleteUser(id);
    if (!ok) return errorResponse(res, 'Failed to delete user');
    return successResponse(res, 'User deleted successfully');
  }));

  // Get all teams
  router.get('/admin/teams', asyncHandler(async (req: Request, res: Response) => {
    const teams = await storage.getTeams();
    return jsonResponse(res, teams);
  }));

  // Get team by ID
  router.get('/admin/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const team = await storage.getTeam(id);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    return jsonResponse(res, team);
  }));

  // Get team members
  router.get('/admin/teams/:id/members', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    const members = await storage.getTeamMembers(teamId);
    
    // Enhance with user details
    const enhancedMembers = await Promise.all(
      members.map(async (member) => {
        if (!member.userId) {
          // For members without linked users, return the member data as is
          return {
            ...member,
            user: null
          };
        }
        
        // For members with linked users, add user details
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          user: user ? {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePicture: user.profilePicture,
            position: user.position
          } : null
        };
      })
    );
    
    return jsonResponse(res, enhancedMembers);
  }));

  // Create a new team
  router.post('/admin/teams', asyncHandler(async (req: Request, res: Response) => {
    // Parse and validate request body
    const validData = insertTeamSchema.parse({
      ...req.body,
      createdById: req.user!.id, // Set current superuser as creator
      joinCode: generateJoinCode() // Generate a unique join code
    });
    
    // Create team
    const newTeam = await storage.createTeam(validData);
    
    return createdResponse(res, newTeam);
  }));

  // Update team
  router.put('/admin/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const existingTeam = await storage.getTeam(id);
    
    if (!existingTeam) {
      return notFoundResponse(res, 'Team');
    }
    
    // Validate request body
    const updateSchema = insertTeamSchema.partial();
    const validData = updateSchema.parse(req.body);
    
    // Update team
    const updatedTeam = await storage.updateTeam(id, validData);
    
    if (!updatedTeam) {
      return errorResponse(res, 'Failed to update team');
    }
    
    return jsonResponse(res, updatedTeam);
  }));

  // Delete team
  router.delete('/admin/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const team = await storage.getTeam(id);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Borra membresías del equipo
    const members = await storage.getTeamMembers(id);
    await Promise.all(members.map(m => storage.deleteTeamMember(m.id)));
    
    const ok = await storage.deleteTeam(id);
    if (!ok) return errorResponse(res, 'Failed to delete team');
    return successResponse(res, 'Team deleted successfully');
  }));

  // Add a user to a team
  router.post('/admin/teams/:teamId/members', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.teamId);
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return errorResponse(res, 'userId and role are required');
    }
    
    const team = await storage.getTeam(teamId);
    const user = await storage.getUser(userId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Check if user is already a member
    const existingMembership = await storage.getTeamMember(teamId, userId);
    if (existingMembership) {
      return errorResponse(res, 'User is already a member of this team', 400);
    }
    
    // Create team membership
    const membership = await storage.createTeamMember({
      teamId,
      userId,
      role
    });
    
    return createdResponse(res, membership);
  }));

  // Remove a user from a team
  router.delete('/admin/teams/:teamId/members/:userId', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.teamId);
    const userId = parseInt(req.params.userId);
    
    const membership = await storage.getTeamMember(teamId, userId);
    
    if (!membership) {
      return notFoundResponse(res, 'Team membership');
    }
    
    // Delete membership
    const deleted = await storage.deleteTeamMember(membership.id);
    
    if (!deleted) {
      return errorResponse(res, 'Failed to remove user from team');
    }
    
    return successResponse(res, 'User removed from team successfully');
  }));

  return router;
}