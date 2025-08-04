# Document Processor Architecture

## Overview
Unified architecture for document processing modes (Agent, Review, etc.) that share common infrastructure while allowing mode-specific configurations and behaviors.

## Core Components

### 1. DocumentProcessorMode Configuration
```typescript
interface DocumentProcessorMode {
  id: string;                          // "agent" | "review" | "edit"
  name: string;                         // Display name
  description: string;                  // Mode description
  allowedTools: string[];               // Tool names this mode can use
  systemPrompt?: string;                // Base system prompt
  userPromptConfig?: {                 // How user input is handled
    label: string;                      // UI label for input
    placeholder: string;                // Input placeholder
    type: "task" | "persona" | "mixed"; // Input type
  };
  outputConfig: {
    type: "stream" | "batch";          // How results are delivered
    format: "ui" | "document" | "both"; // Where results appear
    allowUserSelection?: boolean;       // Can user choose format
  };
  maxIterations?: number;              // Max tool use iterations
  requiresSelection?: boolean;         // Does mode need text selection
}
```

### 2. Mode Registry
```typescript
class ModeRegistry {
  private modes: Map<string, DocumentProcessorMode>;
  
  // Predefined modes
  static AGENT_MODE: DocumentProcessorMode = {
    id: "agent",
    name: "Agent Mode",
    description: "Autonomous document editing with all tools",
    allowedTools: ["*"], // All tools
    userPromptConfig: {
      label: "Task",
      placeholder: "Describe what you want the agent to do...",
      type: "task"
    },
    outputConfig: {
      type: "stream",
      format: "ui"
    },
    maxIterations: 10
  };
  
  static REVIEW_MODE: DocumentProcessorMode = {
    id: "review",
    name: "Review Mode",
    description: "Document review with comments",
    allowedTools: [
      "search_document",
      "analyze_structure", 
      "read_full_document",
      "add_comment",
      "get_comments"
    ],
    systemPrompt: "You are a document reviewer...",
    userPromptConfig: {
      label: "Review Persona & Instructions",
      placeholder: "e.g., 'Act as a technical editor focusing on clarity...'",
      type: "persona"
    },
    outputConfig: {
      type: "stream",
      format: "both",
      allowUserSelection: true
    },
    maxIterations: 15
  };
  
  static EDIT_MODE: DocumentProcessorMode = {
    id: "edit",
    name: "Edit Selection",
    description: "Edit selected text with context",
    allowedTools: [
      "search_document",
      "edit_content",
      "apply_formatting"
    ],
    userPromptConfig: {
      label: "Edit Instructions",
      placeholder: "How should the selection be modified?",
      type: "task"
    },
    outputConfig: {
      type: "batch",
      format: "document"
    },
    requiresSelection: true,
    maxIterations: 3
  };
}
```

### 3. Document Processor Service (Backend)
```javascript
class DocumentProcessorService {
  constructor(apiKey) {
    this.anthropic = new Anthropic({ apiKey });
    this.modeRegistry = new ModeRegistry();
  }
  
  async processStream(req, res) {
    const { 
      mode,           // Mode ID
      messages, 
      documentContext,
      customTools,
      outputFormat    // User's choice if applicable
    } = req.body;
    
    const modeConfig = this.modeRegistry.getMode(mode);
    
    // Filter tools based on mode
    const tools = this.filterToolsByMode(customTools, modeConfig);
    
    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(modeConfig, documentContext);
    
    // Stream processing with mode-specific handling
    await this.streamWithTools(
      messages,
      systemPrompt,
      tools,
      modeConfig,
      outputFormat,
      res
    );
  }
  
  filterToolsByMode(tools, mode) {
    if (mode.allowedTools.includes("*")) {
      return tools;
    }
    return tools.filter(tool => 
      mode.allowedTools.includes(tool.name)
    );
  }
  
  buildSystemPrompt(mode, context) {
    let prompt = mode.systemPrompt || this.defaultSystemPrompt;
    
    // Add mode-specific instructions
    if (mode.id === "review") {
      prompt += "\n\nYou are reviewing a document. Focus on providing constructive feedback.";
      prompt += "\nYou can add comments to highlight issues and suggest improvements.";
    }
    
    // Add context
    prompt += `\n\nDocument context:\n${JSON.stringify(context)}`;
    
    return prompt;
  }
}
```

