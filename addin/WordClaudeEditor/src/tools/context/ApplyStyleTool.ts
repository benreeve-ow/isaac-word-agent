import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { enableTrackChanges } from "./trackChangesHelper";

export class ApplyStyleTool implements ToolDefinition {
  name = "apply_style";
  description = "Apply Word's native styles (Heading 1-6, Normal, bold, italic, etc.) to text";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text to find and style (30-50 characters)",
      required: true
    },
    {
      name: "style",
      type: "string",
      description: "Style to apply: Heading1-6, Normal, Title, Subtitle, Quote, Emphasis, Strong, or font styles (bold, italic, underline)",
      required: true
    },
    {
      name: "scope",
      type: "string",
      description: "Apply to 'paragraph' or just the 'text'",
      required: false,
      enum: ["paragraph", "text"]
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, style, scope = "text" } = params;
    
    if (!anchor || !style) {
      return {
        success: false,
        error: "Both anchor and style are required"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        await enableTrackChanges(context);
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
        const styleNormalized = style.toLowerCase().replace(/\s+/g, '');
        
        // Handle paragraph styles (Headings, Normal, etc.)
        if (scope === "paragraph" || styleNormalized.includes('heading') || styleNormalized === 'normal' || 
            styleNormalized === 'title' || styleNormalized === 'subtitle' || styleNormalized === 'quote') {
          
          const paragraph = firstMatch.paragraphs.getFirst();
          context.load(paragraph);
          await context.sync();
          
          // Apply built-in paragraph styles
          switch (styleNormalized) {
            case 'heading1':
            case 'h1':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.heading1;
              break;
            case 'heading2':
            case 'h2':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.heading2;
              break;
            case 'heading3':
            case 'h3':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.heading3;
              break;
            case 'heading4':
            case 'h4':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.heading4;
              break;
            case 'heading5':
            case 'h5':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.heading5;
              break;
            case 'heading6':
            case 'h6':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.heading6;
              break;
            case 'normal':
            case 'body':
            case 'paragraph':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.normal;
              break;
            case 'title':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.title;
              break;
            case 'subtitle':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.subtitle;
              break;
            case 'quote':
            case 'blockquote':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.quote;
              break;
            case 'emphasis':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.emphasis;
              break;
            case 'intense':
            case 'strong':
              paragraph.styleBuiltIn = Word.BuiltInStyleName.intenseEmphasis;
              break;
            default:
              return {
                success: false,
                error: `Unknown paragraph style: ${style}`
              };
          }
          
          await context.sync();
          return {
            success: true,
            message: `Applied ${style} style to paragraph containing "${anchor.substring(0, 30)}..."`
          };
          
        } else {
          // Handle text/font styles (bold, italic, underline)
          const font = firstMatch.font;
          context.load(font);
          await context.sync();
          
          switch (styleNormalized) {
            case 'bold':
            case 'strong':
            case '**':
              font.bold = true;
              break;
            case 'italic':
            case 'italics':
            case 'emphasis':
            case '*':
              font.italic = true;
              break;
            case 'underline':
            case 'underlined':
              font.underline = Word.UnderlineType.single;
              break;
            case 'strikethrough':
            case 'strike':
              font.strikeThrough = true;
              break;
            case 'subscript':
              font.subscript = true;
              break;
            case 'superscript':
              font.superscript = true;
              break;
            case 'normal':
            case 'plain':
            case 'clear':
              // Clear all formatting
              font.bold = false;
              font.italic = false;
              font.underline = Word.UnderlineType.none;
              font.strikeThrough = false;
              font.subscript = false;
              font.superscript = false;
              break;
            default:
              // Try to apply as a named style
              try {
                firstMatch.style = style;
              } catch {
                return {
                  success: false,
                  error: `Unknown text style: ${style}`
                };
              }
          }
          
          await context.sync();
          return {
            success: true,
            message: `Applied ${style} formatting to "${anchor.substring(0, 30)}..."`
          };
        }
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to apply style"
      };
    }
  }
}