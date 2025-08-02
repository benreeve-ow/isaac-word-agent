/* global Office */

export interface CustomPrompt {
  id: string;
  text: string;
  order: number;
}

class PromptService {
  private readonly STORAGE_KEY = "dnagent_custom_prompts";
  private readonly DEFAULT_PROMPTS: string[] = [
    "Fix grammar and spelling",
    "Make more concise",
    "Expand with detail",
    "Improve clarity",
    "Make more formal",
    "Simplify language",
  ];

  /**
   * Get all custom prompts from storage
   */
  public async getPrompts(): Promise<CustomPrompt[]> {
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        const stored = settings.get(this.STORAGE_KEY);
        
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error("Error loading prompts:", error);
    }

    // Return default prompts if none stored
    return this.DEFAULT_PROMPTS.map((text, index) => ({
      id: `default-${index}`,
      text,
      order: index
    }));
  }

  /**
   * Save prompts to storage
   */
  public async savePrompts(prompts: CustomPrompt[]): Promise<void> {
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        settings.set(this.STORAGE_KEY, JSON.stringify(prompts));
        await new Promise<void>((resolve, reject) => {
          settings.saveAsync((result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error("Failed to save prompts"));
            }
          });
        });
      } else {
        // Fallback to localStorage for browser testing
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prompts));
      }
    } catch (error) {
      console.error("Error saving prompts:", error);
      throw error;
    }
  }

  /**
   * Add a new prompt
   */
  public async addPrompt(text: string): Promise<CustomPrompt[]> {
    const prompts = await this.getPrompts();
    const newPrompt: CustomPrompt = {
      id: `custom-${Date.now()}`,
      text,
      order: prompts.length
    };
    
    const updated = [...prompts, newPrompt];
    await this.savePrompts(updated);
    return updated;
  }

  /**
   * Delete a prompt
   */
  public async deletePrompt(id: string): Promise<CustomPrompt[]> {
    const prompts = await this.getPrompts();
    const filtered = prompts.filter(p => p.id !== id);
    
    // Reorder remaining prompts
    const reordered = filtered.map((p, index) => ({
      ...p,
      order: index
    }));
    
    await this.savePrompts(reordered);
    return reordered;
  }

  /**
   * Reorder prompts
   */
  public async reorderPrompts(prompts: CustomPrompt[]): Promise<void> {
    const reordered = prompts.map((p, index) => ({
      ...p,
      order: index
    }));
    await this.savePrompts(reordered);
  }

  /**
   * Reset to default prompts
   */
  public async resetToDefaults(): Promise<CustomPrompt[]> {
    const defaults = this.DEFAULT_PROMPTS.map((text, index) => ({
      id: `default-${index}`,
      text,
      order: index
    }));
    
    await this.savePrompts(defaults);
    return defaults;
  }
}

export const promptService = new PromptService();