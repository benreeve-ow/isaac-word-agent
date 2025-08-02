const express = require("express");
const router = express.Router();
const AgentService = require("../services/agent-service");

// SSE endpoint for agent streaming
router.post("/agent/stream", async (req, res) => {
  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const { messages, documentContext } = req.body;

  if (!messages || !documentContext) {
    res.write(`event: error\ndata: ${JSON.stringify({ 
      error: "Missing required fields" 
    })}\n\n`);
    res.end();
    return;
  }

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    res.write(`event: error\ndata: ${JSON.stringify({ 
      error: "Anthropic API key not configured. Please set ANTHROPIC_API_KEY in backend/.env file" 
    })}\n\n`);
    res.end();
    return;
  }

  const agentService = new AgentService(process.env.ANTHROPIC_API_KEY);

  try {
    await agentService.streamAgentResponse({
      messages,
      documentContext,
      onToolUse: async (toolUse) => {
        // Send tool use to client
        res.write(`event: tool_use\ndata: ${JSON.stringify({
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input
        })}\n\n`);
        
        // Return a placeholder result - the actual execution happens on the client
        return { success: true, message: "Tool executed on client" };
      },
      onContent: (content) => {
        // Send content chunks
        res.write(`event: content\ndata: ${JSON.stringify({
          content
        })}\n\n`);
      },
      onError: (error) => {
        console.error("[Agent Route] Error:", error);
        res.write(`event: error\ndata: ${JSON.stringify({
          error: error.message || "Unknown error occurred"
        })}\n\n`);
      },
      onComplete: (result) => {
        res.write(`event: complete\ndata: ${JSON.stringify(result)}\n\n`);
        res.end();
      }
    });
  } catch (error) {
    console.error("Agent route error:", error);
    res.write(`event: error\ndata: ${JSON.stringify({
      error: error.message || "Agent processing failed"
    })}\n\n`);
    res.end();
  }
});

module.exports = router;