import { UDV, UDVBlock, UDVCell } from "./UnifiedDoc";

export async function getOOXML(context: Word.RequestContext): Promise<string> {
  const body = context.document.body;
  const ooxml = body.getOoxml();
  await context.sync();
  return ooxml.value;
}

export function parseOOXMLToUDV(ooxml: string): UDV {
  const parser = new DOMParser();
  const doc = parser.parseFromString(ooxml, "application/xml");
  
  const blocks: UDVBlock[] = [];
  let paraCounter = 0;
  let tableCounter = 0;
  
  // Get the body element
  const bodyElement = doc.querySelector("w\\:body, body");
  if (!bodyElement) {
    throw new Error("No body element found in OOXML");
  }
  
  // Process all children in reading order
  const children = Array.from(bodyElement.children);
  
  for (const child of children) {
    const tagName = child.tagName.toLowerCase();
    
    if (tagName === "w:p" || tagName === "p") {
      // Process paragraph
      const text = extractTextFromParagraph(child);
      if (text.trim()) {
        blocks.push({
          kind: "paragraph",
          id: `p-${paraCounter}`,
          text: text
        });
        paraCounter++;
      }
    } else if (tagName === "w:tbl" || tagName === "tbl") {
      // Process table
      const rows = processTable(child, tableCounter);
      if (rows.length > 0) {
        blocks.push({
          kind: "table",
          id: `tbl-${tableCounter}`,
          tableIndex: tableCounter,
          rows: rows
        });
        tableCounter++;
      }
    }
  }
  
  return {
    version: "1.0",
    blocks: blocks,
    meta: {
      createdAtISO: new Date().toISOString()
    }
  };
}

function extractTextFromParagraph(element: Element): string {
  const textNodes = element.querySelectorAll("w\\:t, t");
  let text = "";
  
  textNodes.forEach(node => {
    text += node.textContent || "";
  });
  
  return text;
}

function processTable(tableElement: Element, tableIndex: number): UDVCell[][] {
  const rows: UDVCell[][] = [];
  const rowElements = tableElement.querySelectorAll("w\\:tr, tr");
  
  rowElements.forEach((rowElement, rowIndex) => {
    const cells: UDVCell[] = [];
    const cellElements = rowElement.querySelectorAll("w\\:tc, tc");
    
    cellElements.forEach((cellElement, colIndex) => {
      const paragraphs: { id: string; text: string }[] = [];
      const paraElements = cellElement.querySelectorAll("w\\:p, p");
      
      paraElements.forEach((paraElement, paraIndex) => {
        const text = extractTextFromParagraph(paraElement);
        if (text.trim()) {
          paragraphs.push({
            id: `tbl-${tableIndex}-r${rowIndex}-c${colIndex}-p${paraIndex}`,
            text: text
          });
        }
      });
      
      cells.push({
        row: rowIndex,
        col: colIndex,
        paragraphs: paragraphs
      });
    });
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  });
  
  return rows;
}

export async function buildUDVFromDocument(context: Word.RequestContext): Promise<UDV> {
  const ooxml = await getOOXML(context);
  return parseOOXMLToUDV(ooxml);
}