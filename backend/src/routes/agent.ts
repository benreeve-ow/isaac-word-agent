import { Router, Request, Response } from "express";
import { wordAgent } from "../mastra/agent.word";
import { MastraStreamHandler, streamHandlers } from "../mastra/streamHandler";
import { countTokens } from "../services/tokenCount";
import { traceLogger } from "../services/traceLogger";
import { z } from "zod";

const router = Router();

// Middleware to check auth
const checkAuth = (req: Request, res: Response, next: any) => {
  const secret = process.env.TOOL_BRIDGE_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  next();
};

// Single-shot agent call
router.post("/run", checkAuth, async (req: Request, res: Response) => {
  try {
    const { messages, documentContext } = req.body;
    
    // Preflight token check
    const tokenCount = await countTokens({ messages });
    const budget = Number(process.env.CONTEXT_INPUT_BUDGET_TOKENS ?? 160000);
    
    if (tokenCount > budget) {
      return res.status(400).json({ 
        error: "Context too large", 
        tokens: tokenCount, 
        budget 
      });
    }
    
    // Run agent - Mastra expects messages as first parameter
    const result = await wordAgent.generate(messages, {
      context: documentContext
    });
    
    res.json(result);
  } catch (error: any) {
    console.error("Agent run error:", error);
    res.status(500).json({ error: error.message });
  }
});

// SSE streaming endpoint - accepts POST like the legacy system
router.post("/stream", checkAuth, async (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  
  // Get data from request body
  const { messages, documentContext, tools, mode } = req.body;
  
  // Start a new trace session
  const sessionId = `stream-${Date.now()}`;
  const traceFile = traceLogger.startSession(sessionId);
  console.log(`📝 Tracing session to: ${traceFile}`);
  
  // Log the incoming request
  traceLogger.logRequest(messages, { documentContext, tools, mode });
  
  if (!messages || messages.length === 0) {
    res.write(`data: ${JSON.stringify({ 
      type: "error",
      data: { error: "No messages provided" }
    })}\n\n`);
    res.end();
    return;
  }
  
  try {
    // Send sessionId to frontend first
    res.write(`data: ${JSON.stringify({ 
      type: "session",
      data: { sessionId }
    })}\n\n`);
    
    // Create a stream handler for this session
    const streamHandler = new MastraStreamHandler(wordAgent, res);
    
    // Store it globally so tool-result endpoint can find it
    streamHandlers.set(sessionId, streamHandler);
    
    // Stream the agent response with frontend tool handling
    await streamHandler.stream(messages, {
      maxSteps: 10,
      sessionId
    });
    
    // Clean up the handler
    streamHandlers.delete(sessionId);
    
  } catch (error: any) {
    console.error("Stream error:", error);
    traceLogger.logError(error, 'stream_error');
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Endpoint to receive tool results from frontend
router.post("/tool-result", checkAuth, async (req: Request, res: Response) => {
  const { toolUseId, result, sessionId } = req.body;
  
  if (!toolUseId) {
    return res.status(400).json({ error: "Missing toolUseId" });
  }
  
  // Find the stream handler for this session
  const streamHandler = streamHandlers.get(sessionId);
  if (streamHandler) {
    // Send result to the stream handler
    streamHandler.handleToolResult(toolUseId, result);
  } else {
    console.warn(`No stream handler found for session ${sessionId}`);
  }
  
  res.json({ success: true });
});

export default router;