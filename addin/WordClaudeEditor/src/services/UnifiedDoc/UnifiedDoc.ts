export type UDV = {
  version: "1.0";
  blocks: UDVBlock[]; // in reading order
  meta: { createdAtISO: string; docTitle?: string };
};

export type UDVBlock =
  | { kind: "paragraph"; id: string; text: string; marks?: Mark[] }
  | { kind: "table"; id: string; tableIndex: number; rows: UDVCell[][] };

export type UDVCell = {
  row: number;
  col: number;
  paragraphs: { id: string; text: string }[];
};

export type Mark = { start: number; end: number; tag: string };

export type UDVPath = 
  | { kind: "paragraph"; paraIndex: number }
  | { kind: "cell"; tableIndex: number; rowIndex: number; colIndex: number; paraInCell?: number };

export type UDVHit = {
  hitId: string;
  path: UDVPath;
  offStart: number;
  offEnd: number;
  excerpt: string;
};

export class UnifiedDocumentView {
  private udv: UDV | null = null;
  private searchIndex: Map<string, UDVHit[]> = new Map();

  constructor() {}

  setUDV(udv: UDV) {
    this.udv = udv;
    this.buildSearchIndex();
  }

  getUDV(): UDV | null {
    return this.udv;
  }

  private buildSearchIndex() {
    if (!this.udv) return;
    
    this.searchIndex.clear();
    let paraCounter = 0;

    for (const block of this.udv.blocks) {
      if (block.kind === "paragraph") {
        const words = this.tokenize(block.text);
        for (const word of words) {
          const hit: UDVHit = {
            hitId: `hit-${Date.now()}-${Math.random()}`,
            path: { kind: "paragraph", paraIndex: paraCounter },
            offStart: 0,
            offEnd: block.text.length,
            excerpt: block.text.substring(0, 80)
          };
          
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, []);
          }
          this.searchIndex.get(word)!.push(hit);
        }
        paraCounter++;
      } else if (block.kind === "table") {
        for (let r = 0; r < block.rows.length; r++) {
          for (let c = 0; c < block.rows[r].length; c++) {
            const cell = block.rows[r][c];
            for (let p = 0; p < cell.paragraphs.length; p++) {
              const para = cell.paragraphs[p];
              const words = this.tokenize(para.text);
              
              for (const word of words) {
                const hit: UDVHit = {
                  hitId: `hit-${Date.now()}-${Math.random()}`,
                  path: { 
                    kind: "cell", 
                    tableIndex: block.tableIndex, 
                    rowIndex: r, 
                    colIndex: c, 
                    paraInCell: p 
                  },
                  offStart: 0,
                  offEnd: para.text.length,
                  excerpt: para.text.substring(0, 80)
                };
                
                if (!this.searchIndex.has(word)) {
                  this.searchIndex.set(word, []);
                }
                this.searchIndex.get(word)!.push(hit);
              }
            }
          }
        }
      }
    }
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  }

  search(query: string, mode: "literal" | "regex" = "literal", maxHits = 40): {
    hits: UDVHit[];
    totalHits: number;
    paragraphCount: number;
    tableCellCount: number;
  } {
    if (!this.udv) {
      return { hits: [], totalHits: 0, paragraphCount: 0, tableCellCount: 0 };
    }

    const hits: UDVHit[] = [];
    let paragraphCount = 0;
    let tableCellCount = 0;

    if (mode === "literal") {
      const words = this.tokenize(query);
      for (const word of words) {
        const wordHits = this.searchIndex.get(word) || [];
        hits.push(...wordHits);
      }
    } else {
      // Regex mode
      const regex = new RegExp(query, "gi");
      
      for (const block of this.udv.blocks) {
        if (block.kind === "paragraph") {
          const matches = Array.from(block.text.matchAll(regex));
          for (const match of matches) {
            if (match.index !== undefined) {
              hits.push({
                hitId: `hit-${Date.now()}-${Math.random()}`,
                path: { kind: "paragraph", paraIndex: paragraphCount },
                offStart: match.index,
                offEnd: match.index + match[0].length,
                excerpt: this.getExcerpt(block.text, match.index, match[0].length)
              });
            }
          }
          paragraphCount++;
        } else if (block.kind === "table") {
          for (let r = 0; r < block.rows.length; r++) {
            for (let c = 0; c < block.rows[r].length; c++) {
              const cell = block.rows[r][c];
              tableCellCount++;
              
              for (let p = 0; p < cell.paragraphs.length; p++) {
                const para = cell.paragraphs[p];
                const matches = Array.from(para.text.matchAll(regex));
                
                for (const match of matches) {
                  if (match.index !== undefined) {
                    hits.push({
                      hitId: `hit-${Date.now()}-${Math.random()}`,
                      path: { 
                        kind: "cell", 
                        tableIndex: block.tableIndex, 
                        rowIndex: r, 
                        colIndex: c, 
                        paraInCell: p 
                      },
                      offStart: match.index,
                      offEnd: match.index + match[0].length,
                      excerpt: this.getExcerpt(para.text, match.index, match[0].length)
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      hits: hits.slice(0, maxHits),
      totalHits: hits.length,
      paragraphCount,
      tableCellCount
    };
  }

  private getExcerpt(text: string, start: number, length: number): string {
    const contextBefore = 30;
    const contextAfter = 50;
    const excerptStart = Math.max(0, start - contextBefore);
    const excerptEnd = Math.min(text.length, start + length + contextAfter);
    
    let excerpt = text.substring(excerptStart, excerptEnd);
    if (excerptStart > 0) excerpt = "..." + excerpt;
    if (excerptEnd < text.length) excerpt = excerpt + "...";
    
    return excerpt;
  }

  async resolveUDVHitToRange(
    context: Word.RequestContext,
    path: UDVPath,
    offStart: number,
    offEnd: number
  ): Promise<Word.Range> {
    if (path.kind === "paragraph") {
      // Get the paragraph by index
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();
      
      if (path.paraIndex >= paragraphs.items.length) {
        throw new Error(`Paragraph index ${path.paraIndex} out of bounds`);
      }
      
      const para = paragraphs.items[path.paraIndex];
      para.load("text");
      await context.sync();
      
      // Extract the text snippet for searching
      const snippet = para.text.substring(offStart, offEnd);
      
      // Search within the paragraph
      const searchResults = para.search(snippet, { matchCase: true });
      searchResults.load("items");
      await context.sync();
      
      if (searchResults.items.length > 0) {
        return searchResults.items[0];
      }
      
      throw new Error(`Could not find text in paragraph ${path.paraIndex}`);
      
    } else if (path.kind === "cell") {
      // Access the table and cell
      const tables = context.document.body.tables;
      tables.load("items");
      await context.sync();
      
      if (path.tableIndex >= tables.items.length) {
        throw new Error(`Table index ${path.tableIndex} out of bounds`);
      }
      
      const table = tables.items[path.tableIndex];
      table.load("rows");
      await context.sync();
      
      const row = table.rows.items[path.rowIndex];
      row.load("cells");
      await context.sync();
      
      const cell = row.cells.items[path.colIndex];
      const cellBody = cell.body;
      
      cellBody.load("text");
      await context.sync();
      
      // Extract the text snippet
      const snippet = cellBody.text.substring(offStart, offEnd);
      
      // Search within the cell
      const searchResults = cellBody.search(snippet, { matchCase: true });
      searchResults.load("items");
      await context.sync();
      
      if (searchResults.items.length > 0) {
        return searchResults.items[0];
      }
      
      throw new Error(`Could not find text in table cell [${path.rowIndex}][${path.colIndex}]`);
    }
    
    throw new Error("Invalid path kind");
  }
}

export const udvInstance = new UnifiedDocumentView();