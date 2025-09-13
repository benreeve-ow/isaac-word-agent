/**
 * Stream handler for Mastra agent with frontend tool execution
 * This handles the complex interaction between Mastra streaming and frontend tool execution
 */

import { Agent } from "@mastra/core/agent";
import { Response } from "express";
import { traceLogger } from "../services/traceLogger";
import { toolResultBridge } from "./tools/toolBridge";
import { countStringTokens, formatTokenCount, calculateTokenStats } from "../services/tokenCount";
import { tokenMetrics } from "../services/tokenMetrics";

export class MastraStreamHandler {
  private res: Response;
  private agent: Agent;
  private sessionId: string;
  private tokenUsage: {
    input: number;
    output: number;
    toolCalls: number;
    toolResponses: number;
  } = { input: 0, output: 0, toolCalls: 0, toolResponses: 0 };
  
  constructor(agent: Agent, res: Response, sessionId?: string) {
    this.agent = agent;
    this.res = res;
    this.sessionId = sessionId || `session-${Date.now()}`;
    
    // Start tracking this session
    tokenMetrics.startSession(this.sessionId);
    
    // Listen for frontend tool execution requests from the tool bridge
    const executeHandler = (data: any) => {
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
    // Track token usage for tool responses
    const resultString = JSON.stringify(result);
    const tokens = countStringTokens(resultString);
    this.tokenUsage.toolResponses += tokens;
    
    // Record in metrics
    tokenMetrics.recordOperation(this.sessionId, {
      operationType: 'tool_response',
      toolName: result.toolName || 'unknown',
      inputTokens: 0,
      outputTokens: tokens,
      success: result.success !== false
    });
    
    if (process.env.DEBUG) {
      console.log(`[Token Usage] Tool response: ${formatTokenCount(tokens)}`);
    }
    
    // Bridge the result back to the waiting tool via the event emitter
    toolResultBridge.emit(toolCallId, result);
  }
  
  /**
   * Stream agent responses with frontend tool handling
   */
  async stream(messages: any[], options: any = {}) {
    try {
      // Track input token usage
      const inputTokens = messages.reduce((sum, msg) => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return sum + countStringTokens(content);
      }, 0);
      this.tokenUsage.input = inputTokens;
      
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
            
            // Send text to frontend
            this.res.write(`data: ${JSON.stringify({ 
              type: "content",
              data: { text: textDelta }
            })}\n\n`);
          }
          
        } else if (chunk.type === "tool-call") {
          // Track token usage for tool calls
          const toolCall = (chunk as any).payload;
          if (toolCall) {
            const tokens = countStringTokens(JSON.stringify(toolCall));
            this.tokenUsage.toolCalls += tokens;
            
            // Record tool call metrics
            tokenMetrics.recordOperation(this.sessionId, {
              operationType: 'tool_call',
              toolName: toolCall.toolName || toolCall.name || 'unknown',
              inputTokens: tokens,
              outputTokens: 0,
              success: true
            });
          }
          
        } else if (chunk.type === "tool-result") {
          const payload = (chunk as any).payload;
          traceLogger.logToolResult(payload?.toolName, payload?.result, payload?.toolCallId);
        }
      }
      
      // Track output tokens
      this.tokenUsage.output = countStringTokens(accumulatedText);
      
      // Calculate total token usage
      const totalTokens = this.tokenUsage.input + this.tokenUsage.output + 
                         this.tokenUsage.toolCalls + this.tokenUsage.toolResponses;
      
      // Record overall stream operation
      tokenMetrics.recordOperation(this.sessionId, {
        operationType: 'stream_complete',
        inputTokens: this.tokenUsage.input,
        outputTokens: this.tokenUsage.output + this.tokenUsage.toolCalls + this.tokenUsage.toolResponses,
        success: true
      });
      
      // Log token usage summary
      if (process.env.DEBUG || true) { // Always log for now
        console.log(`\n[Token Usage Summary - Session ${this.sessionId}]`);
        console.log(`  Input: ${formatTokenCount(this.tokenUsage.input)}`);
        console.log(`  Output: ${formatTokenCount(this.tokenUsage.output)}`);
        console.log(`  Tool Calls: ${formatTokenCount(this.tokenUsage.toolCalls)}`);
        console.log(`  Tool Responses: ${formatTokenCount(this.tokenUsage.toolResponses)}`);
        console.log(`  Total: ${formatTokenCount(totalTokens)}`);
        console.log(`  Context Used: ${((totalTokens / 160000) * 100).toFixed(1)}%\n`);
      }
      
      // Send completion with token usage
      this.res.write(`data: ${JSON.stringify({ 
        type: "complete",
        data: {
          tokenUsage: {
            input: this.tokenUsage.input,
            output: this.tokenUsage.output,
            toolCalls: this.tokenUsage.toolCalls,
            toolResponses: this.tokenUsage.toolResponses,
            total: totalTokens,
            contextPercentage: ((totalTokens / 160000) * 100).toFixed(1)
          }
        }
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