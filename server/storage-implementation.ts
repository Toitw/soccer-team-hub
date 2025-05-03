/**
 * Storage implementation for TeamKick app
 * This file selects the appropriate storage implementation based on environment settings
 */

import { IStorage } from "./storage";
import { MemStorage } from "./storage";
import { DatabaseStorage } from "./database-storage";

let storageImplementation: IStorage;

// Check if we're using database storage or file-based storage
// For production, always use database storage
if (process.env.NODE_ENV === 'production' || process.env.USE_DATABASE === 'true') {
  console.log("Using PostgreSQL database storage");
  storageImplementation = new DatabaseStorage();
} else {
  console.log("Using memory/file-based storage");
  storageImplementation = new MemStorage();
}

// Export the storage instance
export const storage = storageImplementation;

// Re-export hashPassword for convenience
export { hashPassword } from "@shared/auth-utils";