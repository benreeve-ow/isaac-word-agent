/**
 * Executes tools with proper Word context and error handling
 */

import { ToolDefinition, ToolResult, ToolContext } from "./ToolDefinition";
import { ToolRegistry } from "./ToolRegistry";

export interface ExecutionOptions {
  requireApproval?: boolean;
  trackChanges?: boolean;
  context?: ToolContext;
}

export class ToolExecutor {
  private registry: ToolRegistry;
  private approvalCallback?: (tool: string, params: any) => Promise<boolean>;
  
  constructor() {
    this.registry = ToolRegistry.getInstance();
  }
  
  /**
   * Set approval callback for tools that require approval
   */
  setApprovalCallback(callback: (tool: string, params: any) => Promise<boolean>): void {
    this.approvalCallback = callback;
  }
  
  /**
   * Execute a tool by name with parameters
   */
  async execute(
    toolName: string, 
    params: any, 
    options: ExecutionOptions = {}
  ): Promise<ToolResult> {
    console.log(`[ToolExecutor] Executing tool: ${toolName}`, params);
    
    // Get tool definition
    const tool = this.registry.getTool(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`
      };
    }
    
    try {
      // Check if approval is needed
      if (tool.requiresApproval && options.requireApproval !== false) {
        if (this.approvalCallback) {
          const approved = await this.approvalCallback(toolName, params);
          if (!approved) {
            return {
              success: false,
              error: "Tool execution cancelled by user"
            };
          }
        }
      }
      
      // Execute within Word context
      return await Word.run(async (context) => {
        // Build tool context
        const toolContext: ToolContext = options.context || {};
        toolContext.document = context.document;
        
        // Get selection if tool requires it
        if (tool.requiresSelection) {
          const selection = context.document.getSelection();
          context.load(selection, "text");
          await context.sync();
          
          if (!selection.text.trim()) {
            return {
              success: false,
              error: "This tool requires text to be selected"
            };
          }
          
          toolContext.selection = selection;
        }
        
        // Enable track changes if requested
        if (options.trackChanges) {
          context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        }
        
        // Execute the tool
        const result = await tool.execute(params, toolContext);
        
        // Sync changes
        await context.sync();
        
        console.log(`[ToolExecutor] Tool ${toolName} completed:`, result.success);
        return result;
      });
    } catch (error) {
      console.error(`[ToolExecutor] Error executing tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
  
  /**
   * Execute multiple tools in sequence
   */
  async executeSequence(
    tools: Array<{ name: string; params: any }>,
    options: ExecutionOptions = {}
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    for (const { name, params } of tools) {
      const result = await this.execute(name, params, options);
      results.push(result);
      
      // Stop execution if a tool fails
      if (!result.success) {
        console.warn(`[ToolExecutor] Stopping sequence due to failure in ${name}`);
        break;
      }
    }
    
    return results;
  }
  
  /**
   * Validate tool parameters before execution
   */
  validateParams(toolName: string, params: any): { valid: boolean; errors: string[] } {
    const tool = this.registry.getTool(toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool not found: ${toolName}`] };
    }
    
    const errors: string[] = [];
    
    // Check required parameters
    for (const param of tool.parameters) {
      if (param.required !== false && !(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }
      
      // Check enum values
      if (param.enum && param.name in params) {
        if (!param.enum.includes(params[param.name])) {
          errors.push(`Invalid value for ${param.name}: ${params[param.name]}. Must be one of: ${param.enum.join(", ")}`);
        }
      }
      
      // Check types (basic validation)
      if (param.name in params) {
        const value = params[param.name];
        const actualType = Array.isArray(value) ? "array" : typeof value;
        
        if (param.type !== actualType && value !== null && value !== undefined) {
          errors.push(`Invalid type for ${param.name}: expected ${param.type}, got ${actualType}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}