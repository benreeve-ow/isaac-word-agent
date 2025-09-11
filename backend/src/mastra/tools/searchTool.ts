import { z } from "zod";
import { toolBus } from "../../bridge/toolBus";

const searchSchema = z.object({
  query: z.string().describe("Search query"),
  mode: z.enum(["literal", "regex"]).default("literal").describe("Search mode"),
  maxHits: z.number().default(40).describe("Maximum number of hits to return")
});

export const searchTools = {
  "doc.search": {
    description: "Search the document using the UDV index",
    parameters: searchSchema,
    handler: async ({ query, mode, maxHits }: z.infer<typeof searchSchema>) => {
      const callId = `doc-search-${Date.now()}`;
      toolBus.emitCall({ 
        id: callId, 
        tool: "doc.search", 
        payload: { query, mode, maxHits } 
      });
      
      const result = await toolBus.waitFor(callId);
      
      if (!result.ok) {
        throw new Error(result.error || "Search failed");
      }
      
      const hits = result.data?.hits || [];
      const totalHits = result.data?.totalHits || hits.length;
      
      // If we have more hits than maxHits, return a summary
      if (totalHits > maxHits) {
        return {
          summary: `${totalHits} matches across ${result.data?.paragraphCount || 0} paragraphs and ${result.data?.tableCellCount || 0} table cells`,
          topK: hits.slice(0, maxHits),
          omitted: totalHits - maxHits
        };
      }
      
      return { hits, totalHits };
    }
  }
};