import { randomBytes } from "crypto";

/**
 * Function to generate a unique, readable join code
 * @returns A 6-character alphanumeric code
 */
export function generateJoinCode(): string {
  // Generate a 6-character alphanumeric code (excluding similar looking characters)
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding 0, 1, I, O
  const codeLength = 6;
  let joinCode = '';
  
  // Generate random characters
  const randomBytesBuffer = randomBytes(codeLength);
  for (let i = 0; i < codeLength; i++) {
    joinCode += characters[randomBytesBuffer[i] % characters.length];
  }
  
  return joinCode;
}