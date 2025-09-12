/* global Word */
import { buildUDVFromDocument } from "./UnifiedDoc/ooxmlToUDV";
import { udvInstance, UDVPath } from "./UnifiedDoc/UnifiedDoc";

export class ToolHost {
  private baseUrl: string;
  private secret: string;
  private hitMap: Map<string, { path: UDVPath; offStart: number; offEnd: number }> = new Map();

  constructor(baseUrl: string = "https://localhost:3000") {
    this.baseUrl = baseUrl;
    // In a real app, this would come from secure storage or environment
    this.secret = "79e7fbce-0788-4308-9638-d49c2f860cdc";
  }

  async handleToolCall(call: { id: string; tool: string; payload: any }): Promise<any> {
    console.log("[ToolHost] Handling tool call:", call.tool, "with payload:", call.payload);
    try {
      let result: any;
      
      // Mastra converts dots to underscores when streaming tool names
      // Convert back to dots to match our handler naming convention
      const toolName = call.tool.replace(/_/g, '.');
      
      switch (toolName) {
        case "doc.snapshot":
          result = await this.handleSnapshot(call.payload);
          break;
        case "doc.search":
          result = await this.handleSearch(call.payload);
          break;
        case "doc.edit":
          result = await this.handleEdit(call.payload);
          break;
        case "plan.add":
        case "plan.list":
        case "plan.complete":
        case "plan.delete":
        case "status.get":
        case "status.tick":
          // These are handled purely on the server side
          result = { success: true };
          break;
        default:
          throw new Error(`Unknown tool: ${toolName} (original: ${call.tool})`);
      }

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleSnapshot(_payload: any): Promise<any> {
    return Word.run(async (context) => {
      const udv = await buildUDVFromDocument(context);
      udvInstance.setUDV(udv);
      return udv;
    });
  }

  private async handleSearch(payload: { query: string; mode: "literal" | "regex"; maxHits: number }): Promise<any> {
    const result = udvInstance.search(payload.query, payload.mode, payload.maxHits);
    
    // Store hit mappings for later resolution
    result.hits.forEach(hit => {
      this.hitMap.set(hit.hitId, {
        path: hit.path,
        offStart: hit.offStart,
        offEnd: hit.offEnd
      });
    });
    
    return result;
  }

  private async handleEdit(payload: { operation: any }): Promise<any> {
    return Word.run(async (context) => {
      const op = payload.operation;
      
      switch (op.type) {
        case "replaceByHitId": {
          const hitInfo = this.hitMap.get(op.hitId);
          if (!hitInfo) throw new Error(`Hit ID not found: ${op.hitId}`);
          
          const range = await udvInstance.resolveUDVHitToRange(
            context,
            hitInfo.path,
            hitInfo.offStart,
            hitInfo.offEnd
          );
          
          range.insertText(op.newText, Word.InsertLocation.replace);
          
          if (op.comment) {
            range.insertComment(op.comment);
          }
          
          await context.sync();
          return { success: true, operation: "replace" };
        }
        
        case "insertBeforeHitId": {
          // Handle special hit IDs for empty documents
          if (op.hitId === "doc-start" || op.hitId === "doc-end") {
            // For doc-start, insert at beginning; for doc-end, insert at end
            const body = context.document.body;
            const location = op.hitId === "doc-start" ? Word.InsertLocation.start : Word.InsertLocation.end;
            body.insertText(op.newText, location);
            await context.sync();
            return { success: true, operation: "insertBefore", message: `Inserted at ${op.hitId}` };
          }
          
          const hitInfo = this.hitMap.get(op.hitId);
          if (!hitInfo) throw new Error(`Hit ID not found: ${op.hitId}`);
          
          const range = await udvInstance.resolveUDVHitToRange(
            context,
            hitInfo.path,
            hitInfo.offStart,
            hitInfo.offEnd
          );
          
          range.insertText(op.newText, Word.InsertLocation.before);
          await context.sync();
          return { success: true, operation: "insertBefore" };
        }
        
        case "insertAfterHitId": {
          // Handle special hit IDs for empty documents
          if (op.hitId === "doc-start" || op.hitId === "doc-end") {
            // For doc-start, insert at beginning; for doc-end, insert at end
            const body = context.document.body;
            const location = op.hitId === "doc-start" ? Word.InsertLocation.start : Word.InsertLocation.end;
            body.insertText(op.newText, location);
            await context.sync();
            return { success: true, operation: "insertAfter", message: `Inserted at ${op.hitId}` };
          }
          
          const hitInfo = this.hitMap.get(op.hitId);
          if (!hitInfo) throw new Error(`Hit ID not found: ${op.hitId}`);
          
          const range = await udvInstance.resolveUDVHitToRange(
            context,
            hitInfo.path,
            hitInfo.offStart,
            hitInfo.offEnd
          );
          
          range.insertText(op.newText, Word.InsertLocation.after);
          await context.sync();
          return { success: true, operation: "insertAfter" };
        }
        
        case "commentByHitId": {
          const hitInfo = this.hitMap.get(op.hitId);
          if (!hitInfo) throw new Error(`Hit ID not found: ${op.hitId}`);
          
          const range = await udvInstance.resolveUDVHitToRange(
            context,
            hitInfo.path,
            hitInfo.offStart,
            hitInfo.offEnd
          );
          
          range.insertComment(op.comment);
          await context.sync();
          return { success: true, operation: "comment" };
        }
        
        default:
          throw new Error(`Unknown edit operation: ${op.type}`);
      }
    });
  }

}

export const toolHost = new ToolHost();