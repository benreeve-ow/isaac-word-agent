/**
 * Tool Bridge for handling async frontend tool execution
 * This module provides a pattern for tools that need to wait for frontend results
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { EventEmitter } from "events";

// Global event emitter for tool result bridging
export const toolResultBridge = new EventEmitter();

// Track pending tool calls for debugging
const pendingCalls = new Map<string, { toolName: string; startTime: number }>();

// Helper to create frontend-executed tools that wait for results
export const createFrontendTool = (config: {
  id: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
}) => {
  return createTool({
    id: config.id,
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    execute: async (input, context) => {
      // Mastra passes input and context differently
      // The actual args are in input.context, not input directly
      const actualArgs = input?.context || input;
      
      // Extract toolCallId from context - Mastra passes this
      const toolCallId = (context as any)?.toolCallId || (input as any)?.toolCallId || `${config.id}-${Date.now()}`;
      const writer = (context as any)?.writer || (input as any)?.writer;
      
      console.log(`[ToolBridge] Executing frontend tool: ${config.id} with callId: ${toolCallId}`);
      
      // Track this pending call
      pendingCalls.set(toolCallId, {
        toolName: config.id,
        startTime: Date.now()
      });

      // Create a promise that will resolve when frontend sends result
      const resultPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingCalls.delete(toolCallId);
          toolResultBridge.off(toolCallId, handler);
          console.error(`[ToolBridge] Timeout for tool: ${config.id}, callId: ${toolCallId}`);
          reject(new Error(`Frontend tool timeout: ${config.id}`));
        }, 30000); // 30 second timeout

        const handler = (result: any) => {
          clearTimeout(timeout);
          pendingCalls.delete(toolCallId);
          const elapsed = Date.now() - (pendingCalls.get(toolCallId)?.startTime || Date.now());
          console.log(`[ToolBridge] Received result for ${config.id} after ${elapsed}ms`);
          
          // Check if result is an error
          if (result?.error) {
            reject(new Error(result.message || `Frontend tool failed: ${config.id}`));
          } else {
            resolve(result?.data || result);
          }
        };

        // Listen for result from frontend
        toolResultBridge.once(toolCallId, handler);
      });

      // Send status update to stream if writer is available
      if (writer) {
        try {
          await writer.write({
            type: "tool-status",
            status: "pending",
            message: `Executing ${config.id} on frontend...`
          });
        } catch (e) {
          console.log(`[ToolBridge] Writer not available for status update`);
        }
      }

      // Signal frontend to execute tool
      // This will be picked up by the stream handler
      process.nextTick(() => {
        console.log(`[ToolBridge] Emitting execute-frontend-tool for ${config.id}`);
        toolResultBridge.emit('execute-frontend-tool', {
          toolCallId,
          toolName: config.id,
          args: actualArgs  // Use the cleaned args, not the full input
        });
      });

      try {
        // Wait for actual result from frontend
        const result = await resultPromise;
        
        // Send completion status if writer is available
        if (writer) {
          try {
            await writer.write({
              type: "tool-status",
              status: "complete",
              message: `${config.id} completed successfully`
            });
          } catch (e) {
            console.log(`[ToolBridge] Writer not available for completion status`);
          }
        }

        console.log(`[ToolBridge] Tool ${config.id} completed successfully`);
        return result;
        
      } catch (error) {
        console.error(`[ToolBridge] Tool ${config.id} failed:`, error);
        
        // Send error status if writer is available
        if (writer) {
          try {
            await writer.write({
              type: "tool-status",
              status: "error",
              message: `${config.id} failed: ${(error as Error).message}`
            });
          } catch (e) {
            console.log(`[ToolBridge] Writer not available for error status`);
          }
        }
        
        throw error;
      }
    }
  });
};

// Debug helper to list pending tool calls
export const getPendingToolCalls = () => {
  const now = Date.now();
  return Array.from(pendingCalls.entries()).map(([id, info]) => ({
    toolCallId: id,
    toolName: info.toolName,
    waitingFor: `${Math.round((now - info.startTime) / 1000)}s`
  }));
};

// Clean up old pending calls (called periodically)
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 1 minute
  
  for (const [id, info] of pendingCalls.entries()) {
    if (now - info.startTime > timeout) {
      console.log(`[ToolBridge] Cleaning up stale tool call: ${id} (${info.toolName})`);
      pendingCalls.delete(id);
      toolResultBridge.emit(id, {
        error: true,
        message: 'Tool call cleaned up due to timeout'
      });
    }
  }
}, 30000); // Check every 30 seconds