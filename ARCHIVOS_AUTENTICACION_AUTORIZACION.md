# Archivos de Autenticación, Autorización y Gestión de Usuarios

Este documento contiene los archivos relacionados con la autenticación, autorización y gestión de usuarios en el sistema. Se han recopilado para facilitar la revisión de posibles inconsistencias.

## Índice de Contenidos

1. [Autenticación y Autorización](#1-autenticación-y-autorización)
2. [Middlewares de Autenticación](#2-middlewares-de-autenticación)
3. [Rutas de Autenticación](#3-rutas-de-autenticación)
4. [Utilidades de Autenticación](#4-utilidades-de-autenticación)
5. [Scripts de Gestión de Usuarios](#5-scripts-de-gestión-de-usuarios)
6. [Archivos de Optimización](#6-archivos-de-optimización)
7. [Archivos No Encontrados](#7-archivos-no-encontrados)

## 1. Autenticación y Autorización

### server/auth-middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 * Use this on routes that require authentication
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

/**
 * Middleware to check if a user has completed onboarding
 * Use this on routes that require completed onboarding
 */
export function hasCompletedOnboarding(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const user = req.user as any;
  
  if (user.onboardingCompleted) {
    return next();
  }
  
  res.status(403).json({ 
    error: 'Onboarding required', 
    message: 'Please complete the onboarding process before accessing this resource.' 
  });
}

/**
 * Middleware to check if user is an admin
 * Use this for admin-only routes
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const user = req.user as any;
  
  if (user.role === 'admin' || user.role === 'superuser') {
    return next();
  }
  
  res.status(403).json({ error: 'Forbidden. Admin access required.' });
}
```

### server/optimized-auth.ts

```typescript
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { hashPassword, comparePasswords } from "@shared/auth-utils";
import authRoutes from "./auth-routes";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "teamkick-soccer-platform-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      
      if (!user) {
        return done(new Error("User not found"), null);
      }
      
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  registerAuthRoutes(app);
  
  // Register email verification and password reset routes
  app.use("/api/auth", authRoutes);
}

/**
 * Register authentication-related API routes
 */
```

## 2. Middlewares de Autenticación

### server/route-utils.ts (fragmento relevante para autorización)

```typescript
/**
 * Auth middleware to check if a user has a specific role
 * @param roles - Array of allowed roles
 * @returns A middleware function
 */
export function requireRole(roles: string[]): RouteHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    next();
  };
}
```

## 3. Rutas de Autenticación

### server/routes/auth-routes.ts (fragmento inicial)

```typescript
/**
 * Authentication routes for Cancha+ application
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage-implementation";
import { hashPassword } from "../auth";
import { isAuthenticated } from "../auth-middleware";
import { generateRandomCode } from "../utils";

// Create a router for auth-related routes
const router = Router();

// Schema for registration data validation
```

## 4. Utilidades de Autenticación

Los archivos específicos de utilidades compartidas como `shared/auth-utils.ts` no se localizaron directamente, pero se hace referencia a ellos en varios archivos.

## 5. Scripts de Gestión de Usuarios

### create-superuser.ts

```typescript
import { EntityStorage } from "./server/entity-storage";
import * as argon2 from "argon2";

const SUPERUSER_USERNAME = "admin";
const SUPERUSER_PASSWORD = "password";

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param password - The plain password to hash
 * @returns The hashed password string with Argon2 parameters
 */
async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 15 * 1024, // 16 MiB
    timeCost: 3, // 3 iterations
    parallelism: 1 // 1 thread
  });
}

/**
 * Create a superuser account for admin panel access
 */
async function createSuperuser() {
  const storage = new EntityStorage();
  
  console.log("Checking if superuser exists...");
  
  // Check if superuser already exists
  const existingSuperuser = await storage.getUserByUsername(SUPERUSER_USERNAME);
  
  if (existingSuperuser) {
    if (existingSuperuser.role === "superuser") {
      console.log("Superuser account already exists.");
      return;
    }
    
    // Update the existing admin to superuser
    console.log("Upgrading existing admin to superuser...");
    const updatedUser = await storage.updateUser(existingSuperuser.id, {
      role: "superuser"
    });
    
    if (updatedUser) {
      console.log(`User "${SUPERUSER_USERNAME}" role upgraded to superuser`);
    } else {
      console.log("Failed to upgrade user role");
    }
    
    return;
  }
  
  // Create superuser user
  console.log("Creating superuser account...");
  
  const hashedPassword = await hashPassword(SUPERUSER_PASSWORD);
  
  const superuserData = {
    username: SUPERUSER_USERNAME,
    password: hashedPassword,
    fullName: SUPERUSER_FULL_NAME,
    role: "superuser",
    email: "admin@example.com"
  };
  
  try {
    const newSuperuser = await storage.createUser(superuserData);
    console.log(`Superuser created with ID: ${newSuperuser.id}`);
    console.log(`Username: ${SUPERUSER_USERNAME}`);
    console.log(`Password: ${SUPERUSER_PASSWORD}`);
  } catch (error) {
    console.error("Error creating superuser:", error);
  }
}

// Run the script
createSuperuser().catch(console.error);
```

### remove-mock-users.js (fragmento)

```javascript
async function removeMockUsers() {
  try {
    console.log('Starting removal of mock users...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      console.log('Data directory does not exist, nothing to remove.');
      return;
    }
    
    // Process users file
    let usersRemoved = 0;
    let usersData = [];
    let userIdsToRemove = [];
    
    if (fs.existsSync(USERS_FILE)) {
      usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      
      if (usersData && usersData.length > 0) {
        console.log(`Found ${usersData.length} users in database`);
        
        // Find users to remove using the pattern check
        const filteredUsers = usersData.filter(user => {
          if (isMockUsername(user.username)) {
            userIdsToRemove.push(user.id);
            usersRemoved++;
            return false;
          }
          return true;
        });
        
        // Save filtered users
        if (usersRemoved > 0) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(filteredUsers, null, 2));
          console.log(`Removed ${usersRemoved} users from the database`);
          console.log(`User IDs to remove from team members: ${userIdsToRemove.join(', ')}`);
        } else {
          console.log('No matching mock users found to remove');
        }
      }
    }
    
    // Process team members file - remove memberships for deleted users
    let teamMembersRemoved = 0;
    
    if (fs.existsSync(TEAM_MEMBERS_FILE)) {
      // Lógica para eliminar miembros del equipo correspondientes a usuarios eliminados
    }
  } catch (error) {
    console.error('Error removing mock users:', error);
  }
}
```

## 6. Archivos de Optimización

### activate-optimized-code.sh

```bash
#!/bin/bash

