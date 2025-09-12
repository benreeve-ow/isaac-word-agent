/**
 * Bridge tool for doc.edit - delegates to ToolHost
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";
import { toolHost } from "../../services/ToolHost";

export class DocEditTool extends BaseTool {
  name = "doc.edit";
  description = "Edit the document by replacing, inserting, or commenting on text found via search";
  category = "editing" as const;
  
  parameters = [
    {
      name: "operation",
      type: "object" as const,
      description: "Edit operation to perform",
      required: true
    }
  ];
  
  async execute(params: any, _context: ToolContext): Promise<ToolResult> {
    try {
      // Delegate to ToolHost
      const result = await toolHost.handleToolCall({
        id: "edit-" + Date.now(),
        tool: "doc.edit",
        payload: params
      });
      
      if (result.success) {
        return this.createSuccessResult(
          result.data?.message || "Edit operation completed successfully",
          result.data,
          [{
            type: params.operation?.type || "edit",
            description: result.data?.message || "Document edited",
            location: params.operation?.hitId || "document"
          }]
        );
      } else {
        return this.createErrorResult(result.error || "Edit operation failed");
      }
    } catch (error: any) {
      return this.createErrorResult(error.message || "Edit operation failed");
    }
  }
}