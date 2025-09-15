# Isaac Word Agent - TODO List

## 🔴 High Priority

### Tool Execution Limits
- [ ] Add UI notification when agent reaches maxSteps limit (currently 100)
- [ ] Implement "Continue?" prompt when tool limit is reached
- [ ] Allow user to increase limit dynamically for complex operations
- [ ] Add progress indicator showing tool call count (e.g., "23/100 operations")

### Formatting Detection & Conversion
- [ ] Improve space-aligned table detection algorithm (currently simplified)
- [ ] Add support for detecting and converting mathematical formulas to Word equation objects
- [ ] Enhance list detection to handle nested lists and mixed list types
- [ ] Add detection for code blocks and apply appropriate monospace formatting

### Track Changes
- [x] Enable track changes for all tool operations
- [ ] Add user preference to toggle track changes on/off
- [ ] Implement batch accept/reject changes functionality

## 🟡 Medium Priority

### Performance & Optimization
- [ ] Implement caching for frequently used document reads
- [ ] Add batching for multiple similar operations (e.g., multiple paragraph style changes)
- [ ] Optimize anchor text search algorithm for large documents
- [ ] Add document size warnings and handling for very large files

### Error Handling & Recovery
- [ ] Improve error messages when anchor text is not found
- [ ] Add automatic retry with alternative anchors
- [ ] Implement undo/rollback functionality for failed operations
- [ ] Add validation before destructive operations (delete, replace)

### User Experience
- [ ] Add preview mode for formatting changes
- [ ] Implement custom style templates
- [ ] Add keyboard shortcuts for common operations
- [ ] Create formatting presets (e.g., "APA Style", "Business Report")

## 🟢 Low Priority / Nice to Have

### Advanced Features
- [ ] Add support for headers/footers editing
- [ ] Implement cross-reference management
- [ ] Add bibliography/citation formatting
- [ ] Support for document templates

### Integration & Export
- [ ] Add export to PDF with formatting preserved
- [ ] Implement import from Markdown/HTML
- [ ] Add integration with version control systems
- [ ] Support for collaborative editing features

### Developer Experience
- [ ] Add comprehensive unit tests for all tools
- [ ] Create integration tests for complex workflows
- [ ] Improve TypeScript types coverage (currently ~60%)
- [ ] Add performance benchmarks

## 🐛 Known Issues

### Current Bugs
- [x] First list item had extra indentation (fixed)
- [x] Console.log statements throughout codebase (cleaned)
- [ ] Table styles limited by Word API availability
- [ ] Formula detection works but cannot auto-convert to equation objects

### Limitations
- [ ] Word equation editor API not available in Office.js
- [ ] Some table styles not available across all Word versions
- [ ] Search string limit of 150 characters in Word API

## 📝 Documentation Needed

- [ ] Create user guide for formatting features
- [ ] Document all available tool parameters
- [ ] Add troubleshooting guide
- [ ] Create video tutorials for common workflows

## 🔄 Recently Completed

- [x] Added track changes to all editing tools
- [x] Created formatting style guide in system prompt
- [x] Fixed list indentation issue
- [x] Added table detection tool
- [x] Removed console.log statements
- [x] Increased tool execution limit to 100
- [x] Added comprehensive type system

---

Last Updated: 2025-01-15
Priority Levels: 🔴 High | 🟡 Medium | 🟢 Low | 🐛 Bugs | 📝 Docs | 🔄 Done