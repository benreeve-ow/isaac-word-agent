/**
 * Bridge tool for doc.snapshot - delegates to ToolHost
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";
import { toolHost } from "../../services/ToolHost";

export class DocSnapshotTool extends BaseTool {
  name = "doc.snapshot";
  description = "Get a Unified Document View (UDV) of the current document for analysis and editing";
  category = "analysis" as const;
  
  parameters = [
    {
      name: "dummy",
      type: "string" as const,
      description: "Not used - this tool requires no parameters",
      required: false
    }
  ];
  
  async execute(params: any, _context: ToolContext): Promise<ToolResult> {
    try {
      // Delegate to ToolHost
      const result = await toolHost.handleToolCall({
        id: "snapshot-" + Date.now(),
        tool: "doc.snapshot",
        payload: params || {}
      });
      
      if (result.success) {
        return this.createSuccessResult(
          "Document snapshot retrieved successfully",
          result.data
        );
      } else {
        return this.createErrorResult(result.error || "Failed to get document snapshot");
      }
    } catch (error: any) {
      return this.createErrorResult(error.message || "Failed to get document snapshot");
    }
  }
}