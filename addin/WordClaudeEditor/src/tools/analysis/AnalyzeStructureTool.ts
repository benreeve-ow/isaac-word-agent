/**
 * Tool for analyzing document structure
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class AnalyzeStructureTool extends BaseTool {
  name = "analyze_structure";
  description = "Analyze the document structure including headings, paragraphs, and styles";
  category = "analysis" as const;
  
  parameters = [
    {
      name: "include_styles",
      type: "boolean" as const,
      description: "Include style information in the analysis",
      default: true
    },
    {
      name: "include_stats",
      type: "boolean" as const,
      description: "Include document statistics (word count, etc.)",
      default: true
    },
    {
      name: "include_headings",
      type: "boolean" as const,
      description: "Include heading hierarchy",
      default: true
    }
  ];
  
  requiresApproval = false; // Read-only operation
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    
    context.document.context.load(paragraphs, ["items", "text", "style"]);
    await context.document.context.sync();
    
    const structure: any = {
      totalParagraphs: paragraphs.items.length,
      headings: [],
      styles: new Set<string>(),
      stats: {}
    };
    
    let wordCount = 0;
    let charCount = 0;
    
    for (const paragraph of paragraphs.items) {
      // Load style for each paragraph
      if (params.include_styles !== false) {
        paragraph.load("style");
        await context.document.context.sync();
        structure.styles.add(paragraph.style);
      }
      
      // Count words and characters
      if (params.include_stats !== false) {
        const text = paragraph.text;
        charCount += text.length;
        wordCount += text.split(/\s+/).filter(word => word.length > 0).length;
      }
      
      // Check if it's a heading
      if (params.include_headings !== false && paragraph.style.toLowerCase().includes("heading")) {
        structure.headings.push({
          text: paragraph.text.substring(0, 100),
          style: paragraph.style,
          level: this.extractHeadingLevel(paragraph.style)
        });
      }
    }
    
    // Convert Set to Array for JSON serialization
    structure.styles = Array.from(structure.styles);
    
    // Add statistics
    if (params.include_stats !== false) {
      structure.stats = {
        wordCount,
        characterCount: charCount,
        characterCountNoSpaces: charCount - (wordCount - 1),
        averageWordLength: wordCount > 0 ? Math.round(charCount / wordCount) : 0,
        paragraphCount: paragraphs.items.length,
        headingCount: structure.headings.length
      };
    }
    
    // Create heading outline
    if (params.include_headings !== false && structure.headings.length > 0) {
      structure.outline = this.createOutline(structure.headings);
    }
    
    return this.createSuccessResult(
      "Document structure analyzed",
      structure
    );
  }
  
  private extractHeadingLevel(style: string): number {
    const match = style.match(/Heading (\d)/);
    return match ? parseInt(match[1]) : 0;
  }
  
  private createOutline(headings: any[]): string {
    let outline = "";
    for (const heading of headings) {
      const indent = "  ".repeat(heading.level - 1);
      outline += `${indent}- ${heading.text}\n`;
    }
    return outline;
  }
}