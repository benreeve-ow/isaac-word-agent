import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { enableTrackChanges } from "./trackChangesHelper";

export class SetFontPropertiesTool implements ToolDefinition {
  name = "set_font_properties";
  description = "Change font family, size, and color for selected text";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text to find and format (30-50 characters)",
      required: true
    },
    {
      name: "fontFamily",
      type: "string",
      description: "Font family name (e.g., 'Arial', 'Times New Roman', 'Calibri')",
      required: false
    },
    {
      name: "fontSize",
      type: "number",
      description: "Font size in points (e.g., 12, 14, 16)",
      required: false
    },
    {
      name: "color",
      type: "string",
      description: "Font color as hex (#FF0000), name (red), or RGB (rgb(255,0,0))",
      required: false
    },
    {
      name: "highlightColor",
      type: "string",
      description: "Highlight color: yellow, green, blue, pink, orange, or hex color",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, fontFamily, fontSize, color, highlightColor } = params;
    
    if (!anchor) {
      return {
        success: false,
        error: "Anchor text is required"
      };
    }
    
    if (!fontFamily && !fontSize && !color && !highlightColor) {
      return {
        success: false,
        error: "At least one font property must be specified"
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
        const font = firstMatch.font;
        context.load(font);
        await context.sync();
        
        const changes: string[] = [];
        
        // Set font family
        if (fontFamily) {
          font.name = fontFamily;
          changes.push(`font: ${fontFamily}`);
        }
        
        // Set font size
        if (fontSize) {
          font.size = fontSize;
          changes.push(`size: ${fontSize}pt`);
        }
        
        // Set font color
        if (color) {
          font.color = this.normalizeColor(color);
          changes.push(`color: ${color}`);
        }
        
        // Set highlight color
        if (highlightColor) {
          font.highlightColor = this.normalizeHighlightColor(highlightColor);
          changes.push(`highlight: ${highlightColor}`);
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Applied font properties: ${changes.join(", ")}`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to set font properties"
      };
    }
  }
  
  private normalizeColor(color: string): string {
    // Handle common color names
    const colorMap: { [key: string]: string } = {
      "black": "#000000",
      "white": "#FFFFFF",
      "red": "#FF0000",
      "green": "#008000",
      "blue": "#0000FF",
      "yellow": "#FFFF00",
      "orange": "#FFA500",
      "purple": "#800080",
      "pink": "#FFC0CB",
      "gray": "#808080",
      "grey": "#808080",
      "brown": "#A52A2A"
    };
    
    const lowerColor = color.toLowerCase();
    if (colorMap[lowerColor]) {
      return colorMap[lowerColor];
    }
    
    // Handle RGB format
    if (lowerColor.startsWith("rgb")) {
      const matches = lowerColor.match(/\d+/g);
      if (matches && matches.length === 3) {
        const r = parseInt(matches[0]).toString(16).padStart(2, '0');
        const g = parseInt(matches[1]).toString(16).padStart(2, '0');
        const b = parseInt(matches[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    
    // Assume it's already a hex color
    return color.startsWith("#") ? color : `#${color}`;
  }
  
  private normalizeHighlightColor(color: string): string {
    const lowerColor = color.toLowerCase();
    
    // Map common highlight colors to hex values
    switch (lowerColor) {
      case "yellow":
        return "#FFFF00";
      case "green":
        return "#00FF00";
      case "blue":
        return "#00FFFF";
      case "pink":
        return "#FF69B4";
      case "orange":
        return "#FFA500";
      case "gray":
      case "grey":
        return "#C0C0C0";
      case "none":
      case "clear":
        return "";
      default:
        // Try to use as hex color
        return this.normalizeColor(color);
    }
  }
}