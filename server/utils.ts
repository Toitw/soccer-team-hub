/**
 * Utility functions for the Cancha+ application
 */

/**
 * Generate a random alphanumeric code of specified length
 * Used for team join codes
 * @param length Length of the code to generate
 * @returns Random alphanumeric string
 */
export function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded potentially confusing characters: 0, 1, I, O
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a shareable invite link with team code
 * @param teamCode The team's join code
 * @param baseUrl Optional base URL (defaults to current origin)
 * @returns Full invite URL
 */
export function generateInviteLink(teamCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/join/${teamCode}`;
}