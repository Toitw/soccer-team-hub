import fs from "fs";
import path from "path";

/**
 * Generic data persistence helper for storing entity collections to JSON files
 * @param filePath - Path to the JSON file
 * @param data - Array of entities to save
 */
export function saveDataToFile<T>(filePath: string, data: T[]): void {
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
}

/**
 * Generic function to load data from a JSON file
 * @param filePath - Path to the JSON file
 * @returns Array of entities or undefined if file doesn't exist
 */
export function loadDataFromFile<T>(filePath: string): T[] | undefined {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return undefined;
}

/**
 * Interface for entity storage management
 */
export interface EntityStorage<T, TInsert> {
  get(id: number): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  create(data: TInsert): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T | undefined>;
  delete(id: number): Promise<boolean>;
  persist(): void;
}

/**
 * Base implementation for entity storage
 */
export class BaseEntityStorage<T extends { id: number }, TInsert> implements EntityStorage<T, TInsert> {
  protected entities = new Map<number, T>();
  protected currentId = 1;
  protected filePath: string;
  
  constructor(filePath: string) {
    this.filePath = filePath;
  }
  
  async get(id: number): Promise<T | undefined> {
    return this.entities.get(id);
  }
  
  async getAll(): Promise<T[]> {
    return Array.from(this.entities.values());
  }
  
  async create(data: TInsert): Promise<T> {
    throw new Error("Method must be implemented by subclass");
  }
  
  async update(id: number, data: Partial<T>): Promise<T | undefined> {
    const entity = this.entities.get(id);
    if (!entity) return undefined;
    
    const updatedEntity = { ...entity, ...data };
    this.entities.set(id, updatedEntity);
    this.persist();
    
    return updatedEntity;
  }
  
  async delete(id: number): Promise<boolean> {
    const result = this.entities.delete(id);
    if (result) {
      this.persist();
    }
    return result;
  }
  
  persist(): void {
    saveDataToFile(this.filePath, Array.from(this.entities.values()));
  }
  
  load(): boolean {
    const data = loadDataFromFile<T>(this.filePath);
    if (data && data.length > 0) {
      this.entities.clear();
      let maxId = 0;
      
      for (const entity of data) {
        this.entities.set(entity.id, entity);
        if (entity.id > maxId) {
          maxId = entity.id;
        }
      }
      
      this.currentId = maxId + 1;
      console.log(`Loaded ${data.length} entities from ${this.filePath}`);
      return true;
    }
    return false;
  }
  
  protected getNextId(): number {
    return this.currentId++;
  }
}