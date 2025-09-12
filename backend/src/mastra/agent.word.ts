import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { getMemory } from "./memory";
import { planTools } from "./tools/planTool";
import { statusTools } from "./tools/statusTool";
import { frontendPassthroughTools } from "./tools/frontendPassthrough";
import fs from "node:fs";
import path from "node:path";

const sys = fs.readFileSync(path.join(__dirname, "prompts/system.word.txt"), "utf8");

export const wordAgent = new Agent({
  name: "WordAgent",
  instructions: sys,
  model: anthropic(process.env.MODEL ?? "claude-sonnet-4-20250514"),
  memory: getMemory(),
  tools: {
    ...planTools,
    ...statusTools,
    ...frontendPassthroughTools,
  },
  // maxSteps: 8, // Not a valid property for Mastra Agent
});