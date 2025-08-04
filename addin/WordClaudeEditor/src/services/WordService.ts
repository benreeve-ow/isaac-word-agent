/**
 * Service for interacting with Word document
 * Handles all Office.js operations with proper error handling
 */

export interface SelectionContext {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  hasSelection: boolean;
  wordCount: number;
  estimatedTokens: number;
}

export interface DocumentComment {
  id: string;
  author: string;
  text: string;
  createdDate: Date;
  replyCount: number;
}

export interface EditResult {
  success: boolean;
  originalText: string;
  newText: string;
  error?: string;
}

export interface DocumentSample {
  text: string;
  wordCount: number;
  estimatedTokens: number;
  fromBeginning: boolean;
}

export interface ContextSettings {
  useFullDocument: boolean;
  tokensBefore: number;
  tokensAfter: number;
  maxTotalTokens: number;
}

// Default context settings
const DEFAULT_CONTEXT_SETTINGS: ContextSettings = {
  useFullDocument: false,
  tokensBefore: 500,  // ~2000 characters
  tokensAfter: 500,   // ~2000 characters
  maxTotalTokens: 140000 // 70% of Claude's context window
};

class WordService {
  private contextSettings: ContextSettings;

  constructor() {
    this.contextSettings = DEFAULT_CONTEXT_SETTINGS;
  }

  /**
   * Estimates token count from text (roughly 1 token per 4 characters)
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Gets text by estimated token count
   */
  private getTextByTokens(text: string, tokens: number, fromEnd: boolean = false): string {
    const estimatedChars = tokens * 4;
    if (fromEnd) {
      return text.slice(-estimatedChars);
    }
    return text.slice(0, estimatedChars);
  }

  /**
   * Updates context settings
   */
  public updateContextSettings(settings: Partial<ContextSettings>): void {
    this.contextSettings = { ...this.contextSettings, ...settings };
  }

