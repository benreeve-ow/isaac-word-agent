import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertLinkTool implements ToolDefinition {
  name = "insert_link";
  description = "Add a hyperlink to selected text";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text to convert to hyperlink (30-50 characters)",
      required: true
    },
    {
      name: "url",
      type: "string",
      description: "The URL or email address to link to",
      required: true
    },
    {
      name: "tooltip",
      type: "string",
      description: "Optional tooltip text that appears on hover",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, url, tooltip } = params;
    
    if (!anchor || !url) {
      return {
        success: false,
        error: "Both anchor and url are required"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        // Search for the anchor text
        const searchResults = context.document.body.search(anchor, { matchCase: false });
        context.load(searchResults);
        await context.sync();
        
        if (searchResults.items.length === 0) {
          return {
            success: false,
            error: `Text not found: "${anchor}"`
          };
        }
        
        const firstMatch = searchResults.items[0];
        
        // Determine if it's an email link
        const isEmail = url.includes('@') && !url.startsWith('http');
        const finalUrl = isEmail && !url.startsWith('mailto:') 
          ? `mailto:${url}` 
          : url;
        
        // Insert hyperlink
        firstMatch.insertHtml(
          `<a href="${finalUrl}"${tooltip ? ` title="${tooltip}"` : ''}>${firstMatch.text}</a>`,
          Word.InsertLocation.replace
        );
        
        await context.sync();
        
        return {
          success: true,
          message: `Added hyperlink to "${anchor.substring(0, 30)}..."`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to insert hyperlink"
      };
    }
  }
}