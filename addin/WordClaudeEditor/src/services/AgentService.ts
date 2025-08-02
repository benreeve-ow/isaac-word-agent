import { wordService } from "./WordService";

export interface ToolUse {
  id: string;
  name: string;
  input: any;
}

export interface AgentMessage {
  type: "content" | "tool_use" | "error" | "complete";
  data: any;
}

export interface SearchResult {
  text: string;
  location: string;
  context: string;
}

class AgentService {
  private baseUrl = "https://localhost:3000/api";
  
  // Health check method
  async checkBackendHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await fetch("https://localhost:3000/health", {
        method: "GET",
        mode: "cors",
      });
      
      if (response.ok) {
        return { healthy: true };
      } else {
        return { 
          healthy: false, 
          error: `Backend returned status ${response.status}` 
        };
      }
    } catch (error) {
      console.error("[AgentService] Health check failed:", error);
      return { 
        healthy: false, 
        error: "Cannot connect to backend server at https://localhost:3000" 
      };
    }
  }

  async *streamAgentResponse(
    userPrompt: string,
    documentContext: string
  ): AsyncGenerator<AgentMessage> {
    console.log("[AgentService] Calling backend API...");
    console.log("[AgentService] Document context length:", documentContext.length);
    console.log("[AgentService] Backend URL:", this.baseUrl);
    
    let response: Response;
    
    try {
      response = await fetch(`${this.baseUrl}/agent/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userPrompt }],
          documentContext,
        }),
      });
    } catch (error) {
      console.error("[AgentService] Fetch error:", error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error("Cannot connect to backend server at " + this.baseUrl + ". Please ensure:\n1. Backend server is running (npm start in backend folder)\n2. The server is running on port 3000\n3. HTTPS certificates are accepted");
      }
      
      throw error;
    }

    console.log("[AgentService] Response status:", response.status);

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "Could not read error response";
      }
      console.error("[AgentService] API error:", errorText);
      
      // Parse backend error if it's JSON
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch (e) {
        // Not JSON, use as-is
      }
      
      // Provide more detailed error messages
      if (response.status === 0) {
        throw new Error("Backend server is not running. Please start the backend server (npm start in backend folder).");
      } else if (response.status === 404) {
        throw new Error("Agent endpoint not found. Please ensure the backend server is running the latest version.");
      } else if (response.status === 500) {
        // Check for specific backend errors
        if (errorMessage.includes("API key")) {
          throw new Error("Anthropic API key error. Please check that ANTHROPIC_API_KEY is set in backend/.env file.");
        }
        throw new Error(`Backend server error: ${errorMessage}`);
      } else if (response.status === 401) {
        throw new Error("Authentication failed. Please check your Anthropic API key in backend/.env");
      } else {
        throw new Error(`Server error (${response.status}): ${errorMessage}`);
      }
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith("event:")) {
          const eventType = line.slice(6).trim();
          
          // Look for the data line (should be next line)
          if (i + 1 < lines.length && lines[i + 1].startsWith("data:")) {
            const dataLine = lines[i + 1];
            i++; // Skip the data line in next iteration
            
            try {
              const dataStr = dataLine.slice(5).trim();
              if (dataStr) {
                const data = JSON.parse(dataStr);
                console.log(`[AgentService] Event: ${eventType}`, data);
                
                // Execute tool on client side
                if (eventType === "tool_use") {
                  console.log(`[AgentService] Executing tool: ${data.name}`);
                  const result = await this.executeToolUse(data);
                  console.log(`[AgentService] Tool result:`, result);
                  yield { type: "tool_use", data: { ...data, result } };
                } else {
                  yield { type: eventType as any, data };
                }
              }
            } catch (parseError) {
              console.error("[AgentService] Error parsing SSE data:", parseError);
              console.error("[AgentService] Problem line:", dataLine);
            }
          }
        }
      }
    }
  }

  private async executeToolUse(toolUse: ToolUse): Promise<any> {
    try {
      switch (toolUse.name) {
        case "search_document":
          return await this.searchDocument(toolUse.input);
        
        case "edit_content":
          return await this.editContent(toolUse.input);
        
        case "insert_content":
          return await this.insertContent(toolUse.input);
        
        case "analyze_structure":
          return await this.analyzeStructure(toolUse.input);
        
        case "complete_editing":
          return { success: true, message: "Editing complete" };
        
        default:
          return { success: false, error: `Unknown tool: ${toolUse.name}` };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolUse.name}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Tool execution failed" 
      };
    }
  }

  private async searchDocument(input: any): Promise<SearchResult[]> {
    console.log("[AgentService] searchDocument called with:", input);
    
    return Word.run(async (context) => {
      const body = context.document.body;
      
      // Remove regex patterns that Word can't handle
      let searchPattern = input.pattern || "";
      // Remove regex syntax like .*? 
      searchPattern = searchPattern.replace(/\.\*\?/g, "");
      searchPattern = searchPattern.replace(/\.\*/g, "");
      searchPattern = searchPattern.replace(/[\[\]\(\)\{\}\^\$\+\?\\]/g, "");
      
      console.log(`[AgentService] Cleaned search pattern: "${searchPattern}"`);
      
      if (!searchPattern.trim()) {
        console.log("[AgentService] Empty search pattern after cleaning");
        return [];
      }
      
      const searchResults = body.search(searchPattern, {
        matchCase: false,
        matchWholeWord: false,
        matchWildcards: false,
      });

      context.load(searchResults, "items");
      await context.sync();
      
      console.log(`[AgentService] Found ${searchResults.items.length} search results`);

      const results: SearchResult[] = [];
      
      for (const result of searchResults.items) {
        // Load the paragraph containing this result
        const paragraph = result.paragraphs.getFirst();
        paragraph.load("text");
        
        // Get surrounding context
        const prevParagraph = paragraph.getPrevious();
        const nextParagraph = paragraph.getNext();
        
        prevParagraph.load("text");
        nextParagraph.load("text");
        
        await context.sync();

        let contextText = "";
        try {
          contextText = prevParagraph.text + "\n";
        } catch {} // Previous might not exist
        
        contextText += paragraph.text;
        
        try {
          contextText += "\n" + nextParagraph.text;
        } catch {} // Next might not exist

        results.push({
          text: result.text,
          location: `Paragraph containing: "${result.text.substring(0, 50)}..."`,
          context: contextText,
        });

        // Limit results for performance
        if (results.length >= 10) break;
      }

      return results;
    });
  }

  private async editContent(input: any): Promise<any> {
    console.log("[AgentService] editContent called with:", input);
    
    return Word.run(async (context) => {
      try {
        const body = context.document.body;
        
        // Enable track changes
        context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        
        // If search text is too long, try to find a unique shorter portion
        let searchText = input.search_text || "";
        const maxSearchLength = 200; // Keep it well under Word's limit
        
        if (searchText.length > maxSearchLength) {
          console.log(`[AgentService] Search text too long (${searchText.length} chars)`);
          
          // Option 1: Try to use just the first sentence
          const sentences = searchText.match(/[^.!?]+[.!?]+/g) || [];
          if (sentences.length > 0 && sentences[0].length < maxSearchLength) {
            searchText = sentences[0].trim();
            console.log(`[AgentService] Using first sentence: "${searchText.substring(0, 50)}..."`);
          } else {
            // Option 2: Use first N characters with word boundary
            searchText = searchText.substring(0, maxSearchLength);
            const lastSpace = searchText.lastIndexOf(" ");
            if (lastSpace > 50) {
              searchText = searchText.substring(0, lastSpace);
            }
            console.log(`[AgentService] Truncated to: "${searchText.substring(0, 50)}..."`);
          }
        }
        
        // Search for the text to replace
        const searchResults = body.search(searchText, {
          matchCase: false, // Less strict matching
          matchWholeWord: false,
        });

        context.load(searchResults, "items");
        await context.sync();
        
        console.log(`[AgentService] Edit search found ${searchResults.items.length} matches`);

        if (searchResults.items.length === 0) {
          // If not found, try searching for just the first sentence
          const firstSentence = input.search_text.split(/[.!?]/)[0];
          if (firstSentence && firstSentence.length < searchText.length) {
            console.log("[AgentService] Trying to search for first sentence only");
            const sentenceSearch = body.search(firstSentence, {
              matchCase: false,
              matchWholeWord: false,
            });
            
            context.load(sentenceSearch, "items");
            await context.sync();
            
            if (sentenceSearch.items.length > 0) {
              // Found it - now expand to select the full paragraph
              const paragraph = sentenceSearch.items[0].paragraphs.getFirst();
              paragraph.load("text");
              await context.sync();
              
              // Replace the entire paragraph if it matches closely enough
              if (paragraph.text.includes(firstSentence)) {
                paragraph.insertText(input.replacement_text, Word.InsertLocation.replace);
                await context.sync();
                
                return { 
                  success: true, 
                  message: `Replaced paragraph starting with "${firstSentence.substring(0, 50)}..."`,
                  occurrences: 1
                };
              }
            }
          }
          
          return { 
            success: false, 
            error: `Text not found: "${searchText.substring(0, 50)}...". The text may have changed or contain special formatting. Try searching for a shorter, unique phrase.`
          };
        }

        // Replace the first occurrence
        const targetResult = searchResults.items[0];
        
        // If the original search text was longer than what we searched for,
        // we need to select the full original text
        if (input.search_text.length > searchText.length) {
          // Get the paragraph containing the match
          const paragraph = targetResult.paragraphs.getFirst();
          paragraph.load("text");
          await context.sync();
          
          // Check if the paragraph contains the full original text
          if (paragraph.text.includes(input.search_text)) {
            // Replace the entire matching text in the paragraph
            const fullSearch = paragraph.search(input.search_text, {
              matchCase: false,
              matchWholeWord: false,
            });
            
            context.load(fullSearch, "items");
            await context.sync();
            
            if (fullSearch.items.length > 0) {
              fullSearch.items[0].insertText(input.replacement_text, Word.InsertLocation.replace);
            } else {
              // Fall back to replacing the paragraph
              paragraph.insertText(input.replacement_text, Word.InsertLocation.replace);
            }
          } else {
            // Just replace what we found
            targetResult.insertText(input.replacement_text, Word.InsertLocation.replace);
          }
        } else {
          // Normal replacement
          targetResult.insertText(input.replacement_text, Word.InsertLocation.replace);
        }
        
        await context.sync();

        return { 
          success: true, 
          message: `Replaced text successfully`,
          occurrences: searchResults.items.length
        };
      } catch (error) {
        console.error("[AgentService] Error in editContent:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Edit operation failed"
        };
      }
    });
  }

  private async insertContent(input: any): Promise<any> {
    return Word.run(async (context) => {
      const body = context.document.body;
      
      // Enable track changes
      context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
      
      let insertLocation: Word.Range | undefined;
      let contentToInsert = input.content;

      switch (input.position) {
        case "beginning":
          insertLocation = body.getRange(Word.RangeLocation.start);
          // Add paragraph break after the inserted content
          contentToInsert = contentToInsert + "\n\n";
          break;
        
        case "end":
          insertLocation = body.getRange(Word.RangeLocation.end);
          // Add paragraph break before the inserted content
          contentToInsert = "\n\n" + contentToInsert;
          break;
        
        case "after_text":
        case "before_text":
          if (!input.reference_text) {
            return { success: false, error: "Reference text required" };
          }
          
          const searchResults = body.search(input.reference_text, {
            matchCase: false,
            matchWholeWord: false,
          });
          
          context.load(searchResults, "items");
          await context.sync();
          
          if (searchResults.items.length === 0) {
            return { success: false, error: "Reference text not found" };
          }
          
          const referenceRange = searchResults.items[0];
          if (input.position === "after_text") {
            // Get the paragraph containing the reference text
            const paragraph = referenceRange.paragraphs.getFirst();
            paragraph.load("text");
            await context.sync();
            
            // Insert after the paragraph to maintain formatting
            insertLocation = paragraph.getRange(Word.RangeLocation.after);
            // Remove any leading newlines as Word.RangeLocation.after already provides spacing
            contentToInsert = contentToInsert.replace(/^\n+/, '');
          } else {
            // For before_text, insert before the reference text
            insertLocation = referenceRange.getRange(Word.RangeLocation.start);
            // Add proper paragraph breaks after
            contentToInsert = contentToInsert + "\n\n";
          }
          break;
      }

      if (!insertLocation) {
        return { success: false, error: "Could not determine insert location" };
      }

      // Ensure content ends with a line break for proper separation from following text
      if (input.position === "after_text" && !contentToInsert.endsWith("\n")) {
        contentToInsert = contentToInsert + "\n";
      }
      
      // Insert with proper formatting
      const insertedRange = insertLocation.insertText(contentToInsert, Word.InsertLocation.replace);
      
      // Ensure the inserted text has normal formatting (not bold)
      insertedRange.font.bold = false;
      insertedRange.style = "Normal"; // Use the Normal style
      
      await context.sync();

      return { 
        success: true, 
        message: `Inserted content at ${input.position}` 
      };
    });
  }

  private async analyzeStructure(input: any): Promise<any> {
    return Word.run(async (context) => {
      const body = context.document.body;
      const paragraphs = body.paragraphs;
      
      context.load(paragraphs, ["items", "text", "style"]);
      await context.sync();

      const structure = {
        totalParagraphs: paragraphs.items.length,
        headings: [] as any[],
        styles: new Set<string>(),
      };

      for (const paragraph of paragraphs.items) {
        if (input.include_styles !== false) {
          paragraph.load("style");
          await context.sync();
          structure.styles.add(paragraph.style);
        }

        // Check if it's a heading
        if (paragraph.style.toLowerCase().includes("heading")) {
          structure.headings.push({
            text: paragraph.text.substring(0, 100),
            style: paragraph.style,
          });
        }
      }

      return {
        success: true,
        structure: {
          ...structure,
          styles: Array.from(structure.styles),
        },
      };
    });
  }

  async getDocumentContext(): Promise<string> {
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        context.load(body, "text");
        await context.sync();
        
        // Get first 5000 characters as context
        const fullText = body.text;
        return fullText.substring(0, 5000);
      });
    } catch (error) {
      console.error("[AgentService] Error getting document context:", error);
      throw new Error("Failed to read document content. Please ensure you have a document open in Word.");
    }
  }
}

export const agentService = new AgentService();