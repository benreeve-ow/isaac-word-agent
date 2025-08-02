/**
 * Service for communicating with Claude backend API
 */

export interface ImproveTextRequest {
  text: string;
  contextBefore?: string;
  contextAfter?: string;
  systemPrompt?: string;
  stylePrompt?: string;
  userPrompt?: string;
}

export interface ImproveTextResponse {
  improvedText: string;
  explanation: string;
}

export interface ImplementCommentRequest {
  text: string;
  comment: string;
  context?: string;
  systemPrompt?: string;
}

export interface ImplementCommentResponse {
  editedText: string;
  explanation: string;
}

export interface AnalyzeStyleRequest {
  sampleText: string;
  sampleSize?: number;
}

export interface AnalyzeStyleResponse {
  stylePrompt: string;
  characteristics: string[];
}

export interface ApiError {
  error: string;
  details?: string;
  estimatedTokens?: number;
  maxTokens?: number;
}

class ClaudeService {
  private baseUrl: string;
  private defaultSystemPrompt: string;

  constructor() {
    // Default to localhost, can be overridden via settings
    this.baseUrl = this.getBackendUrl();
    this.defaultSystemPrompt = "You are a professional writing assistant helping to improve text in Microsoft Word documents. Focus on clarity, conciseness, and maintaining the author's voice.";
  }

  /**
   * Gets the backend URL from settings or uses default
   */
  private getBackendUrl(): string {
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        const url = settings.get("claudeBackendUrl");
        return url || "https://localhost:3000";
      }
    } catch (error) {
      // Fallback if Office context not available
      console.log("Office context not available, using default URL");
    }
    return "https://localhost:3000";
  }

  /**
   * Updates the backend URL
   */
  public setBackendUrl(url: string): void {
    this.baseUrl = url;
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        settings.set("claudeBackendUrl", url);
        settings.saveAsync();
      }
    } catch (error) {
      console.error("Failed to save backend URL to settings:", error);
    }
  }

  /**
   * Gets the system prompt from settings or uses default
   */
  private getSystemPrompt(): string {
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        const prompt = settings.get("claudeSystemPrompt");
        return prompt || this.defaultSystemPrompt;
      }
    } catch (error) {
      console.log("Office context not available for system prompt");
    }
    return this.defaultSystemPrompt;
  }

  /**
   * Makes a POST request to the API
   */
  private async postRequest<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}/api/claude${endpoint}`;
    
    console.log(`[ClaudeService] Making API call to: ${url}`);
    console.log(`[ClaudeService] Request data:`, data);
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      console.log(`[ClaudeService] Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json() as T;
      console.log(`[ClaudeService] Response data:`, result);
      return result;
    } catch (error) {
      console.error(`[ClaudeService] Error details:`, error);
      
      if (error instanceof TypeError) {
        if (error.message.includes("Failed to fetch") || error.message.includes("Load failed")) {
          throw new Error(`Cannot connect to backend server at ${this.baseUrl}. Please ensure:\n1. Backend server is running (npm start in backend folder)\n2. Backend is accessible at ${this.baseUrl}/health\n3. CORS is configured correctly\nOriginal error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Improves text using Claude API
   */
  public async improveText(request: ImproveTextRequest): Promise<ImproveTextResponse> {
    try {
      // Add system prompt if not provided
      if (!request.systemPrompt) {
        request.systemPrompt = this.getSystemPrompt();
      }

      const response = await this.postRequest<ImproveTextResponse>("/improve", request);
      
      if (!response.improvedText || !response.explanation) {
        throw new Error("Invalid response format from API");
      }

      return response;
    } catch (error) {
      console.error("Error improving text:", error);
      throw error;
    }
  }

  /**
   * Implements a comment on text
   */
  public async implementComment(request: ImplementCommentRequest): Promise<ImplementCommentResponse> {
    try {
      // Add system prompt if not provided
      if (!request.systemPrompt) {
        request.systemPrompt = this.getSystemPrompt();
      }

      const response = await this.postRequest<ImplementCommentResponse>("/implement-comment", request);
      
      if (!response.editedText || !response.explanation) {
        throw new Error("Invalid response format from API");
      }

      return response;
    } catch (error) {
      console.error("Error implementing comment:", error);
      throw error;
    }
  }

  /**
   * Analyzes writing style
   */
  public async analyzeStyle(request: AnalyzeStyleRequest): Promise<AnalyzeStyleResponse> {
    try {
      const response = await this.postRequest<AnalyzeStyleResponse>("/analyze-style", request);
      
      if (!response.stylePrompt || !response.characteristics) {
        throw new Error("Invalid response format from API");
      }

      return response;
    } catch (error) {
      console.error("Error analyzing style:", error);
      throw error;
    }
  }

  /**
   * Tests connection to backend
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
export default ClaudeService;