### 4. Unified UI Component
```typescript
interface DocumentProcessorProps {
  mode: DocumentProcessorMode;
  onModeChange?: (mode: DocumentProcessorMode) => void;
}

const DocumentProcessor: React.FC<DocumentProcessorProps> = ({ mode }) => {
  const [input, setInput] = useState("");
  const [outputFormat, setOutputFormat] = useState(mode.outputConfig.format);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolUses, setToolUses] = useState<ToolUse[]>([]);
  const [streamContent, setStreamContent] = useState("");
  
  // Common processing logic
  const handleProcess = async () => {
    // Validate requirements
    if (mode.requiresSelection && !await hasSelection()) {
      showError("This mode requires text selection");
      return;
    }
    
    // Get document context
    const context = await getDocumentContext();
    
    // Start processing
    const messages = buildMessages(mode, input);
    
    await documentProcessorService.process({
      mode: mode.id,
      messages,
      documentContext: context,
      outputFormat,
      onToolUse: (tool) => setToolUses(prev => [...prev, tool]),
      onContent: (content) => setStreamContent(prev => prev + content),
      onComplete: () => setIsProcessing(false)
    });
  };
  
  return (
    <div className={styles.container}>
      {/* Mode-specific input */}
      <div className={styles.inputSection}>
        <Field label={mode.userPromptConfig.label}>
          <Textarea
            placeholder={mode.userPromptConfig.placeholder}
            value={input}
            onChange={(e, data) => setInput(data.value)}
            rows={mode.userPromptConfig.type === "persona" ? 5 : 3}
          />
        </Field>
        
        {/* Output format selector for Review mode */}
        {mode.outputConfig.allowUserSelection && (
          <RadioGroup
            value={outputFormat}
            onChange={(e, data) => setOutputFormat(data.value)}
          >
            <Radio value="ui" label="Show review in panel" />
            <Radio value="document" label="Add comments to document" />
            <Radio value="both" label="Both" />
          </RadioGroup>
        )}
        
        <Button 
          onClick={handleProcess}
          disabled={isProcessing || !input.trim()}
        >
          {mode.id === "review" ? "Start Review" : "Process"}
        </Button>
      </div>
      
      {/* Common output display */}
      <div className={styles.outputSection}>
        {outputFormat !== "document" && (
          <StreamDisplay 
            content={streamContent}
            toolUses={toolUses}
            mode={mode}
          />
        )}
      </div>
    </div>
  );
};
```

### 5. Tool Filtering in Frontend
```typescript
class DocumentProcessorService {
  async process(config: ProcessConfig) {
    const { mode, messages, documentContext } = config;
    
    // Get mode configuration
    const modeConfig = ModeRegistry.getMode(mode);
    
    // Get tools allowed for this mode
    const tools = this.getToolsForMode(modeConfig);
    
    // Send to backend with filtered tools
    await agentService.streamAgent(
      messages,
      documentContext,
      tools,
      config.onToolUse,
      config.onContent,
      config.onComplete
    );
  }
  
  private getToolsForMode(mode: DocumentProcessorMode): any[] {
    const registry = ToolRegistry.getInstance();
    
    if (mode.allowedTools.includes("*")) {
      return registry.getToolDefinitions();
    }
    
    return registry.getAllTools()
      .filter(tool => mode.allowedTools.includes(tool.name))
      .map(tool => tool.getDefinition());
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create ModeRegistry with predefined modes
2. Create DocumentProcessorService base class
3. Update backend to accept mode parameter

### Phase 2: Refactor Agent Mode
1. Convert AgentTab to use DocumentProcessor component
2. Update AgentService to extend DocumentProcessorService
3. Test existing functionality

### Phase 3: Implement Review Mode
1. Configure Review mode in registry
2. Add review-specific UI elements (persona input, output format)
3. Test with comment tools

### Phase 4: Unify Edit Mode
1. Convert EditTab to use shared infrastructure
2. Add edit-specific configurations
3. Test selection-based editing

## Benefits

1. **Code Reuse**: Single UI component and service handles all modes
2. **Extensibility**: Easy to add new modes by configuration
3. **Maintainability**: Changes to core logic benefit all modes
4. **Consistency**: Uniform behavior and UI across modes
5. **Flexibility**: Mode-specific customizations through configuration

## Migration Path

1. Keep existing components working during transition
2. Implement new architecture alongside old
3. Migrate one mode at a time
4. Remove old code once all modes migrated