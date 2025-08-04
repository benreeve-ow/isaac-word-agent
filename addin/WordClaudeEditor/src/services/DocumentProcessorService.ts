/**
 * Unified document processor service for all modes
 */

import { ProcessConfig, DocumentProcessorMode } from "../modes/types";
import { ModeRegistry } from "../modes/ModeRegistry";
import { ToolRegistry } from "../tools/core/ToolRegistry";
import { agentService } from "./AgentService";
import { wordService } from "./WordService";

export class DocumentProcessorService {
  private static instance: DocumentProcessorService;
  private modeRegistry: ModeRegistry;
  private toolRegistry: ToolRegistry;
  private abortController: AbortController | null = null;

  private constructor() {
    this.modeRegistry = ModeRegistry.getInstance();
    this.toolRegistry = ToolRegistry.getInstance();
  }

  static getInstance(): DocumentProcessorService {
    if (!DocumentProcessorService.instance) {
      DocumentProcessorService.instance = new DocumentProcessorService();
    }
    return DocumentProcessorService.instance;
  }

  /**
   * Process a document operation based on mode
   */
  async process(config: ProcessConfig): Promise<void> {
    const { mode: modeId, messages, documentContext, outputFormat } = config;

    // Get mode configuration
    const mode = this.modeRegistry.getMode(modeId);
    if (!mode) {
      throw new Error(`Unknown mode: ${modeId}`);
    }

    // Validate requirements
    if (mode.requiresSelection) {
      const hasSelection = await this.checkSelection();
      if (!hasSelection) {
        throw new Error("This mode requires text to be selected in the document");
      }
    }

    // Get tools for this mode
    const tools = this.getToolsForMode(mode);

    // Build system prompt
    const systemPrompt = this.modeRegistry.buildSystemPrompt(
      modeId,
      this.getBaseSystemPrompt(),
      documentContext
    );

    // Process based on output type
    if (mode.outputConfig.type === "stream") {
      await this.processStream(
        messages,
        systemPrompt,
        tools,
        mode,
        outputFormat || mode.outputConfig.format,
        config
      );
    } else {
      await this.processBatch(
        messages,
        systemPrompt,
        tools,
        mode,
        config
      );
    }
  }

  /**
   * Stream processing for modes like Agent and Review
   */
  private async processStream(
    messages: any[],
    _systemPrompt: string,
    tools: any[],
    mode: DocumentProcessorMode,
    outputFormat: "ui" | "document" | "both",
    config: ProcessConfig
  ): Promise<void> {
    // Note: _systemPrompt will be used when we integrate with the backend
    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      // Enable track changes if required
      if (mode.enableTrackChanges) {
        await wordService.setTrackChanges(true);
      }

      // Stream with tools
      await agentService.streamAgent(
        messages,
        config.documentContext,
        tools,
        (toolUse) => {
          // Handle tool use callback
          if (config.onToolUse) {
            config.onToolUse(toolUse);
          }

          // For Review mode with document output, handle comments specially
          if (mode.id === "review" && 
              outputFormat !== "ui" && 
              toolUse.name === "add_comment") {
            // Comment will be added directly to document
            console.log("[DocumentProcessor] Comment added to document");
          }
        },
        (content) => {
          // Handle content streaming
          if (config.onContent) {
            config.onContent(content);
          }
        },
        () => {
          // Handle completion
          if (config.onComplete) {
            config.onComplete();
          }
        },
        (error) => {
          // Handle error
          if (config.onError) {
            config.onError(error);
          }
        },
        this.abortController.signal,
        mode.maxIterations
      );
    } catch (error) {
      console.error("[DocumentProcessor] Stream processing error:", error);
      if (config.onError) {
        config.onError(error as Error);
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Batch processing for modes like Edit
   */
  private async processBatch(
    messages: any[],
    _systemPrompt: string,
    tools: any[],
    mode: DocumentProcessorMode,
    config: ProcessConfig
  ): Promise<void> {
    // Note: _systemPrompt will be used when we integrate with the backend
    try {
      // Enable track changes if required
      if (mode.enableTrackChanges) {
        await wordService.setTrackChanges(true);
      }

      // For edit mode, process synchronously
      const response = await agentService.processWithTools(
        messages,
        _systemPrompt,
        tools,
        config.documentContext,
        mode.maxIterations
      );

      // Apply the edits
      if (response.toolUses && response.toolUses.length > 0) {
        for (const toolUse of response.toolUses) {
          if (config.onToolUse) {
            config.onToolUse(toolUse);
          }
        }
      }

      // Send final content
      if (response.content && config.onContent) {
        config.onContent(response.content);
      }

      if (config.onComplete) {
        config.onComplete();
      }
    } catch (error) {
      console.error("[DocumentProcessor] Batch processing error:", error);
      if (config.onError) {
        config.onError(error as Error);
      }
    }
  }

  /**
   * Cancel ongoing processing
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Get tools allowed for a specific mode
   */
  private getToolsForMode(mode: DocumentProcessorMode): any[] {
    const allTools = this.toolRegistry.getToolDefinitions();
    return this.modeRegistry.getToolsForMode(mode.id, allTools);
  }

  /**
   * Check if text is selected in the document
   */
  private async checkSelection(): Promise<boolean> {
    try {
      const selection = await wordService.getSelectedText();
      return selection && selection.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get base system prompt
   */
  private getBaseSystemPrompt(): string {
    return `You are an AI assistant helping to edit and review Microsoft Word documents.
You have access to various tools to search, edit, format, and analyze the document.
Always be precise and careful with your edits, preserving the document's formatting and structure.`;
  }

  /**
   * Get available modes
   */
  getAvailableModes(): DocumentProcessorMode[] {
    return this.modeRegistry.getAllModes();
  }

  /**
   * Get a specific mode configuration
   */
  getMode(id: string): DocumentProcessorMode | undefined {
    return this.modeRegistry.getMode(id);
  }
}

export const documentProcessor = DocumentProcessorService.getInstance();