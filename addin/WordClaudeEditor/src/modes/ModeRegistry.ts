/**
 * Registry for document processor modes
 */

import { DocumentProcessorMode, ModeId } from "./types";

export class ModeRegistry {
  private static instance: ModeRegistry;
  private modes: Map<string, DocumentProcessorMode> = new Map();

  private constructor() {
    this.initializeModes();
  }

  static getInstance(): ModeRegistry {
    if (!ModeRegistry.instance) {
      ModeRegistry.instance = new ModeRegistry();
    }
    return ModeRegistry.instance;
  }

  private initializeModes(): void {
    // Agent Mode - Full autonomous editing
    this.registerMode({
      id: "agent",
      name: "Agent Mode",
      description: "Autonomous document editing with all available tools",
      icon: "🤖",
      allowedTools: "*",
      userPromptConfig: {
        label: "Task",
        placeholder: "Describe what you want the agent to do...",
        type: "task",
        rows: 3
      },
      outputConfig: {
        type: "stream",
        format: "ui"
      },
      maxIterations: 10,
      enableTrackChanges: true
    });

    // Review Mode - Document review with comments
    this.registerMode({
      id: "review",
      name: "Review Mode",
      description: "Review document and provide feedback through comments",
      icon: "📝",
      allowedTools: [
        "search_document",
        "analyze_structure",
        "read_full_document",
        "add_comment",
        "get_comments"
      ],
      systemPrompt: `You are a professional document reviewer. Your role is to:
1. Carefully review the document for issues, improvements, and suggestions
2. Provide constructive, actionable feedback
3. Use comments to highlight specific areas that need attention
4. Consider clarity, accuracy, completeness, and overall quality
5. Be thorough but respectful in your critique`,
      userPromptConfig: {
        label: "Review Instructions & Persona",
        placeholder: "e.g., 'Act as a technical editor focusing on clarity and accuracy...' or 'Review for regulatory compliance focusing on...'",
        type: "persona",
        rows: 5
      },
      outputConfig: {
        type: "stream",
        format: "both",
        allowUserSelection: true
      },
      maxIterations: 15,
      enableTrackChanges: false
    });

    // Edit Mode - Direct text editing
    this.registerMode({
      id: "edit",
      name: "Edit Selection",
      description: "Edit selected text with AI assistance",
      icon: "✏️",
      allowedTools: [
        "search_document",
        "edit_content",
        "apply_formatting",
        "apply_style"
      ],
      userPromptConfig: {
        label: "Edit Instructions",
        placeholder: "How should the selected text be modified?",
        type: "task",
        rows: 2
      },
      outputConfig: {
        type: "batch",
        format: "document"
      },
      requiresSelection: true,
      maxIterations: 3,
      enableTrackChanges: true
    });
  }

  registerMode(mode: DocumentProcessorMode): void {
    this.modes.set(mode.id, mode);
    console.log(`[ModeRegistry] Registered mode: ${mode.name}`);
  }

  getMode(id: string): DocumentProcessorMode | undefined {
    return this.modes.get(id);
  }

  getAllModes(): DocumentProcessorMode[] {
    return Array.from(this.modes.values());
  }

  getModeIds(): string[] {
    return Array.from(this.modes.keys());
  }

  hasMode(id: string): boolean {
    return this.modes.has(id);
  }

  /**
   * Get filtered tool definitions based on mode
   */
  getToolsForMode(modeId: string, allTools: any[]): any[] {
    const mode = this.getMode(modeId);
    if (!mode) {
      console.warn(`[ModeRegistry] Mode ${modeId} not found, returning all tools`);
      return allTools;
    }

    if (mode.allowedTools === "*") {
      return allTools;
    }

    return allTools.filter(tool => 
      mode.allowedTools.includes(tool.name)
    );
  }

  /**
   * Build system prompt for a mode
   */
  buildSystemPrompt(modeId: string, basePrompt: string, context?: any): string {
    const mode = this.getMode(modeId);
    if (!mode) {
      return basePrompt;
    }

    let prompt = mode.systemPrompt || basePrompt;

    // Add mode-specific context
    if (context) {
      prompt += `\n\nDocument Context:\n${JSON.stringify(context, null, 2)}`;
    }

    // Add mode-specific instructions
    if (mode.requiresSelection) {
      prompt += "\n\nNote: Focus on the selected text and its immediate context.";
    }

    if (mode.enableTrackChanges) {
      prompt += "\n\nNote: All edits will be tracked with Word's track changes feature.";
    }

    return prompt;
  }
}