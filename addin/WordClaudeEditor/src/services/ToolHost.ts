/* global Word */
import { buildUDVFromDocument } from "./UnifiedDoc/ooxmlToUDV";
import { udvInstance, UDVPath } from "./UnifiedDoc/UnifiedDoc";

export class ToolHost {
  private eventSource: EventSource | null = null;
  private baseUrl: string;
  private secret: string;
  private hitMap: Map<string, { path: UDVPath; offStart: number; offEnd: number }> = new Map();

  constructor(baseUrl: string = "https://localhost:3000") {
    this.baseUrl = baseUrl;
    // In a real app, this would come from secure storage or environment
    this.secret = "79e7fbce-0788-4308-9638-d49c2f860cdc";
  }

  async connect() {
    const url = `${this.baseUrl}/agent/stream`;
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener("toolCall", async (event) => {
      const data = JSON.parse(event.data);
      await this.handleToolCall(data);
    });

    this.eventSource.addEventListener("error", (error) => {
      console.error("SSE Error:", error);
      this.reconnect();
    });
  }

  private async reconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), 5000);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private async handleToolCall(call: { id: string; tool: string; payload: any }) {
    try {
      let result: any;
      
      switch (call.tool) {
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
          throw new Error(`Unknown tool: ${call.tool}`);
      }

      await this.sendToolResult(call.id, true, result);
    } catch (error: any) {
      await this.sendToolResult(call.id, false, null, error.message);
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

  private async sendToolResult(id: string, ok: boolean, data?: any, error?: string) {
    const response = await fetch(`${this.baseUrl}/tool-result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.secret}`
      },
      body: JSON.stringify({ id, ok, data, error })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send tool result: ${response.statusText}`);
    }
  }
}

export const toolHost = new ToolHost();