/**
 * Central registry for all available tools
 */

import { ToolDefinition, ToolResult, ToolContext } from "./ToolDefinition";

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();
  private categories: Map<string, ToolDefinition[]> = new Map();
  
  private constructor() {
    // Singleton pattern
  }
  
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
  
  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered, overwriting...`);
    }
    
    this.tools.set(tool.name, tool);
    
    // Update category index
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, []);
    }
    const categoryTools = this.categories.get(tool.category)!;
    const existingIndex = categoryTools.findIndex(t => t.name === tool.name);
    if (existingIndex >= 0) {
      categoryTools[existingIndex] = tool;
    } else {
      categoryTools.push(tool);
    }
    
    console.log(`Registered tool: ${tool.name} in category: ${tool.category}`);
  }
  
  /**
   * Get a tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Get all tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolDefinition[] {
    return this.categories.get(category) || [];
  }
  
  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }
  
  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * Get tool definitions for API/Agent
   */
  getToolDefinitions(): any[] {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: tool.parameters.reduce((props, param) => {
          props[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
            ...(param.default !== undefined ? { default: param.default } : {})
          };
          return props;
        }, {} as any),
        required: tool.parameters
          .filter(p => p.required !== false)
          .map(p => p.name)
      }
    }));
  }
  
  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    this.categories.clear();
  }
}