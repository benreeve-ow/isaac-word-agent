/**
 * Core type definitions for the tool system
 */

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  enum?: string[];
  default?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: "editing" | "formatting" | "review" | "structure" | "analysis" | "search" | "navigation";
  parameters: ToolParameter[];
  requiresSelection?: boolean;
  requiresApproval?: boolean;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  document?: Word.Document;
  selection?: Word.Range;
  user?: {
    preferences?: any;
    memory?: any;
  };
}

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  changes?: {
    type: string;
    description: string;
    location?: string;
  }[];
}

export interface ToolUse {
  tool: string;
  input: any;
  result?: ToolResult;
  timestamp?: Date;
}

export abstract class BaseTool implements ToolDefinition {
  abstract name: string;
  abstract description: string;
  abstract category: ToolDefinition["category"];
  abstract parameters: ToolParameter[];
  
  requiresSelection = false;
  requiresApproval = true;
  
  abstract execute(params: any, context: ToolContext): Promise<ToolResult>;
  
  protected createSuccessResult(message: string, data?: any, changes?: any[]): ToolResult {
    return {
      success: true,
      message,
      data,
      changes
    };
  }
  
  protected createErrorResult(error: string): ToolResult {
    return {
      success: false,
      error
    };
  }
}