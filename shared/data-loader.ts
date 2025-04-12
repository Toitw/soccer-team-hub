import fs from 'fs';
import path from 'path';

// File paths for data persistence
const DATA_DIR = './data';

/**
 * Map of entity types to their respective file paths
 */
export const DATA_PATHS = {
  users: path.join(DATA_DIR, 'users.json'),
  teams: path.join(DATA_DIR, 'teams.json'),
  teamMembers: path.join(DATA_DIR, 'team_members.json'),
  matches: path.join(DATA_DIR, 'matches.json'),
  events: path.join(DATA_DIR, 'events.json'),
  attendance: path.join(DATA_DIR, 'attendance.json'),
  playerStats: path.join(DATA_DIR, 'player_stats.json'),
  announcements: path.join(DATA_DIR, 'announcements.json'),
  invitations: path.join(DATA_DIR, 'invitations.json'),
  matchLineups: path.join(DATA_DIR, 'match_lineups.json'),
  teamLineups: path.join(DATA_DIR, 'team_lineups.json'),
  matchSubstitutions: path.join(DATA_DIR, 'match_substitutions.json'),
  matchGoals: path.join(DATA_DIR, 'match_goals.json'),
  matchCards: path.join(DATA_DIR, 'match_cards.json'),
  matchPhotos: path.join(DATA_DIR, 'match_photos.json'),
  leagueClassification: path.join(DATA_DIR, 'league_classification.json')
};

export type EntityType = keyof typeof DATA_PATHS;

/**
 * Generic data loader that handles date conversion and validation
 */
export class DataLoader {
  /**
   * Ensure data directory exists
   */
  static initDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }
  
  /**
   * Load data from a JSON file with type conversion
   * @param entityType - The type of entity to load
   * @returns An array of entities with proper type conversion
   */
  static loadData<T>(entityType: EntityType): T[] {
    try {
      const filePath = DATA_PATHS[entityType];
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(data) && data.length > 0) {
          // Handle date conversion for known date fields
          return data.map(item => this.convertDates(item, entityType)) as T[];
        }
      }
      return [];
    } catch (error) {
      console.error(`Error loading ${entityType} data:`, error);
      return [];
    }
  }
  
  /**
   * Save data to a JSON file
   * @param entityType - The type of entity to save
   * @param data - The data to save
   */
  static saveData<T>(entityType: EntityType, data: T[]): void {
    try {
      const filePath = DATA_PATHS[entityType];
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving ${entityType} data:`, error);
    }
  }
  
  /**
   * Convert date strings to Date objects
   * @param item - The entity to convert
   * @param entityType - The type of entity
   * @returns The entity with converted dates
   */
  private static convertDates<T>(item: T, entityType: EntityType): T {
    const newItem = { ...item };
    
    // Date field mapping by entity type
    const dateFields: Record<EntityType, string[]> = {
      teamMembers: ['joinedAt'],
      matches: ['matchDate'],
      events: ['startTime', 'endTime'],
      announcements: ['createdAt'],
      invitations: ['createdAt'],
      matchLineups: ['createdAt'],
      teamLineups: ['createdAt', 'updatedAt'],
      matchPhotos: ['uploadedAt'],
      leagueClassification: ['createdAt', 'updatedAt'],
      users: [],
      teams: [],
      attendance: [],
      playerStats: [],
      matchSubstitutions: [],
      matchGoals: [],
      matchCards: []
    };
    
    // Convert date strings to Date objects
    for (const field of dateFields[entityType]) {
      if (newItem[field as keyof T] && typeof newItem[field as keyof T] === 'string') {
        (newItem as any)[field] = new Date(newItem[field as keyof T] as string);
      }
    }
    
    return newItem;
  }
}