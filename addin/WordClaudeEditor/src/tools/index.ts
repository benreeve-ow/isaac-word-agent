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
  registry.register(new EditTableTool());
  registry.register(new DeleteTableTool());
  registry.register(new FindTablesTool());
  registry.register(new InsertBreakTool());
  
  // Register analysis tools
  registry.register(new AnalyzeStructureTool());
  registry.register(new ReadFullDocumentTool());
  
  // Register bridge tools for legacy doc.* tools
  registry.register(new DocSnapshotTool());
  registry.register(new DocSearchTool());
  registry.register(new DocEditTool());
  
  // Register planning tools
  registry.register(new PlanAddTool());
  registry.register(new PlanCompleteTool());
  registry.register(new StatusUpdateTool());
  
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