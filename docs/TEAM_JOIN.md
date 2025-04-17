# Team Join Functionality

## Overview
The application includes a team join system that allows users to join existing teams using join codes. This document outlines how this functionality works and key implementation details.

## Team Join Flow

### During Registration
1. When a user registers, they can optionally provide a team join code
2. If a valid join code is provided, the user is automatically added to the team
3. The user joins with the default "player" role

### After Registration
1. Users can validate a join code before joining a team
2. Team members can be manually added by team admins
3. A user can belong to multiple teams

## Implementation Details

### Join Codes
- Each team has a unique `joinCode` field
- Join codes are randomly generated when creating a team
- Team admins can reset a team's join code
- Join codes can be validated without requiring authentication

### Key Files
- `server/auth.ts` - Registration endpoint with join code handling
- `server/entity-storage.ts` - Team and TeamMember storage
- `client/src/pages/auth-page.tsx` - Registration form with join code field
- `server/utils/join-code.ts` - Join code generation utility

## API Endpoints

### Validate Join Code
```
GET /api/validate-join-code/:code
```
- Validates a join code without requiring authentication
- Returns basic team info if the code is valid
- Used for validation before registration or when joining a team

### Registration with Join Code
```
POST /api/register
```
- Accepts a `joinCode` parameter in addition to registration details
- If the join code is valid, user is added as a team member after registration

## Security Considerations

1. **Role Assignment**: Users joining via join code are always assigned the "player" role, not admin
2. **Code Validation**: Join codes are validated securely on the server
3. **Team Privacy**: Only basic team info is returned when validating a code
4. **Code Expiry**: No automatic expiry is implemented, but admins can regenerate codes

## Future Enhancements

Potential improvements to consider:
- Add join code expiration dates
- Allow team admins to set the default role for users joining via codes
- Implement join requests that require admin approval
- Add the ability to disable join codes temporarily
- Generate QR codes for easier sharing of join codes