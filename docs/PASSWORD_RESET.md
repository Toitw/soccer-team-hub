# Password Reset System Documentation

## Overview
This document describes the password reset functionality implemented in this application, including the security features and potential issues to watch out for.

## Password Reset Flow
1. User requests a password reset by providing their email
2. System generates a secure token and expiry time (1 hour)
3. Token is stored in the user record (resetPasswordToken and resetPasswordTokenExpiry fields)
4. System sends reset email with link containing the token
5. User clicks the link and enters a new password
6. System verifies the token and updates the password with a hashed version
7. User can log in with the new password

## Password Hashing
The system uses two password formats for backward compatibility:

### New Format (Preferred)
- Format: `salt:hash`
- Used by functions in `shared/auth-utils.ts`
- This is the primary format for all new passwords

### Legacy Format
- Format: `hash.salt`
- Used in older parts of the system
- Supported for backward compatibility

## Important Files
- `server/auth.ts` - Contains the primary login authentication logic
- `server/auth-routes.ts` - API routes for password reset and email verification
- `shared/auth-utils.ts` - Core hashing and security functions
- `server/entity-storage.ts` - User data storage with updateUser method

## Key Functions

### hashPassword
Creates a secure hash of a password with a random salt. Current implementation uses the format `salt:hash` with:
- 16 bytes of random salt
- 64 bytes of key derivation using scrypt
- Both values encoded as hex strings

### comparePasswords
Validates passwords by:
1. Detecting the format (: or . separator)
2. Splitting to get the salt and hash components
3. Hashing the supplied password with the stored salt
4. Comparing the hashes using timingSafeEqual for security

## Critical Notes for Maintenance

### Password Updates
When updating a user's password:
- ALWAYS hash the password before storing
- Use hashPassword from shared/auth-utils.ts
- Do not rely on entity-storage.updateUser to automatically hash passwords

### Password Reset
The reset endpoint in auth-routes.ts hashes the password explicitly before passing it to storage.updateUser. Changes here should maintain this approach.

### Password Format Transition
- The system is gradually transitioning to the salt:hash format
- All new passwords and reset passwords use this format
- The comparison functions handle both formats for backward compatibility
- After sufficient time has passed, the old format support could be removed

### Security Considerations
- Tokens expire after 1 hour (verificationTokenExpiry, resetPasswordTokenExpiry)
- For security, the API always returns success on password reset requests even if email not found
- Passwords are never sent in plain text responses
- Password comparison uses timingSafeEqual to prevent timing attacks