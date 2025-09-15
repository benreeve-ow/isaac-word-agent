import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { enableTrackChanges } from "./trackChangesHelper";

export class CreateMultiItemListTool implements ToolDefinition {
  name = "create_list";
  description = "Convert text into a properly formatted Word list (bullet or numbered)";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "startAnchor",
      type: "string",
      description: "Text from the first item to convert (30-50 characters)",
      required: true
    },
    {
      name: "endAnchor",
      type: "string", 
      description: "Text from the last item to convert (30-50 characters)",
      required: true
    },
    {
      name: "listType",
      type: "string",
      description: "Type of list: 'bullet' or 'numbered'",
      required: true,
      enum: ["bullet", "numbered"]
    },
    {
      name: "style",
      type: "string",
      description: "Bullet style (•, ◦, ▪) or numbering (1., a., i.)",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { startAnchor, endAnchor, listType, style } = params;
    
    if (!startAnchor || !endAnchor || !listType) {
      return {
        success: false,
        error: "startAnchor, endAnchor, and listType are required"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        await enableTrackChanges(context);
        // Find the starting paragraph
        const startSearch = context.document.body.search(startAnchor, { matchCase: false });
        context.load(startSearch);
        await context.sync();
        
        if (startSearch.items.length === 0) {
          return {
            success: false,
            error: `Start text not found: "${startAnchor}"`
          };
        }
        
        // Get the starting paragraph
        const startParagraph = startSearch.items[0].paragraphs.getFirst();
        context.load(startParagraph);
        await context.sync();
        
        // Clean up any bullet point characters (•, -, *, etc.) at the start of paragraphs
        const cleanupPatterns = [/^[•·●○◦▪▫◆◇★☆→►▸‣⁃]\s*/, /^[\-\*]\s+/, /^\d+\.\s+/];
        
        // Get all paragraphs in the document
        const allParagraphs = context.document.body.paragraphs;
        context.load(allParagraphs);
        await context.sync();
        
        // Find the index of the start paragraph
        let startIndex = -1;
        let endIndex = allParagraphs.items.length - 1;
        
        for (let i = 0; i < allParagraphs.items.length; i++) {
          const para = allParagraphs.items[i];
          context.load(para);
          await context.sync();
          
          if (para.text.includes(startAnchor)) {
            startIndex = i;
            break;
          }
        }
        
        if (startIndex === -1) {
          return {
            success: false,
            error: "Could not locate start paragraph"
          };
        }
        
        // Find the end paragraph
        for (let i = startIndex; i < allParagraphs.items.length; i++) {
          const para = allParagraphs.items[i];
          context.load(para);
          await context.sync();
          
          if (para.text.includes(endAnchor)) {
            endIndex = i;
            break;
          }
        }
        
        if (endIndex === -1) {
          return {
            success: false,
            error: `End text not found: "${endAnchor}"`
          };
        }
        
        // Start a new list from the first paragraph
        const list = allParagraphs.items[startIndex].startNewList();
        context.load(list);
        await context.sync();
        
        // Set list type and style
        if (listType === "bullet") {
          switch (style) {
            case "•":
            case "disc":
              list.setLevelBullet(0, Word.ListBullet.solid);
              break;
            case "◦":
            case "circle":
              list.setLevelBullet(0, Word.ListBullet.hollow);
              break;
            case "▪":
            case "square":
              list.setLevelBullet(0, Word.ListBullet.square);
              break;
            default:
              list.setLevelBullet(0, Word.ListBullet.solid);
              break;
          }
        } else {
          switch (style) {
            case "1.":
            case "decimal":
              list.setLevelNumbering(0, Word.ListNumbering.arabic);
              break;
            case "a.":
            case "lowerLetter":
              list.setLevelNumbering(0, Word.ListNumbering.lowerLetter);
              break;
            case "i.":
            case "lowerRoman":
              list.setLevelNumbering(0, Word.ListNumbering.lowerRoman);
              break;
            case "A.":
            case "upperLetter":
              list.setLevelNumbering(0, Word.ListNumbering.upperLetter);
              break;
            case "I.":
            case "upperRoman":
              list.setLevelNumbering(0, Word.ListNumbering.upperRoman);
              break;
            default:
              list.setLevelNumbering(0, Word.ListNumbering.arabic);
              break;
          }
        }
        
        // Clean up the text in the first paragraph (remove bullet characters)
        let cleanedText = allParagraphs.items[startIndex].text;
        for (const pattern of cleanupPatterns) {
          cleanedText = cleanedText.replace(pattern, '');
        }
        if (cleanedText !== allParagraphs.items[startIndex].text) {
          allParagraphs.items[startIndex].insertText(cleanedText, Word.InsertLocation.replace);
        }
        
        // Ensure consistent indentation for the first item
        allParagraphs.items[startIndex].leftIndent = 0;
        
        // Add subsequent paragraphs to the same list
        let itemCount = 1;
        for (let i = startIndex + 1; i <= endIndex; i++) {
          const para = allParagraphs.items[i];
          
          // Clean up bullet characters
          let cleanedText = para.text;
          for (const pattern of cleanupPatterns) {
            cleanedText = cleanedText.replace(pattern, '');
          }
          if (cleanedText !== para.text) {
            para.insertText(cleanedText, Word.InsertLocation.replace);
          }
          
          // Attach to the same list
          para.attachToList(list.id, 0);
          itemCount++;
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Created ${listType} list with ${itemCount} items`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create list"
      };
    }
  }
}