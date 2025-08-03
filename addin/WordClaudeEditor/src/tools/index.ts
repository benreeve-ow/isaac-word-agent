/**
 * Central export and initialization for all tools
 */

import { ToolRegistry } from "./core/ToolRegistry";
import { ToolExecutor } from "./core/ToolExecutor";

// Import all tools
import { SearchDocumentTool } from "./editing/SearchDocumentTool";
import { EditContentTool } from "./editing/EditContentTool";
import { InsertContentTool } from "./editing/InsertContentTool";
import { ApplyFormattingTool } from "./formatting/ApplyFormattingTool";
import { ApplyStyleTool } from "./formatting/ApplyStyleTool";
import { AddCommentTool } from "./review/AddCommentTool";
import { GetCommentsTool } from "./review/GetCommentsTool";
import { InsertTableTool } from "./structure/InsertTableTool";
import { InsertBreakTool } from "./structure/InsertBreakTool";
import { AnalyzeStructureTool } from "./analysis/AnalyzeStructureTool";
import { ReadFullDocumentTool } from "./analysis/ReadFullDocumentTool";

// Export core classes
export { ToolRegistry } from "./core/ToolRegistry";
export { ToolExecutor } from "./core/ToolExecutor";
export { ToolDefinition, ToolResult, ToolContext, BaseTool } from "./core/ToolDefinition";

/**
 * Initialize and register all available tools
 */
export function initializeTools(): void {
  const registry = ToolRegistry.getInstance();
  
  // Clear any existing tools
  registry.clear();
  
  // Register editing tools
  registry.register(new SearchDocumentTool());
  registry.register(new EditContentTool());
  registry.register(new InsertContentTool());
  
  // Register formatting tools
  registry.register(new ApplyFormattingTool());
  registry.register(new ApplyStyleTool());
  
  // Register review tools
  registry.register(new AddCommentTool());
  registry.register(new GetCommentsTool());
  
  // Register structure tools
  registry.register(new InsertTableTool());
  registry.register(new InsertBreakTool());
  
  // Register analysis tools
  registry.register(new AnalyzeStructureTool());
  registry.register(new ReadFullDocumentTool());
  
  console.log(`[ToolSystem] Initialized ${registry.getAllTools().length} tools`);
  console.log(`[ToolSystem] Categories: ${registry.getCategories().join(", ")}`);
}

/**
 * Get a configured tool executor
 */
export function getToolExecutor(): ToolExecutor {
  return new ToolExecutor();
}

/**
 * Get tool definitions for the backend/agent
 */
export function getToolDefinitionsForAgent(): any[] {
  const registry = ToolRegistry.getInstance();
  return registry.getToolDefinitions();
}