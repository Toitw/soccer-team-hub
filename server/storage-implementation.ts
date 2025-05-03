/**
 * Storage implementation selector module
 * This module selects between memory/file-based storage and PostgreSQL database storage
 * depending on the environment and configuration.
 */

import { IStorage } from "./storage";
import { MemStorage } from "./storage";
import { DatabaseStorage } from "./database-storage";

// Check if database URL is available to determine if we should use database storage
const isDbConfigured = !!process.env.DATABASE_URL;

// Initialize the appropriate storage implementation
let storage: IStorage;

if (isDbConfigured) {
  console.log("Using PostgreSQL database storage");
  storage = new DatabaseStorage();
} else {
  console.log("Using memory/file-based storage");
  storage = new MemStorage();
}

export { storage };