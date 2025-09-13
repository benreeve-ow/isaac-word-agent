# Context Window Optimization Plan
> Optimizing token usage while preserving full document visibility

## Core Principle
**Keep full document reads** - The agent needs complete context to make intelligent editing decisions. Instead, we'll optimize:
- Tool responses and formatting
- Memory management and compression
- Token counting accuracy
- Tool consolidation
- Response verbosity control

## Phase 1: Token Counting & Measurement 
**Timeline: 1 day** | **Impact: Foundation for all optimizations**

### 1.1 Implement Accurate Token Counting
- [ ] Install `tiktoken` or `js-tiktoken` package
- [ ] Replace char/4 approximation with actual tokenizer
- [ ] Add token counting to all tool responses
- [ ] Create token usage dashboard in debug console
- [ ] Log token usage per operation type

### 1.2 Add Token Metrics
- [ ] Track tokens per tool call
- [ ] Monitor context growth rate
- [ ] Identify token-heavy operations
- [ ] Create usage reports

**Deliverable**: Accurate token visibility for optimization decisions

## Phase 2: Response Optimization
**Timeline: 2 days** | **Impact: 30-40% token reduction**

### 2.1 Add Verbosity Control to Tools
```typescript
enum Verbosity {
  MINIMAL = "minimal",    // Just success/failure
  STANDARD = "standard",  // Normal response
  DETAILED = "detailed"   // Full details + metadata
}
```

- [ ] Add verbosity parameter to all tools
- [ ] Default to MINIMAL for edit operations
- [ ] Return only changes, not full content after edits
- [ ] Compress success messages

### 2.2 Optimize Tool Responses
- [ ] Remove redundant data from responses
- [ ] Use references instead of duplicating content
- [ ] Implement "diff-only" mode for edits
- [ ] Add `fields` parameter to select specific response data

### 2.3 Smart Response Formatting
- [ ] Strip unnecessary whitespace
- [ ] Use compact JSON representations
- [ ] Abbreviate repetitive structures
- [ ] Implement response compression

**Deliverable**: All tools return minimal necessary information

## Phase 3: Memory System Enhancement
**Timeline: 3 days** | **Impact: 50% reduction in long conversations**

### 3.1 Fix and Enable Compression
- [ ] Debug SummarizeTail compressor issues
- [ ] Re-enable with proper token counting
- [ ] Set compression threshold at 100k tokens
- [ ] Test with real conversation data

### 3.2 Intelligent Summarization
- [ ] Preserve critical information:
  - Current task and subtasks
  - Recent edits and changes
  - Document structure references
  - Unresolved TODOs
  - Error states and blockers
- [ ] Use structured summaries (not narrative)
- [ ] Implement priority-based retention

### 3.3 Working Memory Optimization
```typescript
// Enhanced schema
{
  plan: { items: [...] },
  status: { ... },
  documentState: {
    lastRead: timestamp,
    hotSections: string[],  // Recently edited areas
    changeLog: Change[],     // Recent modifications
    markers: Marker[]        // Important positions
  },
  context: {
    taskType: string,
    primaryFocus: string[],
    completedSteps: string[]
  }
}
```

- [ ] Track document state in memory
- [ ] Store edit patterns for reuse
- [ ] Cache frequently accessed data
- [ ] Implement memory checkpointing

**Deliverable**: Memory that intelligently compresses while preserving task context

## Phase 4: Tool Consolidation
**Timeline: 2 days** | **Impact: 20% reduction in tool definition overhead**

### 4.1 Merge Related Tools
- [ ] Combine search variants:
  ```typescript
  search_document(options: {
    mode: "exact" | "fuzzy" | "regex",
    caseSensitive?: boolean,
    wholeWord?: boolean,
    scope?: "all" | "selection" | "section"
  })
  ```

- [ ] Consolidate edit operations:
  ```typescript
  edit_content(operations: EditOp[])
  // Supports multiple edits in one call
  ```

- [ ] Unify table operations:
  ```typescript
  table_operation(action: "create" | "edit" | "delete" | "find")
  ```

