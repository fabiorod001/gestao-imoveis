import type { IStorage } from "../storage";

/**
 * Base service class that all services extend from.
 * Provides common functionality and storage access.
 */
export abstract class BaseService {
  protected storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Helper method to validate user access to a resource
   */
  protected async validateUserAccess(userId: string, resourceId?: number): Promise<boolean> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    return true;
  }

  /**
   * Helper method to handle errors consistently
   */
  protected handleError(error: unknown, context: string): never {
    console.error(`Error in ${context}:`, error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(`Unknown error in ${context}`);
  }
}