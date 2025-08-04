/**
 * Type definitions for document processor modes
 */

export interface DocumentProcessorMode {
  id: string;
  name: string;
  description: string;
  icon?: string;
  allowedTools: string[] | "*";
  systemPrompt?: string;
  userPromptConfig: {
    label: string;
    placeholder: string;
    type: "task" | "persona" | "mixed";
    rows?: number;
  };
  outputConfig: {
    type: "stream" | "batch";
    format: "ui" | "document" | "both";
    allowUserSelection?: boolean;
  };
  maxIterations?: number;
  requiresSelection?: boolean;
  enableTrackChanges?: boolean;
}

export interface ProcessConfig {
  mode: string;
  messages: any[];
  documentContext: any;
  outputFormat?: "ui" | "document" | "both";
  customTools?: any[];
  onToolUse?: (tool: any) => void;
  onContent?: (content: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export type ModeId = "agent" | "review" | "edit";