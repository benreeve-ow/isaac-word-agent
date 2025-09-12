/**
 * Stream handler for Mastra agent with frontend tool execution
 * This handles the complex interaction between Mastra streaming and frontend tool execution
 */

import { Agent } from "@mastra/core/agent";
import { Response } from "express";
import { traceLogger } from "../services/traceLogger";
import { toolResultBridge } from "./tools/toolBridge";

export class MastraStreamHandler {
  private res: Response;
  private agent: Agent;
  private sessionId: string;
  
  constructor(agent: Agent, res: Response, sessionId?: string) {
    this.agent = agent;
    this.res = res;
    this.sessionId = sessionId || `session-${Date.now()}`;
    
    // Listen for frontend tool execution requests from the tool bridge
    const executeHandler = (data: any) => {
      console.log(`[StreamHandler] Sending tool to frontend: ${data.toolName} (${data.toolCallId})`);
      // Send to frontend via SSE
      this.res.write(`data: ${JSON.stringify({
        type: 'tool_use',
        data: {
          id: data.toolCallId,
          name: data.toolName,
          args: data.args
        }
      })}\n\n`);
    };
    
    // Register the handler
    toolResultBridge.on('execute-frontend-tool', executeHandler);
    
    // Clean up when response ends
    this.res.on('close', () => {
      toolResultBridge.off('execute-frontend-tool', executeHandler);
      streamHandlers.delete(this.sessionId);
    });
  }
  
  /**
   * Handle incoming tool results from the frontend
   */
  handleToolResult(toolCallId: string, result: any) {
    console.log(`[StreamHandler] Received tool result for ${toolCallId}:`, result);
    
    // Bridge the result back to the waiting tool via the event emitter
    toolResultBridge.emit(toolCallId, result);
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
          // Try multiple possible locations for text content based on Mastra's structure
          const textDelta = (chunk as any).payload?.textDelta || 
                            (chunk as any).payload?.delta || 
                            (chunk as any).payload?.text || 
                            (chunk as any).textDelta || 
                            (chunk as any).delta || 
                            (chunk as any).text || 
                            (chunk as any).content || "";
                            
          if (textDelta) {
            accumulatedText += textDelta;
            console.log(`[Text Delta] Streaming text: "${textDelta.substring(0, 100)}..."`);
            
            // Send text to frontend
            this.res.write(`data: ${JSON.stringify({ 
              type: "content",
              data: { text: textDelta }
            })}\n\n`);
          } else {
            // Log for debugging if we're missing text
            console.log("[Text Delta] Chunk structure (no text found):", JSON.stringify(chunk, null, 2));
          }
          
        } else if (chunk.type === "tool-call") {
          const payload = (chunk as any).payload;
          console.log("[StreamHandler] Tool call from Mastra:", {
            toolName: payload?.toolName,
            args: payload?.args,
            toolCallId: payload?.toolCallId
          });
          
          // The tool bridge will handle sending this to the frontend if needed
          // Backend-only tools (like plan.add) will execute immediately
          // Frontend tools will be handled by the bridge pattern
          console.log(`[StreamHandler] Tool call detected: ${payload?.toolName}`);
          
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
      
      // Send completion (frontend expects "complete" not "done")
      this.res.write(`data: ${JSON.stringify({ 
        type: "complete",
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

// Helper to get or create a stream handler
export function getStreamHandler(sessionId: string, agent?: Agent, res?: Response): MastraStreamHandler | undefined {
  if (!streamHandlers.has(sessionId) && agent && res) {
    const handler = new MastraStreamHandler(agent, res, sessionId);
    streamHandlers.set(sessionId, handler);
    return handler;
  }
  return streamHandlers.get(sessionId);
}