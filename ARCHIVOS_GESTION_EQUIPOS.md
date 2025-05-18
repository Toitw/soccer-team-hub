# Archivos de Gestión de Equipos y Miembros

Este documento contiene los archivos relacionados con la gestión de equipos y miembros en el sistema. Se han recopilado para facilitar la revisión de posibles inconsistencias.

## Índice de Contenidos

1. [Scripts de Limpieza](#1-scripts-de-limpieza)
2. [Scripts de Creación de Equipos de Prueba](#2-scripts-de-creación-de-equipos-de-prueba)
3. [Migración de Datos de Equipos](#3-migración-de-datos-de-equipos)
4. [Manejo de Duplicados](#4-manejo-de-duplicados)
5. [Archivos No Encontrados](#5-archivos-no-encontrados)

## 1. Scripts de Limpieza

### cleanup-teams.ts

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import ws from 'ws';

// Configure Neon database to use WebSocket
neonConfig.webSocketConstructor = ws;

config();

async function cleanupMyTeams() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Finding teams named 'My Team'...");
    
    // First get all teams named "My Team"
    const { rows: teams } = await pool.query(
      "SELECT id, name FROM teams WHERE name = 'My Team'"
    );
    
    console.log(`Found ${teams.length} teams to delete`);
    
    for (const team of teams) {
      console.log(`Deleting team ${team.id}`);
      
      // Delete related records first
      await pool.query("DELETE FROM team_members WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM matches WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM events WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM announcements WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM league_classification WHERE team_id = $1", [team.id]);
      await pool.query("DELETE FROM team_users WHERE team_id = $1", [team.id]);
      
      // Finally delete the team
      await pool.query("DELETE FROM teams WHERE id = $1", [team.id]);
      
      console.log(`Successfully deleted team ${team.id} and all related data`);
    }
  } catch (error) {
    console.error("Error cleaning up teams:", error);
  } finally {
    await pool.end();
  }
}

// Run the cleanup function
cleanupMyTeams().catch(console.error);
```

## 2. Scripts de Creación de Equipos de Prueba

### create-test-team-esm.js (fragmento)

```javascript
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Set up WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

async function createTestTeam() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    return;
  }

  // Create database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Implementación de la creación de un equipo de prueba
}
```

### create-test-team.ts (fragmento)

```typescript
// Import statements to avoid errors
import { users } from "./shared/schema";

/**
 * Create a test team and add Olaya as admin
 */
async function createTestTeam() {
  // Implementación de la creación de un equipo de prueba
}

// Run the script
createTestTeam().catch(console.error);
```

## 3. Migración de Datos de Equipos

### scripts/db-migrate-data.ts (fragmento sobre migración de equipos)

```typescript
// Migrate teams from file to database
async function migrateTeams() {
  console.log('Migrating teams...');
  const dataDir = path.join(process.cwd(), 'data');
  const teamsFilePath = path.join(dataDir, 'teams.json');
  
  if (!fs.existsSync(teamsFilePath)) {
    console.log('No teams file found, skipping team migration');
    return;
  }
  
  const teams = readJsonFile(teamsFilePath);
  console.log(`Found ${teams.length} teams to migrate`);
  
  let migratedCount = 0;
  
  for (const team of teams) {
    try {
      // Check if team already exists
      const existingTeam = await db.select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
        .limit(1);
      
      if (existingTeam.length > 0) {
        console.log(`Team ID ${team.id} already exists, skipping`);
        continue;
      }
      
      // Process dates in team object
      const processedTeam = processDates(team);
      
      // Insert team
      await db.insert(schema.teams).values({
        id: processedTeam.id,
        name: processedTeam.name,
        sport: processedTeam.sport,
        logo: processedTeam.logo,
        colors: processedTeam.colors,
        joinCode: processedTeam.joinCode,
        createdBy: processedTeam.createdBy,
        createdAt: processedTeam.createdAt || new Date()
      });
      
      migratedCount++;
    } catch (error) {
      console.error(`Error migrating team ${team.name}:`, error);
    }
  }
  
  console.log(`Migrated ${migratedCount} teams successfully`);
}
```

## 4. Manejo de Duplicados

### clean-duplicates.js (fragmento)

```javascript
async function cleanDuplicates() {
  try {
    console.log('Starting duplicate cleanup...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      console.log('Data directory does not exist, no cleanup needed.');
      return;
    }
    
    // Check and clean team members
    if (fs.existsSync(TEAM_MEMBERS_FILE)) {
      console.log('Processing team members...');
      const teamMembersData = JSON.parse(fs.readFileSync(TEAM_MEMBERS_FILE, 'utf8'));
      
      if (teamMembersData && teamMembersData.length > 0) {
        console.log(`Found ${teamMembersData.length} team members`);
        
        // Check for duplicates based on teamId and userId
        const uniqueMembers = new Map();
        const duplicates = [];
        
        teamMembersData.forEach(member => {
          const key = `${member.teamId}-${member.userId}`;
          
          if (!uniqueMembers.has(key)) {
            uniqueMembers.set(key, member);
          } else {
            duplicates.push(member);
          }
        });
        
        if (duplicates.length > 0) {
          console.log(`Found ${duplicates.length} duplicate team members`);
          
          // Save only unique members
          const uniqueMembersArray = Array.from(uniqueMembers.values());
          fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(uniqueMembersArray, null, 2));
          console.log(`Saved ${uniqueMembersArray.length} unique team members`);
        } else {
          console.log('No duplicate team members found');
        }
      }
    }
    
    // Continúa con la limpieza de otras colecciones
    
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
  }
}
```

## 5. Archivos No Encontrados

Los siguientes archivos mencionados en el documento no fueron localizados o solo se encontraron fragmentos:

1. create-test-team-direct.js
2. create-test-team-fixed.js
3. remove_duplicate_members.js (completo, solo se encontró clean-duplicates.js con funcionalidad similar)
4. scripts/add-team-members-columns.ts
5. scripts/update-user-members-schema.ts
6. client/src/components/admin/add-team-form.tsx
7. client/src/components/admin/edit-team-form.tsx
8. client/src/components/admin/teams-panel.tsx
9. client/src/components/admin/team-member-list.tsx
10. client/src/components/team/MemberClaimButton.tsx
11. client/src/components/team/MemberClaimsManager.tsx
12. server/utils/join-code.ts
13. docs/TEAM_JOIN.md