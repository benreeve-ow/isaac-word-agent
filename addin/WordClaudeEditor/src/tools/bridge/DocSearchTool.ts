/**
 * Bridge tool for doc.search - delegates to ToolHost
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";
import { toolHost } from "../../services/ToolHost";

export class DocSearchTool extends BaseTool {
  name = "doc.search";
  description = "Search the document for text using literal or regex patterns";
  category = "analysis" as const;
  
  parameters = [
    {
      name: "query",
      type: "string" as const,
      description: "Search query",
      required: true
    },
    {
      name: "mode",
      type: "string" as const,
      description: "Search mode",
      enum: ["literal", "regex"],
      default: "literal"
    },
    {
      name: "maxHits",
      type: "number" as const,
      description: "Maximum number of hits to return",
      default: 40
    }
  ];
  
  async execute(params: any, _context: ToolContext): Promise<ToolResult> {
    try {
      // Delegate to ToolHost
      const result = await toolHost.handleToolCall({
        id: "search-" + Date.now(),
        tool: "doc.search",
        payload: params
      });
      
      if (result.success) {
        return this.createSuccessResult(
          `Found ${result.data?.totalHits || 0} matches`,
          result.data
        );
      } else {
        return this.createErrorResult(result.error || "Search failed");
      }
    } catch (error: any) {
      return this.createErrorResult(error.message || "Search failed");
    }
  }
}