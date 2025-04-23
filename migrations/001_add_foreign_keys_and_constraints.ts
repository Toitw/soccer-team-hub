import { sql } from "drizzle-orm";
import { pgTable, index, foreignKey } from "drizzle-orm/pg-core";

export async function up(db: any) {
  // 1. Add ON DELETE CASCADE to teams.createdById foreign key
  await db.run(sql`
    ALTER TABLE "teams" 
    ADD CONSTRAINT "teams_created_by_id_fkey" 
    FOREIGN KEY ("created_by_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 2. Add ON DELETE CASCADE to team_members table for both foreign keys
  await db.run(sql`
    ALTER TABLE "team_members" 
    ADD CONSTRAINT "team_members_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "team_members" 
    ADD CONSTRAINT "team_members_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 3. Create unique index on team_members(teamId, userId) to prevent duplicates
  await db.run(sql`
    CREATE UNIQUE INDEX "team_members_team_id_user_id_unique" 
    ON "team_members" ("team_id", "user_id");
  `);

  // 4. Add ON DELETE CASCADE to matches.teamId foreign key
  await db.run(sql`
    ALTER TABLE "matches" 
    ADD CONSTRAINT "matches_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  // 5. Add ON DELETE CASCADE to events foreign keys
  await db.run(sql`
    ALTER TABLE "events" 
    ADD CONSTRAINT "events_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "events" 
    ADD CONSTRAINT "events_created_by_id_fkey" 
    FOREIGN KEY ("created_by_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 6. Add ON DELETE CASCADE to attendance foreign keys
  await db.run(sql`
    ALTER TABLE "attendance" 
    ADD CONSTRAINT "attendance_event_id_fkey" 
    FOREIGN KEY ("event_id") 
    REFERENCES "events" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "attendance" 
    ADD CONSTRAINT "attendance_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 7. Create unique index on attendance(eventId, userId) to prevent duplicates
  await db.run(sql`
    CREATE UNIQUE INDEX "attendance_event_id_user_id_unique" 
    ON "attendance" ("event_id", "user_id");
  `);

  // 8. Add ON DELETE CASCADE to playerStats foreign keys
  await db.run(sql`
    ALTER TABLE "player_stats" 
    ADD CONSTRAINT "player_stats_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "player_stats" 
    ADD CONSTRAINT "player_stats_match_id_fkey" 
    FOREIGN KEY ("match_id") 
    REFERENCES "matches" ("id") 
    ON DELETE CASCADE;
  `);

  // 9. Create unique index on playerStats(matchId, userId) to prevent duplicates
  await db.run(sql`
    CREATE UNIQUE INDEX "player_stats_match_id_user_id_unique" 
    ON "player_stats" ("match_id", "user_id");
  `);

  // 10. Add ON DELETE CASCADE to announcements foreign keys
  await db.run(sql`
    ALTER TABLE "announcements" 
    ADD CONSTRAINT "announcements_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "announcements" 
    ADD CONSTRAINT "announcements_created_by_id_fkey" 
    FOREIGN KEY ("created_by_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 11. Add ON DELETE CASCADE to invitations foreign keys
  await db.run(sql`
    ALTER TABLE "invitations" 
    ADD CONSTRAINT "invitations_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "invitations" 
    ADD CONSTRAINT "invitations_created_by_id_fkey" 
    FOREIGN KEY ("created_by_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);
  
  // Create unique index on invitations(teamId, email) to prevent duplicates
  await db.run(sql`
    CREATE UNIQUE INDEX "invitations_team_id_email_unique" 
    ON "invitations" ("team_id", "email");
  `);

  // 12. Add ON DELETE CASCADE to matchLineups foreign keys
  await db.run(sql`
    ALTER TABLE "match_lineups" 
    ADD CONSTRAINT "match_lineups_match_id_fkey" 
    FOREIGN KEY ("match_id") 
    REFERENCES "matches" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "match_lineups" 
    ADD CONSTRAINT "match_lineups_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  // 13. Add ON DELETE CASCADE to teamLineups foreign key
  await db.run(sql`
    ALTER TABLE "team_lineups" 
    ADD CONSTRAINT "team_lineups_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  // 14. Add ON DELETE CASCADE to matchSubstitutions foreign key
  await db.run(sql`
    ALTER TABLE "match_substitutions" 
    ADD CONSTRAINT "match_substitutions_match_id_fkey" 
    FOREIGN KEY ("match_id") 
    REFERENCES "matches" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "match_substitutions" 
    ADD CONSTRAINT "match_substitutions_player_in_id_fkey" 
    FOREIGN KEY ("player_in_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "match_substitutions" 
    ADD CONSTRAINT "match_substitutions_player_out_id_fkey" 
    FOREIGN KEY ("player_out_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 15. Add ON DELETE CASCADE to matchGoals foreign keys
  await db.run(sql`
    ALTER TABLE "match_goals" 
    ADD CONSTRAINT "match_goals_match_id_fkey" 
    FOREIGN KEY ("match_id") 
    REFERENCES "matches" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "match_goals" 
    ADD CONSTRAINT "match_goals_scorer_id_fkey" 
    FOREIGN KEY ("scorer_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // Optional foreign key for assistId as it can be null
  await db.run(sql`
    ALTER TABLE "match_goals" 
    ADD CONSTRAINT "match_goals_assist_id_fkey" 
    FOREIGN KEY ("assist_id") 
    REFERENCES "users" ("id") 
    ON DELETE SET NULL;
  `);

  // 16. Add ON DELETE CASCADE to matchCards foreign keys
  await db.run(sql`
    ALTER TABLE "match_cards" 
    ADD CONSTRAINT "match_cards_match_id_fkey" 
    FOREIGN KEY ("match_id") 
    REFERENCES "matches" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "match_cards" 
    ADD CONSTRAINT "match_cards_player_id_fkey" 
    FOREIGN KEY ("player_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 17. Add ON DELETE CASCADE to matchPhotos foreign keys
  await db.run(sql`
    ALTER TABLE "match_photos" 
    ADD CONSTRAINT "match_photos_match_id_fkey" 
    FOREIGN KEY ("match_id") 
    REFERENCES "matches" ("id") 
    ON DELETE CASCADE;
  `);

  await db.run(sql`
    ALTER TABLE "match_photos" 
    ADD CONSTRAINT "match_photos_uploaded_by_id_fkey" 
    FOREIGN KEY ("uploaded_by_id") 
    REFERENCES "users" ("id") 
    ON DELETE CASCADE;
  `);

  // 18. Add ON DELETE CASCADE to leagueClassification foreign key
  await db.run(sql`
    ALTER TABLE "league_classification" 
    ADD CONSTRAINT "league_classification_team_id_fkey" 
    FOREIGN KEY ("team_id") 
    REFERENCES "teams" ("id") 
    ON DELETE CASCADE;
  `);

  // Create unique index on leagueClassification(teamId, externalTeamName) to prevent duplicates
  await db.run(sql`
    CREATE UNIQUE INDEX "league_classification_team_id_ext_team_unique" 
    ON "league_classification" ("team_id", "external_team_name");
  `);

  // 19. Create index on teams.joinCode for faster lookups
  await db.run(sql`
    CREATE INDEX "teams_join_code_idx" 
    ON "teams" ("join_code");
  `);

  // 20. Create index on matches for faster team-based queries by date
  await db.run(sql`
    CREATE INDEX "matches_team_id_match_date_idx" 
    ON "matches" ("team_id", "match_date");
  `);

  // 21. Create index on events for faster team-based queries by date
  await db.run(sql`
    CREATE INDEX "events_team_id_start_time_idx" 
    ON "events" ("team_id", "start_time");
  `);

  // 22. Create index on announcements for faster team-based queries by date
  await db.run(sql`
    CREATE INDEX "announcements_team_id_created_at_idx" 
    ON "announcements" ("team_id", "created_at");
  `);
}

export async function down(db: any) {
  // Remove all constraints and indexes added in the up function
  // 1. Remove foreign key from teams
  await db.run(sql`ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_created_by_id_fkey";`);

  // 2. Remove foreign keys from team_members
  await db.run(sql`ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_team_id_fkey";`);
  await db.run(sql`ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_user_id_fkey";`);
  await db.run(sql`DROP INDEX IF EXISTS "team_members_team_id_user_id_unique";`);

  // 3. Remove foreign key from matches
  await db.run(sql`ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "matches_team_id_fkey";`);

  // 4. Remove foreign keys from events
  await db.run(sql`ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_team_id_fkey";`);
  await db.run(sql`ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_created_by_id_fkey";`);

  // 5. Remove foreign keys from attendance
  await db.run(sql`ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_event_id_fkey";`);
  await db.run(sql`ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_user_id_fkey";`);
  await db.run(sql`DROP INDEX IF EXISTS "attendance_event_id_user_id_unique";`);

  // 6. Remove foreign keys from playerStats
  await db.run(sql`ALTER TABLE "player_stats" DROP CONSTRAINT IF EXISTS "player_stats_user_id_fkey";`);
  await db.run(sql`ALTER TABLE "player_stats" DROP CONSTRAINT IF EXISTS "player_stats_match_id_fkey";`);
  await db.run(sql`DROP INDEX IF EXISTS "player_stats_match_id_user_id_unique";`);

  // 7. Remove foreign keys from announcements
  await db.run(sql`ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_team_id_fkey";`);
  await db.run(sql`ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_created_by_id_fkey";`);

  // 8. Remove foreign keys from invitations
  await db.run(sql`ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_team_id_fkey";`);
  await db.run(sql`ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_created_by_id_fkey";`);
  await db.run(sql`DROP INDEX IF EXISTS "invitations_team_id_email_unique";`);

  // 9. Remove foreign keys from matchLineups
  await db.run(sql`ALTER TABLE "match_lineups" DROP CONSTRAINT IF EXISTS "match_lineups_match_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_lineups" DROP CONSTRAINT IF EXISTS "match_lineups_team_id_fkey";`);

  // 10. Remove foreign key from teamLineups
  await db.run(sql`ALTER TABLE "team_lineups" DROP CONSTRAINT IF EXISTS "team_lineups_team_id_fkey";`);

  // 11. Remove foreign keys from matchSubstitutions
  await db.run(sql`ALTER TABLE "match_substitutions" DROP CONSTRAINT IF EXISTS "match_substitutions_match_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_substitutions" DROP CONSTRAINT IF EXISTS "match_substitutions_player_in_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_substitutions" DROP CONSTRAINT IF EXISTS "match_substitutions_player_out_id_fkey";`);

  // 12. Remove foreign keys from matchGoals
  await db.run(sql`ALTER TABLE "match_goals" DROP CONSTRAINT IF EXISTS "match_goals_match_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_goals" DROP CONSTRAINT IF EXISTS "match_goals_scorer_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_goals" DROP CONSTRAINT IF EXISTS "match_goals_assist_id_fkey";`);

  // 13. Remove foreign keys from matchCards
  await db.run(sql`ALTER TABLE "match_cards" DROP CONSTRAINT IF EXISTS "match_cards_match_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_cards" DROP CONSTRAINT IF EXISTS "match_cards_player_id_fkey";`);

  // 14. Remove foreign keys from matchPhotos
  await db.run(sql`ALTER TABLE "match_photos" DROP CONSTRAINT IF EXISTS "match_photos_match_id_fkey";`);
  await db.run(sql`ALTER TABLE "match_photos" DROP CONSTRAINT IF EXISTS "match_photos_uploaded_by_id_fkey";`);

  // 15. Remove foreign key from leagueClassification
  await db.run(sql`ALTER TABLE "league_classification" DROP CONSTRAINT IF EXISTS "league_classification_team_id_fkey";`);
  await db.run(sql`DROP INDEX IF EXISTS "league_classification_team_id_ext_team_unique";`);

  // 16. Remove additional indexes
  await db.run(sql`DROP INDEX IF EXISTS "teams_join_code_idx";`);
  await db.run(sql`DROP INDEX IF EXISTS "matches_team_id_match_date_idx";`);
  await db.run(sql`DROP INDEX IF EXISTS "events_team_id_start_time_idx";`);
  await db.run(sql`DROP INDEX IF EXISTS "announcements_team_id_created_at_idx";`);
}