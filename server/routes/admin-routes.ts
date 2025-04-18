import { Router, Request, Response, NextFunction } from 'express';
import { EntityStorage } from '../entity-storage';
import { hashPassword } from '../auth';
import { asyncHandler, jsonResponse, errorResponse, notFoundResponse, successResponse, createdResponse } from '../route-utils';
import { insertUserSchema, insertTeamSchema } from '@shared/schema';
import { generateJoinCode } from '../utils/join-code';
import { z } from 'zod';

export function createAdminRouter(storage: EntityStorage) {
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

  // Admin routes - all protected by superuser check
  router.use('/admin', requireSuperuser);

  // Get all users
  router.get('/admin/users', asyncHandler(async (req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    return jsonResponse(res, users);
  }));

  // Get user by ID
  router.get('/admin/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    return jsonResponse(res, user);
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
    
    // Update user
    const updatedUser = await storage.updateUser(id, validData);
    
    if (!updatedUser) {
      return errorResponse(res, 'Failed to update user');
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
    
    // Delete the user record
    await storage.deleteUser(id);
    
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
    
    // Delete the team
    await storage.deleteTeam(id);
    
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
    await storage.deleteTeamMember(membership.id);
    
    return successResponse(res, 'User removed from team successfully');
  }));

  return router;
}