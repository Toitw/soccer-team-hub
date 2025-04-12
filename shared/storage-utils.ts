import fs from 'fs';
import path from 'path';

// Base path for data storage
const DATA_DIR = './data';

/**
 * Generic interface for entities with an ID
 */
export interface EntityBase {
  id: number;
}

/**
 * Ensure the data directory exists
 */
export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Generate a random join code for teams
 * @param length - The length of the code to generate
 * @returns A random alphanumeric code
 */
export function generateJoinCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if a join code is unique
 * @param joinCode - The join code to check
 * @param existingCodes - Array of existing join codes
 * @returns A boolean indicating if the join code is unique
 */
export function isJoinCodeUnique(joinCode: string, existingCodes: string[]): boolean {
  return !existingCodes.includes(joinCode);
}

/**
 * Generate a unique join code
 * @param existingCodes - Array of existing join codes
 * @param length - The length of the code to generate
 * @returns A unique join code
 */
export function generateUniqueJoinCode(existingCodes: string[], length: number = 6): string {
  let joinCode: string;
  do {
    joinCode = generateJoinCode(length);
  } while (!isJoinCodeUnique(joinCode, existingCodes));
  return joinCode;
}

/**
 * Get the data file path for an entity type
 * @param entityType - The type of entity
 * @returns The file path for the entity data
 */
export function getDataFilePath(entityType: string): string {
  // Map entity types to filenames
  const fileNameMap: Record<string, string> = {
    users: 'users.json',
    teams: 'teams.json',
    teamMembers: 'team_members.json',
    matches: 'matches.json',
    events: 'events.json',
    announcements: 'announcements.json',
    // Add more entity types as needed
  };
  
  const fileName = fileNameMap[entityType] || `${entityType.toLowerCase()}.json`;
  return path.join(DATA_DIR, fileName);
}

/**
 * Load data from a file
 * @param filePath - The path to the data file
 * @returns The loaded data, or an empty array if the file doesn't exist
 */
export function loadDataFromFile<T>(filePath: string): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return [];
}

/**
 * Save data to a file
 * @param filePath - The path to the data file
 * @param data - The data to save
 */
export function saveDataToFile<T>(filePath: string, data: T[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
}

/**
 * Convert date strings to Date objects in an entity
 * @param entity - The entity to convert
 * @param dateFields - Array of field names that should be dates
 * @returns The entity with converted dates
 */
export function convertDates<T>(entity: T, dateFields: string[]): T {
  const result = { ...entity };
  
  for (const field of dateFields) {
    const value = (result as any)[field];
    if (value && typeof value === 'string') {
      (result as any)[field] = new Date(value);
    }
  }
  
  return result;
}