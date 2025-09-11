const express = require("express");
const router = express.Router();
const AgentService = require("../services/agent-service");
const toolResultsStore = require("../services/tool-results-store");

// SSE endpoint for agent streaming
router.post("/stream", async (req, res) => {
  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const { messages, documentContext, tools, mode } = req.body;

  if (!messages || !documentContext) {
    res.write(`data: ${JSON.stringify({ 
      type: "error",
      data: { error: "Missing required fields" }
    })}\n\n`);
    res.end();
    return;
  }

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    res.write(`data: ${JSON.stringify({ 
      type: "error",
      data: { error: "Anthropic API key not configured. Please set ANTHROPIC_API_KEY in backend/.env file" }
    })}\n\n`);
    res.end();
    return;
  }

  const agentService = new AgentService(process.env.ANTHROPIC_API_KEY);

  // Filter tools based on mode if provided
  const filteredTools = agentService.getTools(tools, mode);

  try {
    await agentService.streamAgentResponse({
      messages,
      documentContext,
      tools: filteredTools, // Use filtered tools based on mode
      onToolUse: async (toolUse) => {
        // Send tool use to client for execution
        res.write(`data: ${JSON.stringify({
          type: "tool_use",
          data: {
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input
          }
        })}\n\n`);
        
        // Wait for the frontend to execute the tool and send back the result
        const maxWaitTime = 30000; // 30 seconds max (increased from 10)
        const pollInterval = 100; // Check every 100ms
        let waitedTime = 0;
        
        while (waitedTime < maxWaitTime) {
          if (toolResultsStore.has(toolUse.id)) {
            const result = toolResultsStore.retrieve(toolUse.id);
            console.log(`[Agent] Received tool result for ${toolUse.name}`);
            console.log(`[Agent] Retrieved result:`, JSON.stringify(result, null, 2));
            return result;
          }
          
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          waitedTime += pollInterval;
        }
        
        // Timeout - return a basic result
        console.log(`[Agent] Timeout waiting for tool result ${toolUse.name}`);
        return { 
          success: true, 
          message: `Tool ${toolUse.name} executed (timeout waiting for result)` 
        };
      },
      onContent: (content) => {
        // Send content chunks with type field
        res.write(`data: ${JSON.stringify({
          type: "content",
          data: { content }
        })}\n\n`);
      },
      onError: (error) => {
        console.error("[Agent Route] Error:", error);
        res.write(`data: ${JSON.stringify({
          type: "error",
          data: { error: error.message || "Unknown error occurred" }
        })}\n\n`);
      },
      onComplete: (result) => {
        res.write(`data: ${JSON.stringify({
          type: "complete",
          data: result
        })}\n\n`);
        res.end();
      }
    });
  } catch (error) {
    console.error("Agent route error:", error);
    res.write(`data: ${JSON.stringify({
      type: "error",
      data: { error: error.message || "Agent processing failed" }
    })}\n\n`);
    res.end();
  }
});

// Endpoint to receive tool results from frontend
router.post("/tool-result", (req, res) => {
  const { toolUseId, result } = req.body;
  
  if (!toolUseId) {
    return res.status(400).json({ error: "Missing toolUseId" });
  }
  
  console.log(`[Agent] Storing tool result for ${toolUseId}`);
  
  // Log the raw result
  if (result === null) {
    console.error(`[Agent] Tool result is NULL for ${toolUseId}`);
  } else if (result === undefined) {
    console.error(`[Agent] Tool result is UNDEFINED for ${toolUseId}`);
  } else if (typeof result === 'object') {
    console.log(`[Agent] Tool result content:`, JSON.stringify(result, null, 2));
  } else {
    console.error(`[Agent] Tool result has unexpected type: ${typeof result}`, result);
  }
  
  // Validate the result has expected structure
  if (!result || typeof result !== 'object') {
    console.error(`[Agent] Invalid tool result format - storing empty result`);
    // Store an empty result to prevent timeout
    result = { success: false, error: "Tool result was null or invalid" };
  }
  
  toolResultsStore.store(toolUseId, result);
  
  res.json({ success: true });
});

module.exports = router;