# This script activates the optimized code by renaming files and updating imports

# Make backup directory if it doesn't exist
mkdir -p backups

# Backup original files
if [ -f shared/schema.ts ]; then
  cp shared/schema.ts backups/schema.ts.bak
fi

if [ -f server/auth.ts ]; then
  cp server/auth.ts backups/auth.ts.bak
fi

if [ -f server/storage.ts ]; then
  cp server/storage.ts backups/storage.ts.bak
fi

if [ -f server/index.ts ]; then
  cp server/index.ts backups/index.ts.bak
fi

# Move optimized files to replace originals
cp shared/optimized-schema.ts shared/schema.ts
cp server/optimized-auth.ts server/auth.ts
cp server/entity-storage.ts server/storage.ts
cp server/optimized-index.ts server/index.ts

# Update imports in auth.ts to use our shared auth utilities
sed -i 's/import { scrypt, randomBytes, timingSafeEqual } from "crypto";/import { hashPassword, comparePasswords } from "@shared\/auth-utils";/g' server/auth.ts
sed -i '/const scryptAsync = promisify(scrypt);/d' server/auth.ts
sed -i '/export async function hashPassword/,/^}/d' server/auth.ts
sed -i '/export async function comparePasswords/,/^}/d' server/auth.ts

echo "Optimized code has been activated. Original files are backed up in the backups directory."
echo "Restart the application to apply changes."
```

### show-optimizations.sh

```bash
AUTH_ORIG=$(wc -l < server/auth.ts)
AUTH_OPT=$(wc -l < server/optimized-auth.ts)
echo "Original auth.ts: $AUTH_ORIG lines"
echo "Optimized auth.ts: $AUTH_OPT lines"
AUTH_REDUCTION=$(awk "BEGIN {print int((1 - $AUTH_OPT / $AUTH_ORIG) * 100)}")
echo "Reduction: $AUTH_REDUCTION%"
echo

# Show optimization benefits
echo "Optimization Benefits:"
echo "---------------------------------------------------------------"
echo "✓ Eliminated duplicate password hashing code across files"
echo "✓ Consolidated repetitive CRUD operations with generic patterns"
echo "✓ Standardized file loading/saving operations"
echo "✓ Implemented consistent error handling"
echo "✓ Enhanced type safety with generics"
echo "✓ Streamlined API response handling"
echo "✓ Centralized date and data conversion logic"
echo "---------------------------------------------------------------"

echo "For details on the optimization strategy, see OPTIMIZATION.md"
```

### OPTIMIZATION.md (fragmento)

```markdown
## Implementation

The optimized code has been implemented in parallel with the existing codebase:

- `shared/auth-utils.ts`: Consolidated authentication utilities
- `shared/storage-utils.ts`: Generic storage framework
- `shared/data-loader.ts`: Data persistence abstraction
- `shared/entity-manager.ts`: Entity management framework
- `shared/optimized-schema.ts`: Optimized schema definitions
- `server/optimized-auth.ts`: Streamlined authentication system
- `server/entity-storage.ts`: Entity-specific storage implementation
- `server/route-utils.ts`: Route handling utilities
- `server/optimized-index.ts`: Optimized application entry point
- `scripts/database-maintenance.js`: Consolidated maintenance utilities

You can activate the optimized code by running the `activate-optimized-code.sh` script, which will back up the original files and replace them with the optimized versions.

## Token Count Comparison

| Category | Original | Optimized | Reduction |
|----------|----------|-----------|-----------|
| Authentication | ~1,500 | ~400 | ~73% |
| Data Schema | ~2,000 | ~700 | ~65% |
| Storage Implementation | ~3,500 | ~1,200 | ~66% |
| Route Handling | ~2,000 | ~800 | ~60% |
| Utility Functions | ~1,200 | ~400 | ~67% |
| **Total** | **~10,200** | **~3,500** | **~66%** |
```

## 7. Archivos No Encontrados

Los siguientes archivos mencionados en el documento no fueron localizados o no se encontraron en su ubicación esperada:

1. server/auth.ts (versión original, solo se encontró optimized-auth.ts)
2. server/middleware/auth-middleware.ts (solo se encontró server/auth-middleware.ts)
3. server/auth-routes.ts (completo, solo se encontró un fragmento en routes/auth-routes.ts)
4. shared/auth-utils.ts (mencionado en varios archivos pero no localizado)
5. create-new-superuser.ts (solo se encontró create-superuser.ts)
6. create-superuser.js (solo se encontró la versión .ts)
7. initialize-admin.js (se encontró pero parece incompleto)
8. reset-admin.ts
9. create-users.ts
10. create-test-users.js
11. update-passwords.js
12. direct-login-server.js
13. cookies.txt