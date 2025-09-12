# Mastra Async Tool Execution Solution

## Problem Analysis

The core issue is that Mastra's tool execution model expects synchronous or immediately-resolving async results. When we have frontend-executed tools that need to:
1. Send a command to the frontend via SSE
2. Wait for the frontend to execute the tool in Word
3. Receive the result back from the frontend
4. Return that result to Mastra

Currently, our tools return placeholder data immediately, causing the agent to work with empty or fake data.

## Fundamental Solution: Tool Result Bridging Pattern

Based on the Mastra documentation about tool streaming and the `writer` parameter, here's the proper solution:

### 1. Use Mastra's Writer for Bi-directional Communication

Mastra provides a `writer` parameter in the tool's execute function that allows streaming partial results. We can leverage this for async communication:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { EventEmitter } from "events";

// Global event emitter for tool result bridging
export const toolResultBridge = new EventEmitter();

export const createFrontendTool = (config: {
  id: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
}) => {
  return createTool({
    ...config,
    execute: async (input, { toolCallId, writer }) => {
      // Create a promise that will resolve when frontend sends result
      const resultPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          toolResultBridge.off(toolCallId, handler);
          reject(new Error(`Frontend tool timeout: ${config.id}`));
        }, 30000);

        const handler = (result: any) => {
          clearTimeout(timeout);
          resolve(result);
        };

        // Listen for result from frontend
        toolResultBridge.once(toolCallId, handler);
      });

      // Send status update to stream
      if (writer) {
        await writer.write({
          type: "tool-status",
          status: "pending",
          message: `Executing ${config.id} on frontend...`
        });
      }

      // Signal frontend to execute tool
      // This will be picked up by the stream handler
      process.nextTick(() => {
        toolResultBridge.emit('execute-frontend-tool', {
          toolCallId,
          toolName: config.id,
          args: input
        });
      });

      // Wait for actual result from frontend
      const result = await resultPromise;

      // Send completion status
      if (writer) {
        await writer.write({
          type: "tool-status",
          status: "complete",
          message: `${config.id} completed`
        });
      }

      return result;
    }
  });
};
```

### 2. Update Stream Handler to Bridge Results

```typescript
// streamHandler.ts
import { toolResultBridge } from './tools/toolBridge';

export class MastraStreamHandler {
  constructor(agent: Agent, res: Response) {
    this.agent = agent;
    this.res = res;
    
    // Listen for frontend tool execution requests
    toolResultBridge.on('execute-frontend-tool', (data) => {
      // Send to frontend via SSE
      this.res.write(`data: ${JSON.stringify({
        type: 'tool_use',
        data: {
          id: data.toolCallId,
          name: data.toolName,
          args: data.args
        }
      })}\n\n`);
    });
  }

  // Called when frontend sends result back
  handleToolResult(toolCallId: string, result: any) {
    // Bridge the result back to the waiting tool
    toolResultBridge.emit(toolCallId, result);
  }
}
```

### 3. Refactor Frontend Passthrough Tools

```typescript
// frontendPassthrough.ts
import { createFrontendTool } from './toolBridge';
import { z } from 'zod';

export const frontendPassthroughTools = {
  "doc.snapshot": createFrontendTool({
    id: "doc.snapshot",
    description: "Get document snapshot",
    inputSchema: z.object({
      dummy: z.string().optional()
    }),
    outputSchema: z.object({
      version: z.string(),
      blocks: z.array(z.any()),
      meta: z.object({
        documentTitle: z.string().optional(),
        createdAt: z.string(),
        blockCount: z.number()
      })
    })
  }),
  
  "doc.search": createFrontendTool({
    id: "doc.search",
    description: "Search the document",
    inputSchema: z.object({
      query: z.string(),
      mode: z.enum(["literal", "regex"]).default("literal"),
      maxHits: z.number().default(40)
    }),
    outputSchema: z.object({
      hits: z.array(z.any()).optional(),
      totalHits: z.number(),
      summary: z.string().optional()
    })
  }),
  
  // ... other tools
};
```

### 4. Fix Text Delta Streaming Issue

The text delta issue appears to be related to the chunk structure. Based on the logs, we need to check multiple possible locations:

```typescript
// streamHandler.ts - in the stream() method
if (chunk.type === "text-delta") {
  // The actual text might be in different locations based on Mastra version
  const textDelta = 
    chunk.payload?.textDelta ||
    chunk.payload?.delta ||
    chunk.textDelta ||
    chunk.delta ||
    chunk.content ||
    "";
    
  if (textDelta) {
    accumulatedText += textDelta;
    this.res.write(`data: ${JSON.stringify({
      type: "content",
      data: { text: textDelta }
    })}\n\n`);
  }
}
```

### 5. Update Frontend to Handle Tool Results Properly

```typescript
// AgentService.ts - in streamAgent method
if (message.type === 'tool_use') {
  const toolResult = await this.executeToolAndGetResult(message.data);
  
  // Send result back to backend
  await fetch(`${this.baseUrl}/api/agent/tool-result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    },
    body: JSON.stringify({
      sessionId: options.sessionId,
      toolCallId: message.data.id,
      result: toolResult
    })
  });
}
```

## Implementation Steps

1. **Create Tool Bridge Module** (`backend/src/mastra/tools/toolBridge.ts`)
   - Implement `createFrontendTool` helper
   - Set up EventEmitter for result bridging

2. **Refactor All Frontend Tools** 
   - Use the new `createFrontendTool` pattern
   - Remove placeholder returns

3. **Update Stream Handler**
   - Listen for tool execution events
   - Bridge results back to waiting tools

4. **Fix Text Delta Extraction**
   - Check all possible chunk structures
   - Log actual chunk structure for debugging

5. **Test End-to-End Flow**
   - Verify tools wait for real results
   - Ensure text streaming works
   - Confirm no timeouts occur

## Alternative Solutions Considered

1. **Polling Pattern**: Have tools poll for results - rejected due to inefficiency
2. **WebSocket**: Replace SSE with WebSocket - too much refactoring
3. **Synchronous HTTP Calls**: Block until frontend responds - would timeout
4. **Fake Data with Retry**: Let agent retry with real data - confusing UX

## Benefits of This Solution

- **Truly async**: Tools wait for real frontend results
- **Uses Mastra patterns**: Leverages the `writer` for status updates
- **Minimal refactoring**: Mostly changes to tool definitions
- **Maintains streaming**: Doesn't break the SSE flow
- **Proper error handling**: Timeouts and failures are handled gracefully

## Next Steps

1. Implement the tool bridge pattern
2. Test with a single tool first (e.g., `doc.snapshot`)
3. If successful, migrate all frontend tools
4. Fix the text-delta streaming issue
5. Clean up and remove workarounds