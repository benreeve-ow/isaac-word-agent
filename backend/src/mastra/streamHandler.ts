/**
 * Stream handler for Mastra agent with frontend tool execution
 * This handles the complex interaction between Mastra streaming and frontend tool execution
 */

import { Agent } from "@mastra/core/agent";
import { Response } from "express";
import { traceLogger } from "../services/traceLogger";

interface PendingToolCall {
  toolCallId: string;
  toolName: string;
  args: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

export class MastraStreamHandler {
  private pendingToolCalls = new Map<string, PendingToolCall>();
  private res: Response;
  private agent: Agent;
  
  constructor(agent: Agent, res: Response) {
    this.agent = agent;
    this.res = res;
  }
  
  /**
   * Handle incoming tool results from the frontend
   */
  handleToolResult(toolCallId: string, result: any) {
    console.log(`[StreamHandler] Received tool result for ${toolCallId}:`, result);
    
    const pending = this.pendingToolCalls.get(toolCallId);
    if (pending) {
      if (result.error) {
        pending.reject(new Error(result.message || "Tool execution failed"));
      } else {
        pending.resolve(result.data || result);
      }
      this.pendingToolCalls.delete(toolCallId);
    }
  }
  
  /**
   * Stream agent responses with frontend tool handling
   */
  async stream(messages: any[], options: any = {}) {
    try {
      // Start streaming from Mastra
      const modelOutput = await this.agent.streamVNext(messages, {
        maxSteps: options.maxSteps || 10
      });
      
      // Send initial processing message
      this.res.write(`data: ${JSON.stringify({ 
        type: "content",
        data: { text: "" }
      })}\n\n`);
      
      const fullStream = modelOutput.fullStream;
      let accumulatedText = "";
      
      for await (const chunk of fullStream) {
        traceLogger.logStreamChunk(chunk);
        
        // Log the full chunk structure for debugging
        if (chunk.type === "text-delta") {
          console.log("[Text Delta Chunk] Full structure:", JSON.stringify(chunk, null, 2));
          
          // Try multiple possible locations for text content
          const textDelta = (chunk as any).payload?.textDelta || 
                            (chunk as any).payload?.text || 
                            (chunk as any).textDelta || 
                            (chunk as any).text || 
                            (chunk as any).delta || "";
                            
          accumulatedText += textDelta;
          console.log(`[Text Delta] Content: "${textDelta}"`);
          
          // Send text to frontend
          this.res.write(`data: ${JSON.stringify({ 
            type: "content",
            data: { text: textDelta }
          })}\n\n`);
          
        } else if (chunk.type === "tool-call") {
          const payload = (chunk as any).payload;
          console.log("[StreamHandler] Tool call from Mastra:", {
            toolName: payload?.toolName,
            args: payload?.args,
            toolCallId: payload?.toolCallId
          });
          
          // Keep tool name as-is (frontend's ToolRegistry now handles both formats)
          const frontendToolName = payload?.toolName;
          
          // Send tool call to frontend for execution
          this.res.write(`data: ${JSON.stringify({ 
            type: "tool_use",
            data: {
              id: payload?.toolCallId,
              name: frontendToolName,
              args: payload?.args ?? {}
            }
          })}\n\n`);
          
          // For frontend-executed tools, we need to wait for the result
          // The frontend will send the result back via the /api/agent/tool-result endpoint
          // which will call handleToolResult above
          
        } else if (chunk.type === "tool-result") {
          const payload = (chunk as any).payload;
          console.log("Tool result in stream:", payload);
          traceLogger.logToolResult(payload?.toolName, payload?.result, payload?.toolCallId);
        }
      }
      
      // Log final accumulated text
      console.log(`[Final Text] Total accumulated: ${accumulatedText.length} chars`);
      if (accumulatedText) {
        console.log(`[Final Text Content] ${accumulatedText.substring(0, 500)}...`);
      }
      
      // Send completion
      this.res.write(`data: ${JSON.stringify({ 
        type: "done",
        data: {}
      })}\n\n`);
      
      traceLogger.logResponse({ 
        type: 'stream_complete', 
        accumulatedText, 
        sessionId: options.sessionId 
      });
      
    } catch (error: any) {
      console.error("Stream error:", error);
      traceLogger.logError(error, 'stream_error');
      this.res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      this.res.end();
    }
  }
}

// Global map to track stream handlers by session
export const streamHandlers = new Map<string, MastraStreamHandler>();