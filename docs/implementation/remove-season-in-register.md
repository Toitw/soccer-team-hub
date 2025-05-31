# Plan for Removing Season and Division Fields from Create Team Form

## Overview
This plan outlines the changes needed to remove the `seasonYear` field from the team creation form and keep the `division` field but make it optional, so it can be configured later on the settings page. Season information will be created and managed from the Competition page.

## Changes Required

### 1. Frontend Changes

#### Onboarding Page (client/src/pages/onboarding-page.tsx)
- Remove the `seasonYear` FormField component from the team creation form
- Keep the `division` field but ensure it's properly marked as optional

#### Team Summary Component (client/src/components/dashboard/team-summary.tsx)
- Update the season display logic to handle cases where `team.seasonYear` is null or undefined 
- Use a fallback display or hide the season section when no season is available

#### Settings Page (client/src/pages/settings-page.tsx)
- Remove the `seasonYear` field from the team settings form
- Ensure the `division` field can still be updated as before

#### Team Page (client/src/pages/team-page.tsx)
- Update team display logic to handle cases where division is not set

### 2. Backend Changes

#### Create Team API (server/auth-routes.ts)
- Keep the `division` field as optional in the validation schema
- Remove the `seasonYear` field from the validation schema
- Update the team creation logic to not include `seasonYear` at all

#### Team Schema (shared/schema.ts)
- Keep the `seasonYear` field in the database schema to maintain compatibility with existing data
- No schema changes needed to the database, only changes to form handling

### 3. Implementation Steps

1. Update the onboarding page form to remove seasonYear field
2. Update the team creation API endpoint to no longer expect or use seasonYear
3. Update the team summary component to handle missing seasonYear
4. Update settings page to remove seasonYear field
5. Test the changes to ensure:
   - Teams can be created without seasonYear
   - Division can be left blank during creation and updated later
   - Frontend correctly displays teams with missing seasonYear/division

## Expected Behavior After Changes

1. **Creating a Team**:
   - Users will no longer see or input a Season field
   - Division field remains optional

2. **Dashboard Page**:
   - Season indicator will be hidden if no season is set
   - Division text will be blank until configured by the user

3. **Settings Page**:
   - Division can be updated as before
   - No Season field will be available

4. **Competition Page**:
   - Seasons will be created and managed independently of team creation

## Compatibility Notes

- Existing teams with seasonYear values will continue to work
- New teams will be created with null/undefined seasonYear
- No database migration is needed as we're only changing form fields and not database structure