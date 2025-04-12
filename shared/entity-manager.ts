import { DataLoader, EntityType } from './data-loader';

/**
 * Base interface for entities with an ID
 */
export interface Entity {
  id: number;
}

/**
 * Generic entity manager for CRUD operations
 */
export class EntityManager<T extends Entity, TInsert> {
  protected entities = new Map<number, T>();
  protected currentId = 1;
  protected entityType: EntityType;
  
  /**
   * Create a new entity manager
   * @param entityType - The type of entity to manage
   */
  constructor(entityType: EntityType) {
    this.entityType = entityType;
    this.load();
  }
  
  /**
   * Get an entity by ID
   * @param id - The entity ID
   * @returns The entity, or undefined if not found
   */
  async get(id: number): Promise<T | undefined> {
    return this.entities.get(id);
  }
  
  /**
   * Get all entities
   * @returns An array of all entities
   */
  async getAll(): Promise<T[]> {
    return Array.from(this.entities.values());
  }
  
  /**
   * Find entities by a predicate
   * @param predicate - The predicate to filter by
   * @returns An array of matching entities
   */
  async find(predicate: (entity: T) => boolean): Promise<T[]> {
    return Array.from(this.entities.values()).filter(predicate);
  }
  
  /**
   * Find a single entity by a predicate
   * @param predicate - The predicate to filter by
   * @returns The first matching entity, or undefined if not found
   */
  async findOne(predicate: (entity: T) => boolean): Promise<T | undefined> {
    return Array.from(this.entities.values()).find(predicate);
  }
  
  /**
   * Create a new entity
   * @param data - The entity data
   * @param transform - A function to transform the data before storing
   * @returns The created entity
   */
  async create(data: TInsert, transform?: (data: TInsert, id: number) => T): Promise<T> {
    const id = this.getNextId();
    
    let entity: T;
    if (transform) {
      entity = transform(data, id);
    } else {
      entity = { ...data as any, id } as T;
    }
    
    this.entities.set(id, entity);
    this.save();
    
    return entity;
  }
  
  /**
   * Update an entity
   * @param id - The entity ID
   * @param data - The partial entity data to update
   * @returns The updated entity, or undefined if not found
   */
  async update(id: number, data: Partial<T>): Promise<T | undefined> {
    const entity = this.entities.get(id);
    if (!entity) return undefined;
    
    const updatedEntity = { ...entity, ...data };
    this.entities.set(id, updatedEntity);
    this.save();
    
    return updatedEntity;
  }
  
  /**
   * Delete an entity
   * @param id - The entity ID
   * @returns True if the entity was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = this.entities.delete(id);
    if (result) {
      this.save();
    }
    return result;
  }
  
  /**
   * Delete multiple entities by a predicate
   * @param predicate - The predicate to filter by
   * @returns The number of entities deleted
   */
  async deleteMany(predicate: (entity: T) => boolean): Promise<number> {
    const entitiesToDelete = Array.from(this.entities.values()).filter(predicate);
    
    for (const entity of entitiesToDelete) {
      this.entities.delete(entity.id);
    }
    
    this.save();
    return entitiesToDelete.length;
  }
  
  /**
   * Load entities from storage
   * @returns True if data was loaded, false otherwise
   */
  load(): boolean {
    const data = DataLoader.loadData<T>(this.entityType);
    
    if (data.length > 0) {
      this.entities.clear();
      let maxId = 0;
      
      for (const entity of data) {
        this.entities.set(entity.id, entity);
        if (entity.id > maxId) {
          maxId = entity.id;
        }
      }
      
      this.currentId = maxId + 1;
      console.log(`Loaded ${data.length} ${this.entityType} from storage`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Save entities to storage
   */
  save(): void {
    DataLoader.saveData(this.entityType, Array.from(this.entities.values()));
  }
  
  /**
   * Get the next available ID
   * @returns The next ID
   */
  protected getNextId(): number {
    return this.currentId++;
  }
}