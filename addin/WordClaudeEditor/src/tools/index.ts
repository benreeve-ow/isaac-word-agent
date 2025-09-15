/**
 * Central export and initialization for all tools
 */

import { ToolRegistry } from "./core/ToolRegistry";
import { ToolExecutor } from "./core/ToolExecutor";
import { ToolDefinition } from "./core/ToolDefinition";

// Import context-based tools (new simplified tools)
import { ApplyStyleTool } from "./context/ApplyStyleTool";
import { InsertTextTool } from "./context/InsertTextTool";
import { ReplaceTextTool } from "./context/ReplaceTextTool";
import { DeleteTextTool } from "./context/DeleteTextTool";
import { InsertTableTool as ContextInsertTableTool } from "./context/InsertTableTool";
import { ReadDocumentTool } from "./context/ReadDocumentTool";
import { ReadUnifiedDocumentTool } from "./context/ReadUnifiedDocumentTool";
import { AddCommentTool as ContextAddCommentTool } from "./context/AddCommentTool";
import { ResolveCommentTool } from "./context/ResolveCommentTool";
import { EditTableTool as ContextEditTableTool } from "./context/EditTableTool";

// Import new formatting tools
import { CreateMultiItemListTool } from "./context/CreateMultiItemListTool";
import { SetAlignmentTool } from "./context/SetAlignmentTool";
import { InsertBreakTool } from "./context/InsertBreakTool";
import { SetFontPropertiesTool } from "./context/SetFontPropertiesTool";
import { SetSpacingTool } from "./context/SetSpacingTool";
import { SetIndentationTool } from "./context/SetIndentationTool";
import { InsertFootnoteTool } from "./context/InsertFootnoteTool";
import { InsertLinkTool } from "./context/InsertLinkTool";
import { AdjustListLevelTool } from "./context/AdjustListLevelTool";

// All legacy tools have been removed - using only context-based tools

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
  
  // Register ONLY the new context-based tools that match the backend
  registry.register(new ApplyStyleTool());
  registry.register(new InsertTextTool());
  registry.register(new ReplaceTextTool());
  registry.register(new DeleteTextTool());
  registry.register(new ContextInsertTableTool());
  registry.register(new ReadDocumentTool());
  registry.register(new ReadUnifiedDocumentTool());
  registry.register(new ContextAddCommentTool());
  registry.register(new ResolveCommentTool());
  registry.register(new ContextEditTableTool());
  
  // Register new formatting tools
  registry.register(new CreateMultiItemListTool()); // This is now the only list tool
  registry.register(new AdjustListLevelTool());
  registry.register(new SetAlignmentTool());
  registry.register(new InsertBreakTool());
  registry.register(new SetFontPropertiesTool());
  registry.register(new SetSpacingTool());
  registry.register(new SetIndentationTool());
  registry.register(new InsertFootnoteTool());
  registry.register(new InsertLinkTool());
  
}

/**
 * Get a configured tool executor
 */
export function getToolExecutor(): ToolExecutor {
  return new ToolExecutor();
}

/**
 * Get tool definitions for the backend/agent
 * @returns Array of tool definitions
 */
export function getToolDefinitionsForAgent(): ToolDefinition[] {
  const registry = ToolRegistry.getInstance();
  return registry.getToolDefinitions();
}