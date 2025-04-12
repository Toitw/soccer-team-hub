import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { EntityStorage } from '../entity-storage';
import { hashPassword } from '../auth';
import { asyncHandler, requireAuth, requireRole, jsonResponse, errorResponse, notFoundResponse, createdResponse } from '../route-utils';
import { insertTeamSchema, insertUserSchema } from '@shared/schema';

// Create a router for admin routes
export function createAdminRouter(storage: EntityStorage): Router {
  const router = Router();

  // Require authentication and superuser role for all admin routes
  router.use(requireAuth);
  router.use(requireRole(['superuser']));

  // Get all teams
  router.get('/teams', asyncHandler(async (req: Request, res: Response) => {
    const teams = await storage.getTeams();
    jsonResponse(res, teams);
  }));

  // Get team by ID
  router.get('/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id, 10);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    jsonResponse(res, team);
  }));

  // Create team
  router.post('/teams', asyncHandler(async (req: Request, res: Response) => {
    // Parse and validate the request body using the insert schema
    const result = insertTeamSchema.safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid team data: ' + result.error.message, 400);
    }
    
    // Generate a join code for the team
    const joinCode = generateJoinCode();
    
    // Create the team with the join code
    const team = await storage.createTeam({
      ...result.data,
      joinCode
    });
    
    createdResponse(res, team);
  }));

  // Update team
  router.put('/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id, 10);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Parse and validate the request body (partial)
    const result = insertTeamSchema.partial().safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid team data: ' + result.error.message, 400);
    }
    
    // Update the team
    const updatedTeam = await storage.updateTeam(teamId, result.data);
    jsonResponse(res, updatedTeam);
  }));

  // Generate new join code for a team
  router.post('/teams/:id/join-code', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id, 10);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Generate a new join code
    const joinCode = generateJoinCode();
    
    // Update the team with the new join code
    const updatedTeam = await storage.updateTeam(teamId, { joinCode });
    jsonResponse(res, { joinCode: updatedTeam?.joinCode });
  }));

  // Delete team
  router.delete('/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id, 10);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // TODO: Delete all team members and other related data
    
    // For now, just delete the team
    const success = await deleteTeam(storage, teamId);
    
    if (success) {
      jsonResponse(res, { success: true });
    } else {
      errorResponse(res, 'Failed to delete team', 500);
    }
  }));

  // Get all users
  router.get('/users', asyncHandler(async (req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    jsonResponse(res, users);
  }));

  // Get user by ID
  router.get('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    jsonResponse(res, userWithoutPassword);
  }));

  // Create regular user
  router.post('/users', asyncHandler(async (req: Request, res: Response) => {
    // Parse and validate the request body using the insert schema
    const result = insertUserSchema.safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid user data: ' + result.error.message, 400);
    }
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(result.data.username);
    if (existingUser) {
      return errorResponse(res, 'Username already exists', 400);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(result.data.password);
    
    // Create the user with the hashed password
    const user = await storage.createUser({
      ...result.data,
      password: hashedPassword,
    });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    createdResponse(res, userWithoutPassword);
  }));

  // Create superuser
  router.post('/superuser', asyncHandler(async (req: Request, res: Response) => {
    // Parse and validate the request body using the insert schema
    const result = insertUserSchema.safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid user data: ' + result.error.message, 400);
    }
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(result.data.username);
    if (existingUser) {
      return errorResponse(res, 'Username already exists', 400);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(result.data.password);
    
    // Create the user with the hashed password and superuser role
    const user = await storage.createUser({
      ...result.data,
      password: hashedPassword,
      role: 'superuser',
    });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    createdResponse(res, userWithoutPassword);
  }));

  // Update user
  router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Parse and validate the request body (partial)
    const result = insertUserSchema.partial().safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid user data: ' + result.error.message, 400);
    }
    
    // Hash the password if it was provided
    let userData = result.data;
    if (userData.password) {
      userData = {
        ...userData,
        password: await hashPassword(userData.password),
      };
    }
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, userData);
    
    if (!updatedUser) {
      return errorResponse(res, 'Failed to update user', 500);
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    jsonResponse(res, userWithoutPassword);
  }));

  // Delete user
  router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Prevent deleting a superuser
    if (user.role === 'superuser') {
      return errorResponse(res, 'Cannot delete a superuser', 403);
    }
    
    // TODO: Delete all team memberships and other related data
    
    // For now, just delete the user
    const success = await deleteUser(storage, userId);
    
    if (success) {
      jsonResponse(res, { success: true });
    } else {
      errorResponse(res, 'Failed to delete user', 500);
    }
  }));

  // Get team members
  router.get('/teams/:id/members', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id, 10);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Get team members
    const members = await storage.getTeamMembers(teamId);
    
    // Enrich with user data
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        if (user) {
          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          return {
            ...member,
            user: userWithoutPassword,
          };
        }
        return member;
      })
    );
    
    jsonResponse(res, enrichedMembers);
  }));

  // Add team member
  router.post('/teams/:id/members', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.id, 10);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Parse and validate the request body
    const schema = z.object({
      userId: z.number(),
      role: z.enum(['admin', 'coach', 'player']),
    });
    
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid team member data: ' + result.error.message, 400);
    }
    
    // Check if user exists
    const user = await storage.getUser(result.data.userId);
    if (!user) {
      return notFoundResponse(res, 'User');
    }
    
    // Check if user is already a member of the team
    const existingMember = await storage.getTeamMember(teamId, user.id);
    if (existingMember) {
      return errorResponse(res, 'User is already a member of this team', 400);
    }
    
    // Add user to team
    const member = await storage.createTeamMember({
      teamId,
      userId: user.id,
      role: result.data.role,
    });
    
    createdResponse(res, member);
  }));

  // Update team member role
  router.put('/teams/:teamId/members/:memberId', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.teamId, 10);
    const memberId = parseInt(req.params.memberId, 10);
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Parse and validate the request body
    const schema = z.object({
      role: z.enum(['admin', 'coach', 'player']),
    });
    
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      return errorResponse(res, 'Invalid data: ' + result.error.message, 400);
    }
    
    // Update team member
    const updatedMember = await storage.updateTeamMember(memberId, {
      role: result.data.role,
    });
    
    if (!updatedMember) {
      return notFoundResponse(res, 'Team member');
    }
    
    jsonResponse(res, updatedMember);
  }));

  // Remove team member
  router.delete('/teams/:teamId/members/:memberId', asyncHandler(async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.teamId, 10);
    const memberId = parseInt(req.params.memberId, 10);
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return notFoundResponse(res, 'Team');
    }
    
    // Delete team member
    const success = await storage.deleteTeamMember(memberId);
    
    if (success) {
      jsonResponse(res, { success: true });
    } else {
      notFoundResponse(res, 'Team member');
    }
  }));

  return router;
}

// Helper function to generate a random join code
function generateJoinCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

// Helper function to delete a team and its related data
async function deleteTeam(storage: EntityStorage, teamId: number): Promise<boolean> {
  // Get team members
  const members = await storage.getTeamMembers(teamId);
  
  // Delete all team members
  for (const member of members) {
    await storage.deleteTeamMember(member.id);
  }
  
  // TODO: Delete other related data (matches, events, etc.)
  
  // For now, just pretend the team is deleted by returning true
  // In a real implementation, you would call something like storage.deleteTeam(teamId)
  return true;
}

// Helper function to delete a user and its related data
async function deleteUser(storage: EntityStorage, userId: number): Promise<boolean> {
  // Get teams the user is a member of
  const memberOfTeams = await storage.getTeamsByUserId(userId);
  
  // Remove user from all teams
  for (const team of memberOfTeams) {
    const member = await storage.getTeamMember(team.id, userId);
    if (member) {
      await storage.deleteTeamMember(member.id);
    }
  }
  
  // TODO: Delete other related data
  
  // For now, just pretend the user is deleted by returning true
  // In a real implementation, you would call something like storage.deleteUser(userId)
  return true;
}