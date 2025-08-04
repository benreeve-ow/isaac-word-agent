# Prompt Abstraction System - Implementation Plan

## Overview
Create a centralized, modular prompt management system that separates prompt logic from code, enables reuse, and makes prompt changes trackable and testable.

## Goals
1. **Centralization**: All prompts in one location
2. **Modularity**: Reusable prompt components
3. **Versioning**: Track prompt changes separately from code
4. **Type Safety**: TypeScript interfaces for prompt parameters
5. **DRY Principle**: Eliminate prompt duplication
6. **Easy Testing**: Test prompts independently
7. **Hot Reloading**: Change prompts without rebuilding (development)

## Proposed Architecture

### 1. Directory Structure
```
src/prompts/
├── core/
│   ├── PromptManager.ts         # Central prompt management
│   ├── PromptBuilder.ts         # Compose prompts from parts
│   ├── PromptTypes.ts           # TypeScript interfaces
│   └── PromptValidator.ts       # Validate prompt parameters
├── system/
│   ├── agent.prompts.ts         # Agent system prompts
│   ├── editor.prompts.ts        # Editor mode prompts
│   ├── review.prompts.ts        # Review mode prompts
│   └── base.prompts.ts          # Shared base prompts
├── components/
│   ├── instructions.ts          # Reusable instruction blocks
│   ├── constraints.ts           # Common constraints
│   ├── examples.ts              # Example patterns
│   └── formatting.ts            # Formatting guidelines
├── templates/
│   ├── improvement.template.ts  # Text improvement templates
│   ├── review.template.ts       # Review templates
│   ├── analysis.template.ts     # Analysis templates
│   └── generation.template.ts   # Content generation templates
└── index.ts                      # Public API
```

### 2. Core Components

#### 2.1 Prompt Manager
```typescript
interface PromptManager {
  // Get a complete prompt by ID
  getPrompt(id: string, params?: PromptParams): string;
  
  // Build prompt from components
  buildPrompt(components: PromptComponent[]): string;
  
  // Validate prompt parameters
  validateParams(id: string, params: any): boolean;
  
  // Get all prompts for a category
  getCategory(category: string): PromptCollection;
  
  // Hot reload in development
  reloadPrompts(): void;
}
```

#### 2.2 Prompt Builder
```typescript
class PromptBuilder {
  private components: PromptComponent[] = [];
  
  // Add components
  addSystemContext(context: SystemContext): this;
  addInstructions(instructions: string[]): this;
  addConstraints(constraints: string[]): this;
  addExamples(examples: Example[]): this;
  addFormat(format: OutputFormat): this;
  
  // Build final prompt
  build(): string;
  
  // Build with template
  buildFromTemplate(templateId: string, params: any): string;
}
```

#### 2.3 Prompt Components
```typescript
interface PromptComponent {
  type: 'system' | 'instruction' | 'constraint' | 'example' | 'format';
  content: string;
  priority?: number;
  conditional?: (params: any) => boolean;
}

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  components: PromptComponent[];
  parameters?: ParameterDefinition[];
  examples?: UsageExample[];
}
```

### 3. Implementation Examples

#### 3.1 Agent System Prompt
```typescript
// src/prompts/system/agent.prompts.ts
export const AGENT_PROMPTS = {
  main: {
    id: 'agent.main',
    name: 'Main Agent System Prompt',
    category: 'agent',
    version: '1.0.0',
    components: [
      {
        type: 'system',
        content: AGENT_IDENTITY,
      },
      {
        type: 'instruction',
        content: AGENT_CAPABILITIES,
      },
      {
        type: 'constraint',
        content: SEARCH_CONSTRAINTS,
      },
      {
        type: 'format',
        content: TOOL_USAGE_FORMAT,
      }
    ]
  }
};

// Reusable components
const AGENT_IDENTITY = `
You are DNAgent, an autonomous document editing assistant for Microsoft Word.
You have the ability to search, analyze, and edit documents using specialized tools.
`;

const SEARCH_CONSTRAINTS = `
## CRITICAL: Search Constraints
- MAXIMUM search_text length: 150 characters (Word API limit)
- Search for UNIQUE SHORT PHRASES (1-2 sentences max)
- NEVER search for entire paragraphs
- Break large edits into multiple smaller operations
`;
```

#### 3.2 Review Mode Prompts
```typescript
// src/prompts/system/review.prompts.ts
export const REVIEW_PROMPTS = {
  general: {
    id: 'review.general',
    name: 'General Review',
    components: [
      BASE_REVIEW_INSTRUCTION,
      {
        type: 'instruction',
        content: 'Review for clarity, coherence, accuracy, and overall quality.'
      },
      REVIEW_OUTPUT_FORMAT
    ]
  },
  
  technical: {
    id: 'review.technical',
    name: 'Technical Review',
    components: [
      BASE_REVIEW_INSTRUCTION,
      {
        type: 'instruction',
        content: 'Focus on technical accuracy, terminology, and methodological soundness.'
      },
      REVIEW_OUTPUT_FORMAT
    ]
  },
  
  custom: {
    id: 'review.custom',
    name: 'Custom Review',
    parameters: ['customInstructions', 'includePositive'],
    components: [
      BASE_REVIEW_INSTRUCTION,
      {
        type: 'instruction',
        content: (params) => params.customInstructions
      },
      {
        type: 'constraint',
        content: (params) => params.includePositive 
          ? 'Include both positive feedback and areas for improvement.'
          : 'Focus only on issues and areas needing improvement.',
        conditional: (params) => params.customInstructions
      },
      REVIEW_OUTPUT_FORMAT
    ]
  }
};
```

