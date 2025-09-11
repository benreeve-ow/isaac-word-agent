import { Router, Request, Response } from "express";
import { toolBus } from "../bridge/toolBus";
import { ToolResult } from "../bridge/schema";

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

// Receive tool results from the add-in
router.post("/tool-result", checkAuth, async (req: Request, res: Response) => {
  try {
    const result = ToolResult.parse(req.body);
    toolBus.onResult(result);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Tool result error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;