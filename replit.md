# TeamKick Soccer Manager - Replit Development Guide

## Overview

TeamKick Soccer Manager is a comprehensive web application for managing soccer teams. It provides functionality for team management, player statistics, match scheduling, event planning, and administrative oversight. The application is built with modern web technologies and follows a full-stack architecture with both file-based and database storage options.

## Recent Security Improvements (January 2025)

### Critical Vulnerabilities Fixed
1. **SQL Injection Prevention**: Fixed SQL injection vulnerabilities in database queries by replacing string concatenation with parameterized queries using PostgreSQL's ANY operator
2. **Session Secret Security**: Removed hardcoded session secret fallback and implemented secure random generation when SESSION_SECRET environment variable is not set
3. **Email Verification**: Implemented proper email verification flow with tokens instead of auto-verifying emails on registration

### Security Best Practices Applied
- All database queries now use parameterized statements to prevent SQL injection
- Session secrets are cryptographically secure and unique per deployment
- User registration requires email verification for account activation
- Password hashing consistently uses Argon2id with secure parameters

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with professional theme configuration
- **State Management**: React Query (@tanstack/react-query) for server state
- **Build Tool**: Vite with custom plugins for theme and error handling
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js
- **Authentication**: Passport.js with local strategy and express-session
- **Database ORM**: Drizzle ORM with PostgreSQL support
- **Password Security**: Argon2id hashing algorithm
- **Email Service**: SendGrid integration for notifications

### Development Environment
- **Platform**: Replit with Node.js 20, web, and PostgreSQL 16 modules
- **Hot Reload**: Development server with automatic restart on changes
- **Database**: NeonDB serverless PostgreSQL with connection pooling

## Key Components

### Authentication System
- **Strategy**: Session-based authentication with role-based access control
- **Password Security**: Argon2id hashing with secure parameters (64MB memory, 4 threads, 3 iterations)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Role Hierarchy**: Superuser > Admin > Coach > Player > Colaborador

### Permission System
- **Centralized Control**: Single source of truth in `shared/permissions.ts`
- **Page-Level**: Controls access to frontend routes
- **API-Level**: Protects backend endpoints
- **Team-Level**: Granular permissions within team contexts

### Data Storage
- **Hybrid Approach**: Supports both file-based storage (development) and PostgreSQL (production)
- **Auto-Detection**: Automatically selects storage backend based on DATABASE_URL availability
- **Migration Ready**: Scripts available for transitioning from file to database storage

### Entity Management
- **Generic Patterns**: Reusable CRUD operations via EntityManager class
- **Type Safety**: Full TypeScript integration with Drizzle schema
- **Relationships**: Proper foreign key relationships and data integrity

## Data Flow

### User Registration & Authentication
1. User submits registration form with email validation
2. Password is hashed using Argon2id before storage
3. Email verification token is generated and sent
4. User authenticates via username/password
5. Session is stored in PostgreSQL with automatic cleanup

### Team Management
1. Users can create teams with auto-generated join codes
2. Team members are invited via secure join codes or email
3. Role-based permissions control team administration
4. Team data includes lineups, matches, and member statistics

### Match & Event System
1. Admins/coaches create matches and events
2. Players can mark attendance and view schedules
3. Match details include lineups, substitutions, goals, and cards
4. Photo uploads are supported for match documentation

### Feedback & Administration
1. Users submit feedback through structured forms
2. Superusers can view and manage all system feedback
3. Admin panel provides comprehensive user and team management
4. Database health monitoring and maintenance tools

## External Dependencies

### Required Services
- **PostgreSQL Database**: NeonDB serverless for production data storage
- **SendGrid**: Email delivery service for notifications and verification
- **Replit Platform**: Development and deployment environment

### Key NPM Packages
- **@neondatabase/serverless**: PostgreSQL client for serverless environments
- **drizzle-orm**: Type-safe database ORM
- **argon2**: Secure password hashing
- **@radix-ui/react-***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **passport**: Authentication middleware

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production builds
- **drizzle-kit**: Database schema management and migrations

## Deployment Strategy

### Replit Configuration
- **Build Command**: `npm run build` (Vite + esbuild)
- **Start Command**: `npm run start` (production Node.js server)
- **Development**: `npm run dev` (tsx with hot reload)
- **Port Configuration**: Internal 5000, external 80

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string (auto-provided by Replit)
- **ADMIN_PASSWORD**: Secure admin user password
- **SENDGRID_API_KEY**: Email service authentication
- **SESSION_SECRET**: Session encryption key (REQUIRED for production - no longer uses hardcoded fallback)

### Database Management
- **Schema Sync**: `npm run db:push` applies schema changes
- **Migrations**: Automated via Drizzle Kit configuration
- **Backup Scripts**: Automated database backup utilities
- **Health Monitoring**: Built-in database connection health checks

### Production Optimizations
- **Static Assets**: Vite builds optimized frontend bundle
- **Server Bundle**: esbuild creates efficient Node.js server bundle
- **Session Persistence**: PostgreSQL-backed sessions survive restarts
- **Connection Pooling**: Efficient database connection management

## Changelog

```
Changelog:
- June 14, 2025. Initial setup
- June 21, 2025. Fixed team creation during onboarding:
  * Added missing onboarding/create-team endpoint to auth routes
  * Fixed team_user relationship creation for proper team access
  * Added missing translation keys (teams.creating)
  * Resolved duplicate translation key errors
  * Fixed form data population in settings page with proper translations
- June 21, 2025. Fixed email confirmation and password recovery functionality:
  * Fixed asynchronous email sending in registration (was not waiting for email result)
  * Added proper error handling for email send failures during registration
  * Improved user feedback with specific error messages for email issues
  * Added translation keys for email-related error messages (both ES and EN)
  * Enhanced registration flow to delete user if email verification fails
  * Verified password recovery functionality is working correctly
  * Added comprehensive error handling for different email failure scenarios
- July 28, 2025. Migrated email service from SendGrid to Resend:
  * Replaced SendGrid with Resend for better deliverability and pricing
  * Updated email utilities to use Resend API
  * Configured no-reply emails from 'Cancha+ <noreply@resend.dev>'
  * Added graceful handling for Resend free tier restrictions
  * Maintained same function signatures for seamless migration
  * Updated environment variable from SENDGRID_API_KEY to RESEND_API_KEY
- July 28, 2025. Disabled email verification for MVP:
  * Removed email verification requirement from registration flow
  * Users are now automatically verified upon registration
  * Registration completes immediately without email confirmation
  * Email verification can be re-enabled later for production
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```