#### 3.3 Shared Components
```typescript
// src/prompts/components/instructions.ts
export const INSTRUCTIONS = {
  preserveFormatting: `
    Preserve the document's existing formatting and structure.
    Match the style and tone of the surrounding text.
  `,
  
  trackChanges: `
    All edits will be tracked with Word's Track Changes feature.
    The user can accept or reject individual changes.
  `,
  
  beSpecific: `
    Provide specific, actionable feedback.
    Reference exact text locations when possible.
  `
};

// src/prompts/components/constraints.ts
export const CONSTRAINTS = {
  searchLength: {
    content: 'Maximum search text: 150 characters',
    priority: 1
  },
  
  commentSpecificity: {
    content: 'Each comment must only discuss its attached text',
    priority: 1
  },
  
  editSize: {
    content: 'Make small, focused edits rather than large replacements',
    priority: 2
  }
};
```

### 4. Usage in Code

#### 4.1 In Services
```typescript
// Before (hardcoded)
class AgentService {
  getSystemPrompt() {
    return `You are DNAgent, an autonomous document editing assistant...
    [hundreds of lines of prompt text]`;
  }
}

// After (abstracted)
class AgentService {
  constructor(private promptManager: PromptManager) {}
  
  getSystemPrompt(context?: AgentContext) {
    return this.promptManager.getPrompt('agent.main', {
      documentType: context?.documentType,
      userPreferences: context?.preferences
    });
  }
}
```

#### 4.2 In Components
```typescript
// Before
const ReviewTab = () => {
  const buildReviewPrompt = () => {
    let prompt = "Review this document for...";
    // Complex prompt building logic mixed with UI code
  };
};

// After
const ReviewTab = () => {
  const promptManager = usePromptManager();
  
  const buildReviewPrompt = () => {
    return promptManager.buildPrompt([
      promptManager.getComponent('review.base'),
      promptManager.getComponent(`review.${reviewType}`),
      customInstructions && promptManager.getComponent('review.custom', {
        instructions: customInstructions
      })
    ]);
  };
};
```

### 5. Configuration File Support

#### 5.1 JSON/YAML Prompt Files (Optional)
```yaml
# prompts/configs/review.yaml
review:
  general:
    name: "General Review"
    components:
      - type: system
        content: !include ../components/review-base.txt
      - type: instruction
        content: "Review for clarity, coherence, accuracy"
      - type: format
        content: !include ../components/review-format.txt
```

#### 5.2 Environment-Specific Prompts
```typescript
// Support different prompts for dev/staging/prod
const PROMPT_CONFIG = {
  development: {
    verboseLogging: true,
    includeDebugInfo: true
  },
  production: {
    verboseLogging: false,
    includeDebugInfo: false
  }
};
```

### 6. Testing Strategy

#### 6.1 Prompt Testing
```typescript
// tests/prompts/agent.test.ts
describe('Agent Prompts', () => {
  it('should include search constraints', () => {
    const prompt = promptManager.getPrompt('agent.main');
    expect(prompt).toContain('150 characters');
  });
  
  it('should build review prompt with custom instructions', () => {
    const prompt = promptManager.getPrompt('review.custom', {
      customInstructions: 'Focus on grammar',
      includePositive: false
    });
    expect(prompt).toContain('Focus on grammar');
    expect(prompt).toContain('only on issues');
  });
});
```

### 7. Migration Plan

#### Phase 1: Setup Infrastructure (Day 1)
1. Create directory structure
2. Implement PromptManager and PromptBuilder
3. Create TypeScript interfaces

#### Phase 2: Extract Existing Prompts (Day 2-3)
1. Identify all hardcoded prompts in:
   - `backend/services/agent-service.js`
   - `src/services/ReviewService.ts`
   - `src/services/ClaudeService.ts`
   - Component files
2. Extract to appropriate prompt files
3. Identify reusable components

#### Phase 3: Refactor Services (Day 4)
1. Update services to use PromptManager
2. Remove hardcoded prompts
3. Add parameter validation

#### Phase 4: Testing & Documentation (Day 5)
1. Write tests for all prompts
2. Document prompt system
3. Create prompt editing guide

### 8. Benefits

1. **Maintainability**: Change prompts without touching code
2. **Reusability**: Share components across different modes
3. **Testability**: Test prompts in isolation
4. **Versioning**: Track prompt changes in git
5. **Consistency**: Ensure consistent instructions across features
6. **Experimentation**: Easy A/B testing of prompts
7. **Documentation**: Self-documenting prompt structure

### 9. Future Enhancements

1. **Prompt Versioning**: Support multiple versions with rollback
2. **User Customization**: Allow users to modify prompts
3. **Prompt Library**: Share prompts between projects
4. **Analytics**: Track which prompts perform best
5. **Hot Reloading**: Change prompts without restart in development
6. **Prompt Playground**: UI for testing prompts

## Decision Points

1. **Storage Format**: TypeScript vs JSON/YAML for prompt definitions?
   - Recommendation: TypeScript for type safety, with optional YAML support

2. **Runtime Loading**: Compile-time vs runtime prompt loading?
   - Recommendation: Compile-time for production, runtime for development

3. **Component Granularity**: How small should components be?
   - Recommendation: Paragraph-level for instructions, sentence-level for constraints

4. **Parameter Validation**: Runtime vs compile-time validation?
   - Recommendation: Both - TypeScript for compile-time, schema validation for runtime

## Next Steps

1. Review and approve this plan
2. Create the directory structure
3. Start with Phase 1 implementation
4. Migrate one service as proof of concept
5. Iterate based on learnings

This abstraction will make the codebase much more maintainable and allow for rapid prompt iteration without code changes.