/**
 * Unified tool definitions for document editing
 * Single source of truth for all frontend-executed tools
 */

import { createFrontendTool } from "../mastra/tools/toolBridge";
import { z } from "zod";

export const tools = {
  // ==========================================
  // FORMATTING TOOLS
  // ==========================================
  
  "apply_style": createFrontendTool({
    id: "apply_style",
    description: "Apply Word's native styles - Use for headings (Heading1-6), paragraph styles (Normal, Title, Quote), or text formatting (bold, italic). NOT for markdown formatting!",
    inputSchema: z.object({
      anchor: z.string().describe("Text to style (30-50 chars)"),
      style: z.string().describe("Style: Heading1-6, Normal, Title, Subtitle, Quote, bold, italic, underline"),
      scope: z.enum(["paragraph", "text"]).optional().describe("Apply to whole paragraph or just text")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  // ==========================================
  // DOCUMENT READING TOOLS
  // ==========================================
  
  "read_unified_document": createFrontendTool({
    id: "read_unified_document",
    description: "Read document with proper structure - paragraphs, tables, and comments in their actual positions",
    inputSchema: z.object({
      includeComments: z.boolean().default(true).describe("Include review comments inline where they appear"),
      formatTables: z.boolean().default(true).describe("Format tables as readable ASCII tables")
    }),
    outputSchema: z.object({
      content: z.string(),
      wordCount: z.number(),
      paragraphCount: z.number(),
      tableCount: z.number(),
      hasComments: z.boolean(),
      structure: z.object({
        tables: z.number(),
        headings: z.number(),
        lists: z.number(),
        comments: z.number()
      }).optional()
    })
  }),

  "read_document": createFrontendTool({
    id: "read_document",
    description: "Read the complete document content to understand what's currently in it",
    inputSchema: z.object({
      includeFormatting: z.boolean().default(false).describe("Include formatting information"),
      includeComments: z.boolean().default(false).describe("Include review comments")
    }),
    outputSchema: z.object({
      content: z.string(),
      paragraphCount: z.number(),
      wordCount: z.number(),
      tableCount: z.number().optional(),
      hasComments: z.boolean().optional()
    })
  }),

  // ==========================================
  // TEXT EDITING TOOLS
  // ==========================================
  
  "insert_text": createFrontendTool({
    id: "insert_text",
    description: "Insert text at the start, end, or relative to an anchor text in the document",
    inputSchema: z.object({
      position: z.enum(["start", "end", "after", "before"]).describe("Where to insert the text"),
      anchor: z.string().optional().describe("Text fragment to search for (required for 'after' and 'before' positions). Use 30-50 chars from the end of a paragraph for 'after', or from the start for 'before'"),
      content: z.string().describe("The text content to insert")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  "replace_text": createFrontendTool({
    id: "replace_text",
    description: "Replace a paragraph or text section in the document",
    inputSchema: z.object({
      anchor: z.string().describe("Text fragment to find (first 30-50 chars of the paragraph to replace)"),
      content: z.string().describe("The new text to replace with"),
      scope: z.enum(["paragraph", "exact"]).default("paragraph").describe("What to replace - the whole paragraph or just the exact match")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  "delete_text": createFrontendTool({
    id: "delete_text",
    description: "Delete a paragraph or text section from the document",
    inputSchema: z.object({
      anchor: z.string().describe("Text fragment to find (first 30-50 chars of the paragraph to delete)"),
      scope: z.enum(["paragraph", "exact"]).default("paragraph").describe("What to delete - the whole paragraph or just the exact match")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // ==========================================
  // TABLE TOOLS
  // ==========================================
  
  "insert_table": createFrontendTool({
    id: "insert_table",
    description: "Insert a table at the start, end, or relative to an anchor text in the document",
    inputSchema: z.object({
      position: z.enum(["start", "end", "after", "before"]).describe("Where to insert the table"),
      anchor: z.string().optional().describe("Text fragment to search for (required for 'after' and 'before' positions)"),
      rows: z.number().min(1).describe("Number of rows"),
      columns: z.number().min(1).describe("Number of columns"),
      data: z.array(z.array(z.string())).optional().describe("2D array of table data"),
      headerRow: z.boolean().default(true).describe("Whether first row should be header"),
      style: z.enum(["grid", "simple", "none"]).default("grid").describe("Table style")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  "edit_table": createFrontendTool({
    id: "edit_table",
    description: "Edit a table cell's content by specifying table index, row, and column",
    inputSchema: z.object({
      tableIndex: z.number().describe("Index of the table in the document (0-based)"),
      row: z.number().describe("Row index (0-based)"),
      column: z.number().describe("Column index (0-based)"),
      newValue: z.string().describe("New value for the cell")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // ==========================================
  // COMMENT TOOLS
  // ==========================================
  
  "add_comment": createFrontendTool({
    id: "add_comment",
    description: "Add a review comment to text in the document",
    inputSchema: z.object({
      anchor: z.string().describe("Text to attach the comment to (30-50 chars)"),
      comment: z.string().describe("The comment text"),
      type: z.enum(["suggestion", "question", "issue", "praise", "general"]).default("general")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  "resolve_comment": createFrontendTool({
    id: "resolve_comment",
    description: "Mark a review comment as resolved/completed, optionally with a reply",
    inputSchema: z.object({
      commentIndex: z.number().describe("The index of the comment to resolve (starting from 0)"),
      replyText: z.string().optional().describe("Optional text to add as a reply before resolving")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // ==========================================
  // ADDITIONAL FORMATTING TOOLS
  // ==========================================
  
  "create_list": createFrontendTool({
    id: "create_list",
    description: "Convert a range of paragraphs into a properly formatted Word list",
    inputSchema: z.object({
      startAnchor: z.string().describe("Text from the FIRST list item (30-50 chars)"),
      endAnchor: z.string().describe("Text from the LAST list item (30-50 chars)"),
      listType: z.enum(["bullet", "numbered"]).describe("Type of list"),
      style: z.string().optional().describe("Bullet style or numbering format")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "adjust_list_level": createFrontendTool({
    id: "adjust_list_level",
    description: "Increase or decrease indentation level of list items",
    inputSchema: z.object({
      startAnchor: z.string().describe("Text from the first list item (30-50 chars)"),
      endAnchor: z.string().optional().describe("Text from the last item, or leave empty for single item"),
      direction: z.enum(["increase", "decrease"]).describe("Indent or outdent"),
      levels: z.number().optional().describe("Number of levels to adjust (default: 1)")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "set_alignment": createFrontendTool({
    id: "set_alignment",
    description: "Set alignment for one or more paragraphs",
    inputSchema: z.object({
      startAnchor: z.string().describe("Text from the first paragraph to align (30-50 chars)"),
      endAnchor: z.string().optional().describe("Text from the last paragraph to align, or leave empty for single paragraph"),
      alignment: z.enum(["left", "center", "right", "justify"]).describe("Alignment type")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "insert_break": createFrontendTool({
    id: "insert_break",
    description: "Insert page break, section break, or column break",
    inputSchema: z.object({
      position: z.enum(["start", "end", "after", "before"]).describe("Where to insert"),
      anchor: z.string().optional().describe("Text fragment for 'after'/'before' positions"),
      breakType: z.enum(["page", "sectionNext", "sectionContinuous", "sectionEven", "sectionOdd", "column"]).describe("Type of break")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "set_font_properties": createFrontendTool({
    id: "set_font_properties",
    description: "Change font family, size, color, and highlighting",
    inputSchema: z.object({
      anchor: z.string().describe("Text to format (30-50 chars)"),
      fontFamily: z.string().optional().describe("Font name (e.g., Arial, Times New Roman)"),
      fontSize: z.number().optional().describe("Font size in points"),
      color: z.string().optional().describe("Font color (hex, name, or RGB)"),
      highlightColor: z.string().optional().describe("Highlight color (yellow, green, blue, pink, etc.)")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),


  "set_spacing": createFrontendTool({
    id: "set_spacing",
    description: "Set line spacing and paragraph spacing for one or more paragraphs",
    inputSchema: z.object({
      startAnchor: z.string().describe("Text from the first paragraph to format (30-50 chars)"),
      endAnchor: z.string().optional().describe("Text from the last paragraph to format, or leave empty for single paragraph"),
      lineSpacing: z.string().optional().describe("Line spacing: 'single', '1.5', 'double', or number"),
      spaceBefore: z.number().optional().describe("Points of space before paragraphs"),
      spaceAfter: z.number().optional().describe("Points of space after paragraphs")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "set_indentation": createFrontendTool({
    id: "set_indentation",
    description: "Set ABSOLUTE paragraph indentation values for one or more paragraphs (not relative adjustments)",
    inputSchema: z.object({
      startAnchor: z.string().describe("Text from the first paragraph to format (30-50 chars)"),
      endAnchor: z.string().optional().describe("Text from the last paragraph to format, or leave empty for single paragraph"),
      firstLine: z.number().optional().describe("ABSOLUTE first line indent in points from left margin (not relative change)"),
      leftIndent: z.number().optional().describe("ABSOLUTE left margin position in points (e.g., 72 = 1 inch from edge)"),
      rightIndent: z.number().optional().describe("ABSOLUTE right margin position in points from right edge"),
      hanging: z.number().optional().describe("Create hanging indent (first line at margin, rest indented by this amount)")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "insert_footnote": createFrontendTool({
    id: "insert_footnote",
    description: "Insert a footnote or endnote at specific location",
    inputSchema: z.object({
      anchor: z.string().describe("Text where footnote reference goes (30-50 chars)"),
      text: z.string().describe("The footnote/endnote text content"),
      type: z.enum(["footnote", "endnote"]).default("footnote").describe("Type of note")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  "insert_link": createFrontendTool({
    id: "insert_link",
    description: "Add hyperlink to selected text",
    inputSchema: z.object({
      anchor: z.string().describe("Text to make into link (30-50 chars)"),
      url: z.string().describe("URL or email address to link to"),
      tooltip: z.string().optional().describe("Tooltip text on hover")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      error: z.string().optional()
    })
  }),

  // ==========================================
  // SEARCH TOOLS
  // ==========================================
  
  "doc.search": createFrontendTool({
    id: "doc.search",
    description: "Search the document for text using literal or regex patterns",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      mode: z.enum(["literal", "regex"]).default("literal").describe("Search mode"),
      maxHits: z.number().default(40).describe("Maximum number of hits to return")
    }),
    outputSchema: z.object({
      hits: z.array(z.object({
        hitId: z.string(),
        path: z.array(z.number()),
        context: z.string(),
        offStart: z.number(),
        offEnd: z.number()
      })).optional(),
      totalHits: z.number(),
      summary: z.string().optional(),
      topK: z.array(z.any()).optional(),
      omitted: z.number().optional()
    })
  }),

  // ==========================================
  // ADVANCED DOCUMENT TOOLS
  // ==========================================
  
  "doc.snapshot": createFrontendTool({
    id: "doc.snapshot",
    description: "Get a Unified Document View (UDV) of the current document for analysis and editing",
    inputSchema: z.object({
      dummy: z.string().optional().default("").describe("Not used - this tool requires no parameters")
    }),
    outputSchema: z.object({
      version: z.string(),
      blocks: z.array(z.any()),
      meta: z.object({
        documentTitle: z.string().optional(),
        createdAt: z.string(),
        blockCount: z.number()
      })
    })
  }),

  "doc.edit": createFrontendTool({
    id: "doc.edit",
    description: "Edit the document by replacing, inserting, or commenting on text found via search",
    inputSchema: z.object({
      operation: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("replaceByHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          newText: z.string().describe("New text to replace with"),
          comment: z.string().optional().describe("Optional comment to add")
        }),
        z.object({
          type: z.literal("insertAfterHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          newText: z.string().describe("Text to insert")
        }),
        z.object({
          type: z.literal("insertBeforeHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          newText: z.string().describe("Text to insert")
        }),
        z.object({
          type: z.literal("commentByHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          comment: z.string().describe("Comment to add")
        })
      ]).describe("Edit operation to perform")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      operation: z.string().optional(),
      message: z.string().optional()
    })
  })
};