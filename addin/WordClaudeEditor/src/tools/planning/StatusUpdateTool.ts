/**
 * Tool for updating status
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class StatusUpdateTool extends BaseTool {
  name = "status.update";
  description = "Update progress status";
  category = "planning" as const;
  
  parameters = [
    {
      name: "message",
      type: "string" as const,
      description: "Status message",
      required: true
    },
    {
      name: "progress",
      type: "number" as const,
      description: "Progress percentage (0-100)",
      required: false
    }
  ];
  
  async execute(params: any, _context: ToolContext): Promise<ToolResult> {
    // Status is handled on the backend, so we just return success
    return this.createSuccessResult(
      `Status updated: ${params.message}`,
      { success: true, message: params.message, progress: params.progress }
    );
  }
}