### 4.2 Remove Redundant Tools
- [ ] Identify tools with <5% usage
- [ ] Merge overlapping functionality
- [ ] Create composite operations
- [ ] Reduce total tool count to ~15

**Deliverable**: Streamlined tool set with higher utility per tool

## Phase 5: Smart Context Management
**Timeline: 3 days** | **Impact: 30% reduction through intelligent caching**

### 5.1 Document State Tracking
- [ ] Cache document structure after first read
- [ ] Track sections modified in current session
- [ ] Implement "dirty flags" for changed content
- [ ] Reuse unchanged content references

### 5.2 Operation Batching
- [ ] Detect related operations and batch
- [ ] Combine multiple small edits
- [ ] Pipeline tool calls
- [ ] Reduce round-trip overhead

### 5.3 Predictive Caching
- [ ] Learn common operation sequences
- [ ] Pre-fetch likely next content
- [ ] Cache tool results for reuse
- [ ] Implement TTL for cached data

**Deliverable**: Intelligent caching layer reducing redundant operations

## Phase 6: Advanced Optimizations
**Timeline: 1 week** | **Impact: Additional 20-30% reduction**

### 6.1 Differential Updates
- [ ] Implement document diffing
- [ ] Send only changes between operations
- [ ] Use patch notation for edits
- [ ] Compress unchanged references

### 6.2 Context Window Packing
- [ ] Optimize message ordering
- [ ] Remove redundant tool calls from history
- [ ] Compress system messages
- [ ] Use references for repeated content

### 6.3 Adaptive Behavior
- [ ] Detect approaching context limits
- [ ] Auto-trigger compression
- [ ] Suggest context reset points
- [ ] Graceful degradation strategies

**Deliverable**: Self-optimizing context management

## Implementation Priority

### Week 1: Foundation
1. **Day 1**: Token counting (Phase 1)
2. **Days 2-3**: Response optimization (Phase 2)
3. **Days 4-5**: Memory system (Phase 3.1-3.2)

### Week 2: Core Optimizations  
1. **Days 1-2**: Complete memory system (Phase 3.3)
2. **Days 3-4**: Tool consolidation (Phase 4)
3. **Day 5**: Testing and refinement

### Week 3: Advanced Features
1. **Days 1-3**: Smart context management (Phase 5)
2. **Days 4-5**: Begin advanced optimizations (Phase 6)

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Avg tokens per operation | ~5000 | 2500 | Token counter |
| Operations before reset | ~20 | 60+ | Session tracking |
| Memory compression ratio | 0% | 60% | Before/after size |
| Tool response size | ~2KB | 500B | Response logger |
| Context utilization | 40% | 80% | Usage/limit ratio |

## Risk Mitigation

### Risk: Over-compression loses context
- **Mitigation**: Always preserve current task, recent edits, and error states
- **Validation**: Test with complex multi-step operations

### Risk: Tool consolidation confuses agent
- **Mitigation**: Clear parameter documentation, gradual rollout
- **Validation**: A/B test consolidated vs original tools

### Risk: Caching causes stale data
- **Mitigation**: TTL limits, dirty flags, invalidation on edits
- **Validation**: Verify cache coherence after each operation

## Technical Constraints
- Must work within Mastra's agent/memory APIs
- Cannot modify core Mastra packages  
- Frontend tools execute via SSE bridge
- Maintain backward compatibility
- Preserve full document reading capability

## Quick Wins (Implement First)
1. **Fix token counting** - Essential for measuring improvements
2. **Add verbosity control** - Immediate 30% reduction
3. **Return only changes** - Stop sending full content after edits
4. **Enable compression** - Activate existing SummarizeTail
5. **Batch operations** - Reduce round-trip overhead

## Testing Strategy
- Create benchmark documents of varying sizes
- Measure token usage for standard operations
- Track performance across optimization phases
- Monitor for regression in capability
- User feedback on response quality

## Notes
- Full document reads remain unchanged - this is intentional
- Focus on reducing auxiliary token usage
- Memory and response optimization have highest ROI
- Tool consolidation should preserve all capabilities
- Monitor actual vs estimated token usage continuously

---
*Last updated: 2025-01-13*  
*Status: Ready for implementation*