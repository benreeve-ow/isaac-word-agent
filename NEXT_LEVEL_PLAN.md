# 🚀 Next Level Optimization Plan

## Current State
- **Phase 1 DONE**: Accurate token counting with tiktoken
- **Working**: Full document editing with 25+ tools
- **Challenge**: Context fills up with redundant document versions

## Priority Optimizations

### 1. **Response Optimization** ✅
Remove unnecessary data from tool responses:
- [x] Stop returning full document content after edits - **Already minimal!**
- [x] Return only confirmation + what changed - **Already doing this**
- [x] Remove duplicate data between response fields - **Clean responses**
- [x] Let the model decide what level of detail to return (no artificial verbosity controls)

### 2. **Memory Compression** ⚠️ BLOCKED
Enable smart compression when context grows:
- [x] Set compression threshold at 120k tokens - **Config updated**
- [ ] Re-enable SummarizeTail - **BLOCKED: Mastra interface mismatch**
- [ ] Smart summarization that preserves:
  - Current task and subtasks
  - Recent edits and changes  
  - Unresolved errors and TODOs
  - Document structure/outline
- [ ] Drop redundant confirmations and old tool calls

### 3. **Context Management** 
Keep context clean and leverage Anthropic's caching:
- [ ] **Document Deduplication**: Remove old document versions from context
- [ ] **Latest Document Section**: Maintain one canonical "current document" in context
- [ ] **Large Document Handling**: 
  - If document > 50k tokens: keep relevant section + document summary
  - Track which section is "active" in working memory
- [ ] **Prompt Caching Strategy** (for cost savings):
  - Structure prompts with stable prefix (system prompt, document)
  - Variable suffix (recent conversation, tool calls)
  - This enables Anthropic's prompt caching discount

### 4. **Parallel Tool Execution** (CRITICAL) ✅
Claude ALREADY supports parallel tool calls natively! We need to:
- [x] **Confirmed**: Claude can make multiple tool calls in one response
- [x] **Update system prompts**: Added parallel execution guidance
- [ ] **Verify Mastra support**: Ensure streamHandler processes parallel calls correctly
- [ ] **Test parallel execution**: Measure actual token savings
- [ ] **Expected savings**: 3-5x reduction for multi-edit operations

Example: Instead of sequential calls, Claude can do:
```
Turn 1: [insert_text(), replace_text(), delete_text()] → All results at once
```

### 5. **Lower-Level Formatting Tools** 
Provide granular formatting control:

#### Currently Implemented ✅
- [x] `apply_style` - Basic text formatting (bold, italic, underline, strikethrough, super/subscript)
- [x] `apply_style` - Paragraph styles (Heading1-6, Normal, Title, Subtitle, Quote)

#### Missing Formatting Capabilities (TODO)
- [x] **List Tools**:
  - [x] `create_list` - Convert text to bulleted/numbered list ✅
  - [x] Control bullet/numbering style (integrated in create_list) ✅
  - [ ] `adjust_list_level` - Increase/decrease list indentation level
  
- [x] **Advanced Text Formatting**:
  - [x] `set_font_properties` - Change font family, size, and color ✅
  - [x] Apply highlighting to text (integrated in set_font_properties) ✅
  - [ ] `set_text_effects` - Small caps, all caps, hidden text, etc.
  
- [x] **Paragraph Formatting**:
  - [x] `set_alignment` - Left, center, right, justify text alignment ✅
  - [ ] `set_line_spacing` - Single, 1.5, double, custom spacing
  - [ ] `set_indentation` - First line, hanging, left/right margins
  - [ ] `set_paragraph_spacing` - Before/after paragraph spacing
  
- [x] **Document Structure**:
  - [x] `insert_break` - Page break, section break, column break ✅
  - [ ] `insert_formula` - Add properly formatted mathematical equations
  - [ ] `insert_footnote` - Add footnote/endnote at current position
  - [ ] `insert_link` - Add hyperlink to text
  - [ ] `insert_cross_reference` - Reference to heading/figure/table
  - [ ] `update_field` - Update field codes (TOC, references, etc.)
  
- [ ] **Table Formatting** (extend current tools):
  - [ ] `format_table_cell` - Cell borders, shading, alignment
  - [ ] `merge_table_cells` - Merge/split table cells
  - [ ] `set_table_style` - Apply predefined table styles

### 6. **Document Structure Tools** (NEW)
- [ ] `structure.toc` - Generate/update table of contents
- [ ] `structure.outline` - Get/modify document outline
- [ ] `structure.sections` - Reorganize sections, promote/demote headings
- [ ] `structure.index` - Create document index

## Implementation Notes

### Response Optimization Details
Instead of complex verbosity controls, simply:
- Edit operations return: `{ success: true, changedParagraphs: 3 }`
- Read operations return document content (that's their purpose)
- Search operations return matches with minimal context
- Never return the same data in multiple fields

### Context Management Details
**Problem**: Multiple document reads create redundant copies in context
**Solution**: 
1. Tag document reads with timestamp
2. Before new read, mark old ones as "superseded"
3. Compression removes superseded content first
4. Keep latest document read as "canonical"

**For Anthropic Caching**:
- Structure messages so document is in early messages (stable)
- Recent edits and tool calls go at end (volatile)
- This can reduce costs by 90% for cached portions

### Memory Schema Enhancement
```typescript
{
  documentState: {
    lastFullRead: timestamp,
    currentSection: string,    // For large docs
    documentSummary: string,    // For large docs
    recentEdits: Edit[],        // Last 10 edits
    dirtyParagraphs: string[]   // Changed since last read
  }
}
```

### Tool Consolidation Example
Instead of:
- read_document
- read_unified_document  
- read_selection
- get_document_stats

Have one:
```typescript
document.ops({
  operation: "read" | "stats" | "selection",
  options: { includeComments?, format?, selection? }
})
```

## Quick Wins (Do First)

1. **Stop returning full document after edits** - Immediate 30% reduction
2. **Enable compression at 120k** - Prevents context overflow
3. **Add format.tidy tool** - High user value
4. **Remove document duplicates** - Clean up context

## Development Phases

### Phase 1: Response Optimization (1 day)
- Update all edit tools to return minimal confirmations
- Remove redundant response fields
- Test token reduction

### Phase 2: Memory & Context (2 days)
- Enable SummarizeTail at 120k
- Implement document deduplication
- Add document state tracking

### Phase 3: Formatting Tools (2 days)
- Implement core formatting tools
- Add document structure tools
- Test with various document types

### Phase 4: Parallel Execution (2 days)
- Implement batch edit tool
- Test parallel tool calling if supported
- Update prompts to encourage batching
- Measure token savings

## Expected Outcomes
- 60-70% reduction in token usage
- 3-4x more operations before context limit
- Full formatting capabilities
- Cleaner, more maintainable codebase
- Cost savings via prompt caching

---

*Focus: Clear context, smart compression, comprehensive formatting tools*