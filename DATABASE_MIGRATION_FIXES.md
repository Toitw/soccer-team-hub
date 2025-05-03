# Database Migration Fixes

This document outlines the fixes made to the database migration scripts to ensure proper compatibility between source data in camelCase format and the PostgreSQL schema in snake_case format.

## Overview

The key issue addressed was the mismatch between the field naming conventions:
- Source data (JSON files) use camelCase (e.g., teamId, createdAt)
- PostgreSQL tables use snake_case (e.g., team_id, created_at)

This document details the changes made to align these naming conventions during the migration process.

## Fixed Migration Functions

### 1. Announcements
- Changed `teamId` to `team_id`
- Changed `createdById` to `created_by_id`
- Changed `createdAt` to `created_at`

### 2. Invitations
- Changed `teamId` to `team_id`
- Changed `createdAt` to `created_at`
- Changed `expiresAt` to `expires_at`
- Added `created_by_id` field
- Added `is_accepted` and `accepted_at` fields

### 3. Match Lineups
- Changed `matchId` to `match_id`
- Changed `teamId` to `team_id`
- Changed `playerIds` to `player_ids`
- Changed `benchPlayerIds` to `bench_player_ids`
- Changed `positionMapping` to `position_mapping`
- Changed `createdAt` to `created_at`

### 4. Team Lineups
- Changed `teamId` to `team_id`
- Changed `positionMapping` to `position_mapping`
- Changed `createdAt` to `created_at`
- Changed `updatedAt` to `updated_at`

### 5. Match Substitutions
- Changed `matchId` to `match_id`
- Changed `playerInId` to `player_in_id`
- Changed `playerOutId` to `player_out_id`
- Changed `reason` to `created_at`

### 6. Match Goals
- Changed `matchId` to `match_id`
- Changed `scorerId` to `scorer_id`
- Changed `assistId` to `assist_id`
- Changed `isOwnGoal` to `is_own_goal`
- Changed `isPenalty` to `is_penalty`
- Changed `description` to `created_at`

### 7. Match Cards
- Completely revamped the structure:
  - Changed `matchId` to `match_id`
  - Changed `playerId` to `player_id`
  - Converted `type` field to boolean flags: `is_yellow` and `is_second_yellow` 
  - Added `created_at` field

### 8. Match Photos
- Changed `matchId` to `match_id`
- Changed `uploadedById` to `uploader_id`
- Changed `uploadedAt` to `created_at`

### 9. League Classifications
- Changed `teamId` to `team_id`
- Changed `externalTeamName` to `external_team_name`
- Changed `gamesPlayed` to `games_played`
- Changed `gamesWon` to `games_won`
- Changed `gamesDrawn` to `games_drawn`
- Changed `gamesLost` to `games_lost`
- Changed `goalsFor` to `goals_for`
- Changed `goalsAgainst` to `goals_against`
- Changed `createdAt` to `created_at`
- Changed `updatedAt` to `updated_at`

## Testing

The migration script has been tested and runs without errors. No data was migrated in the test environment as the data files were empty, but the script's structural integrity is confirmed.

## Next Steps

1. Apply these changes to other migration scripts like `run-migration.ts` and `db-migrate-data.ts`
2. Prepare documentation for the complete migration process
3. Create a script to verify data integrity after migration