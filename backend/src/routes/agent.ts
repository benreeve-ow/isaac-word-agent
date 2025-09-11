import { Router, Request, Response } from "express";
import { wordAgent } from "../mastra/agent.word";
import { toolBus } from "../bridge/toolBus";
import { countTokens } from "../services/tokenCount";
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
  
  if (!messages || messages.length === 0) {
    res.write(`data: ${JSON.stringify({ 
      type: "error",
      data: { error: "No messages provided" }
    })}\n\n`);
    res.end();
    return;
  }
  
  try {
    // Listen for tool calls from Mastra
    const toolCallHandler = (call: any) => {
      // Send tool_use events like the legacy system expects
      res.write(`data: ${JSON.stringify({ 
        type: "tool_use",
        data: call
      })}\n\n`);
    };
    
    toolBus.on("call", toolCallHandler);
    
    // Stream agent response with full message context
    const stream = await wordAgent.stream(messages);
    
    // Send initial processing message
    res.write(`data: ${JSON.stringify({ 
      type: "content",
      data: { text: "" }
    })}\n\n`);
    
    // Access the text stream from the result
    const textStream = stream.textStream;
    let fullText = "";
    
    for await (const chunk of textStream) {
      fullText += chunk;
      // Send content updates like legacy system
      res.write(`data: ${JSON.stringify({ 
        type: "content",
        data: { text: fullText }
      })}\n\n`);
    }
    
    // Clean up
    toolBus.off("call", toolCallHandler);
    
    // Send completion
    res.write(`data: ${JSON.stringify({ 
      type: "done",
      data: {}
    })}\n\n`);
    res.end();
    
  } catch (error: any) {
    console.error("Stream error:", error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Endpoint to receive tool results from frontend
router.post("/tool-result", checkAuth, async (req: Request, res: Response) => {
  const { toolUseId, result } = req.body;
  
  if (!toolUseId) {
    return res.status(400).json({ error: "Missing toolUseId" });
  }
  
  // Send result back through the tool bus
  toolBus.onResult({
    id: toolUseId,
    ok: !result.error,
    data: result.output,
    error: result.error
  });
  
  res.json({ success: true });
});

export default router;