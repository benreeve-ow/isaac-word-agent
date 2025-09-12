/**
 * Central export and initialization for all tools
 */

import { ToolRegistry } from "./core/ToolRegistry";
import { ToolExecutor } from "./core/ToolExecutor";

// Import context-based tools (new simplified tools)
import { InsertTextTool } from "./context/InsertTextTool";
import { ReplaceTextTool } from "./context/ReplaceTextTool";
import { DeleteTextTool } from "./context/DeleteTextTool";
import { InsertTableTool as ContextInsertTableTool } from "./context/InsertTableTool";
import { ReadDocumentTool } from "./context/ReadDocumentTool";
import { ReadUnifiedDocumentTool } from "./context/ReadUnifiedDocumentTool";
import { AddCommentTool as ContextAddCommentTool } from "./context/AddCommentTool";
import { ResolveCommentTool } from "./context/ResolveCommentTool";
import { EditTableTool as ContextEditTableTool } from "./context/EditTableTool";

// Import legacy tools (keeping for backward compatibility)
import { SearchDocumentTool } from "./editing/SearchDocumentTool";
import { EditContentTool } from "./editing/EditContentTool";
import { InsertContentTool } from "./editing/InsertContentTool";
import { ApplyFormattingTool } from "./formatting/ApplyFormattingTool";
import { ApplyStyleTool } from "./formatting/ApplyStyleTool";
import { AddCommentTool } from "./review/AddCommentTool";
import { GetCommentsTool } from "./review/GetCommentsTool";
import { InsertTableTool } from "./structure/InsertTableTool";
import { EditTableTool } from "./structure/EditTableTool";
import { DeleteTableTool } from "./structure/DeleteTableTool";
import { FindTablesTool } from "./structure/FindTablesTool";
import { InsertBreakTool } from "./structure/InsertBreakTool";
import { AnalyzeStructureTool } from "./analysis/AnalyzeStructureTool";
import { ReadFullDocumentTool } from "./analysis/ReadFullDocumentTool";

// Import bridge tools for legacy doc.* and plan.* tools
import { DocSnapshotTool } from "./bridge/DocSnapshotTool";
import { DocSearchTool } from "./bridge/DocSearchTool";
import { DocEditTool } from "./bridge/DocEditTool";
import { PlanAddTool } from "./planning/PlanAddTool";
import { PlanCompleteTool } from "./planning/PlanCompleteTool";
import { StatusUpdateTool } from "./planning/StatusUpdateTool";

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
  registry.register(new InsertTextTool());
  registry.register(new ReplaceTextTool());
  registry.register(new DeleteTextTool());
  registry.register(new ContextInsertTableTool());
  registry.register(new ReadDocumentTool());
  registry.register(new ReadUnifiedDocumentTool());
  registry.register(new ContextAddCommentTool());
  registry.register(new ResolveCommentTool());
  registry.register(new ContextEditTableTool());
  
  // Register planning tools (these don't conflict)
  registry.register(new PlanAddTool());
  registry.register(new PlanCompleteTool());
  registry.register(new StatusUpdateTool());
  
  // Note: Not registering legacy tools to avoid conflicts and confusion
  // The backend only knows about the context-based tools
  
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