  /**
   * Gets selected text with surrounding context
   */
  public async getSelectedTextWithContext(
    tokensBefore?: number,
    tokensAfter?: number
  ): Promise<SelectionContext> {
    try {
      return await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        
        await context.sync();

        if (!selection.text || selection.text.trim() === "") {
          return {
            selectedText: "",
            contextBefore: "",
            contextAfter: "",
            hasSelection: false,
            wordCount: 0,
            estimatedTokens: 0
          };
        }

        const selectedText = selection.text;
        let contextBefore = "";
        let contextAfter = "";

        // Determine how much context to get
        const tokensToGetBefore = tokensBefore || this.contextSettings.tokensBefore;
        const tokensToGetAfter = tokensAfter || this.contextSettings.tokensAfter;

        if (this.contextSettings.useFullDocument) {
          // Get entire document as context (capped at max tokens)
          const body = context.document.body;
          body.load("text");
          await context.sync();

          const fullText = body.text;
          const totalTokens = this.estimateTokens(fullText);

          if (totalTokens <= this.contextSettings.maxTotalTokens) {
            // Use full document if within limits
            const selectionStart = fullText.indexOf(selectedText);
            if (selectionStart !== -1) {
              contextBefore = fullText.substring(0, selectionStart);
              contextAfter = fullText.substring(selectionStart + selectedText.length);
            }
          } else {
            // Document too large, get maximum context around selection
            const availableTokens = this.contextSettings.maxTotalTokens - this.estimateTokens(selectedText);
            const halfAvailable = Math.floor(availableTokens / 2);
            
            // Get ranges before and after selection
            const rangeBefore = selection.getRange("Start").expandTo(
              context.document.body.getRange("Start")
            );
            const rangeAfter = selection.getRange("End").expandTo(
              context.document.body.getRange("End")
            );
            
            rangeBefore.load("text");
            rangeAfter.load("text");
            await context.sync();

            contextBefore = this.getTextByTokens(rangeBefore.text, halfAvailable, true);
            contextAfter = this.getTextByTokens(rangeAfter.text, halfAvailable, false);
          }
        } else {
          // Get limited context based on token settings
          try {
            // Get paragraph containing selection for better context
            const paragraph = selection.paragraphs.getFirst();
            paragraph.load("text");
            await context.sync();

            // Get ranges for context
            const rangeBefore = selection.getRange("Start");
            const rangeAfter = selection.getRange("End");

            // Expand ranges to get context
            const charsBefore = tokensToGetBefore * 4;
            const charsAfter = tokensToGetAfter * 4;

            // Get text before selection
            const beforeRange = rangeBefore.expandTo(
              context.document.body.getRange("Start")
            );
            beforeRange.load("text");
            
            // Get text after selection
            const afterRange = rangeAfter.expandTo(
              context.document.body.getRange("End")
            );
            afterRange.load("text");
            
            await context.sync();

            // Extract the requested amount of context
            const fullBefore = beforeRange.text;
            const fullAfter = afterRange.text;
            
            contextBefore = fullBefore.slice(-charsBefore);
            contextAfter = fullAfter.slice(0, charsAfter);
          } catch (error) {
            // Fallback to simple context extraction
            console.warn("Complex context extraction failed, using simple method:", error);
          }
        }

        const wordCount = selectedText.split(/\s+/).filter(word => word.length > 0).length;
        const estimatedTokens = this.estimateTokens(selectedText) + 
                               this.estimateTokens(contextBefore) + 
                               this.estimateTokens(contextAfter);

        return {
          selectedText,
          contextBefore,
          contextAfter,
          hasSelection: true,
          wordCount,
          estimatedTokens
        };
      });
    } catch (error) {
      console.error("Error getting selection with context:", error);
      throw new Error("Failed to get selected text. Please ensure text is selected.");
    }
  }

  /**
   * Applies edit to selected text with track changes enabled
   */
  public async applyEditWithTracking(newText: string): Promise<EditResult> {
    try {
      return await Word.run(async (context) => {
        // Get current selection
        const selection = context.document.getSelection();
        selection.load("text");
        
        // Check current track changes mode
        context.document.load("changeTrackingMode");
        
        await context.sync();

        const originalText = selection.text;
        
        if (!originalText || originalText.trim() === "") {
          return {
            success: false,
            originalText: "",
            newText: "",
            error: "No text selected"
          };
        }

        // Store original tracking mode
        const originalMode = context.document.changeTrackingMode;
        
        try {
          // Enable track changes if not already enabled
          if (originalMode === Word.ChangeTrackingMode.off) {
            context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
            await context.sync();
          }

          // Replace the selected text
          selection.insertText(newText, Word.InsertLocation.replace);
          
          await context.sync();

          // Restore original tracking mode if we changed it
          if (originalMode === Word.ChangeTrackingMode.off) {
            context.document.changeTrackingMode = originalMode;
            await context.sync();
          }

          return {
            success: true,
            originalText,
            newText
          };
        } catch (replaceError) {
          // Try to restore tracking mode on error
          if (originalMode === Word.ChangeTrackingMode.off) {
            try {
              context.document.changeTrackingMode = originalMode;
              await context.sync();
            } catch (restoreError) {
              console.error("Failed to restore tracking mode:", restoreError);
            }
          }
          throw replaceError;
        }
      });
    } catch (error) {
      console.error("Error applying edit with tracking:", error);
      return {
        success: false,
        originalText: "",
        newText,
        error: error instanceof Error ? error.message : "Failed to apply changes"
      };
    }
  }

  /**
   * Gets comments on the current selection
   */
  public async getCommentsOnSelection(): Promise<DocumentComment[]> {
    try {
      return await Word.run(async (context) => {
        const selection = context.document.getSelection();
        
        // Load selection with comments
        selection.load("text");
        const comments = selection.getComments();
        comments.load("items");
        
        await context.sync();

        if (!selection.text || selection.text.trim() === "") {
          return [];
        }

        // Load comment details
        const commentItems: DocumentComment[] = [];
        
        for (let i = 0; i < comments.items.length; i++) {
          const comment = comments.items[i];
          comment.load(["id", "authorName", "content"]);
          
          // Load replies
          const replies = comment.replies;
          replies.load("items");
        }
        
        await context.sync();

        // Process comments
        for (let i = 0; i < comments.items.length; i++) {
          const comment = comments.items[i];
          commentItems.push({
            id: comment.id,
            author: comment.authorName,
            text: comment.content,
            createdDate: new Date(), // Word.js doesn't expose createdDate for comments
            replyCount: comment.replies.items.length
          });
        }

        return commentItems;
      });
    } catch (error) {
      console.error("Error getting comments on selection:", error);
      return [];
    }
  }

  /**
   * Gets a sample of document text for style analysis
   */
  public async getDocumentSample(tokens?: number): Promise<DocumentSample> {
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        
        await context.sync();

        const fullText = body.text;
        const requestedTokens = tokens || 2000; // Default ~8000 characters
        const requestedChars = requestedTokens * 4;
        
        let sampleText: string;
        let fromBeginning = true;

        if (fullText.length <= requestedChars) {
          // Return entire document if it's small enough
          sampleText = fullText;
        } else {
          // Try to get a meaningful sample from the beginning
          // Look for a good breaking point (paragraph end)
          sampleText = fullText.substring(0, requestedChars);
          
          // Try to end at a paragraph break
          const lastParagraph = sampleText.lastIndexOf("\n\n");
          if (lastParagraph > requestedChars * 0.7) {
            sampleText = sampleText.substring(0, lastParagraph);
          }
        }

        const wordCount = sampleText.split(/\s+/).filter(word => word.length > 0).length;
        const estimatedTokens = this.estimateTokens(sampleText);

        return {
          text: sampleText,
          wordCount,
          estimatedTokens,
          fromBeginning
        };
      });
    } catch (error) {
      console.error("Error getting document sample:", error);
      throw new Error("Failed to get document sample");
    }
  }

  /**
   * Gets the current track changes mode
   */
  public async getTrackChangesMode(): Promise<Word.ChangeTrackingMode | string> {
    try {
      return await Word.run(async (context) => {
        context.document.load("changeTrackingMode");
        await context.sync();
        return context.document.changeTrackingMode;
      });
    } catch (error) {
      console.error("Error getting track changes mode:", error);
      return Word.ChangeTrackingMode.off;
    }
  }

  /**
   * Sets the track changes mode
   */
  public async setTrackChangesMode(mode: Word.ChangeTrackingMode): Promise<boolean> {
    try {
      return await Word.run(async (context) => {
        context.document.changeTrackingMode = mode;
        await context.sync();
        return true;
      });
    } catch (error) {
      console.error("Error setting track changes mode:", error);
      return false;
    }
  }

  /**
   * Checks if there is text selected
   */
  public async hasSelection(): Promise<boolean> {
    try {
      return await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();
        return selection.text && selection.text.trim() !== "";
      });
    } catch (error) {
      console.error("Error checking selection:", error);
      return false;
    }
  }

  /**
   * Get selected text from the document
   */
  public async getSelectedText(): Promise<string> {
    try {
      return await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();
        return selection.text || "";
      });
    } catch (error) {
      console.error("Error getting selected text:", error);
      return "";
    }
  }

  /**
   * Enable or disable track changes
   */
  public async setTrackChanges(enabled: boolean): Promise<boolean> {
    try {
      const mode = enabled ? Word.ChangeTrackingMode.trackAll : Word.ChangeTrackingMode.off;
      return await this.setTrackChangesMode(mode);
    } catch (error) {
      console.error("Error setting track changes:", error);
      return false;
    }
  }

  /**
   * Get document context for AI processing
   */
  public async getDocumentContext(): Promise<any> {
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        const properties = context.document.properties;
        
        // Load document content and properties
        context.load(body, "text");
        context.load(properties, ["title", "subject", "author"]);
        
        await context.sync();
        
        const text = body.text;
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        const charCount = text.length;
        
        // Get selected text if any
        let selectedText = "";
        try {
          const selection = context.document.getSelection();
          selection.load("text");
          await context.sync();
          selectedText = selection.text;
        } catch {
          // No selection or error getting selection
        }
        
        return {
          fullText: text,
          selectedText,
          wordCount,
          charCount,
          estimatedTokens: Math.ceil(text.length / 4),
          metadata: {
            title: properties.title || "",
            subject: properties.subject || "",
            author: properties.author || ""
          }
        };
      });
    } catch (error) {
      console.error("Error getting document context:", error);
      return {
        fullText: "",
        selectedText: "",
        wordCount: 0,
        charCount: 0,
        estimatedTokens: 0,
        metadata: {}
      };
    }
  }
}

// Export singleton instance
export const wordService = new WordService();
export default WordService;