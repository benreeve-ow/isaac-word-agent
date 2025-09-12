/**
 * Tool for adding tasks to the plan
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class PlanAddTool extends BaseTool {
  name = "plan.add";
  description = "Create a task for tracking";
  category = "planning" as const;
  
  parameters = [
    {
      name: "title",
      type: "string" as const,
      description: "Task title",
      required: true
    },
    {
      name: "description",
      type: "string" as const,
      description: "Task description",
      required: false
    }
  ];
  
  async execute(params: any, _context: ToolContext): Promise<ToolResult> {
    // Planning is handled on the backend, so we just return success
    // The actual tracking happens in the backend's agent service
    return this.createSuccessResult(
      `Task added: ${params.title}`,
      { 
        success: true, 
        id: `task-${Date.now()}`,
        title: params.title,
        description: params.description 
      }
    );
  }
}