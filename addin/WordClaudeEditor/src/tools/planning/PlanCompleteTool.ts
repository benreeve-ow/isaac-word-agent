/**
 * Tool for marking tasks as complete
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class PlanCompleteTool extends BaseTool {
  name = "plan.complete";
  description = "Mark task as done";
  category = "planning" as const;
  
  parameters = [
    {
      name: "id",
      type: "string" as const,
      description: "Task ID",
      required: true
    }
  ];
  
  async execute(params: any, _context: ToolContext): Promise<ToolResult> {
    // Planning is handled on the backend, so we just return success
    return this.createSuccessResult(
      `Task completed: ${params.id}`,
      { success: true, id: params.id }
    );
  }
}