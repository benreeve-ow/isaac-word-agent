# Isaac Word Add-in

Microsoft Word add-in component of Isaac - an intelligent document assistant powered by Claude AI.

## ✨ Features

### Multiple Processing Modes

- **Agent Mode** 🤖
  - Autonomous document editing with natural language instructions
  - Access to 15+ specialized tools
  - Real-time progress tracking
  
- **Review Mode** 📝
  - Comprehensive document analysis
  - Smart commenting system
  - Grammar, style, and structure feedback
  
- **Edit Mode** ✏️
  - Direct text improvements
  - Custom instructions support
  - Context-aware suggestions

### Advanced Capabilities

- **Track Changes Integration**: All edits tracked with Word's revision system
- **Style Matching**: Analyzes and matches document writing style
- **Tool System**: Modular architecture with specialized document tools
- **Debug Console**: Built-in debugging for troubleshooting
- **Real-time Streaming**: See Isaac's thinking process in real-time

## 🚀 Quick Start

### Prerequisites

- Microsoft Word (Desktop or Office 365)
- Node.js 16+ and npm
- Backend server running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Start development and load in Word
npm start
```

This will:
1. Start webpack dev server on `https://localhost:3001`
2. Open Microsoft Word
3. Automatically sideload Isaac

## 🏗️ Architecture

### Directory Structure

```
src/
├── tools/                    # Tool implementations
│   ├── core/                 # Tool registry and base classes
│   ├── editing/              # Text manipulation tools
│   ├── formatting/           # Style and format tools
│   ├── structure/            # Document structure tools
│   ├── review/               # Comment and review tools
│   └── analysis/             # Document analysis tools
├── modes/                    # Processing modes
│   ├── ModeRegistry.ts       # Mode management
│   └── types.ts              # Mode definitions
├── prompts/                  # AI prompt system
│   ├── components/           # Reusable prompt parts
│   ├── system/               # System prompts
│   └── core/                 # Prompt builder
├── services/                 # Core services
│   ├── WordService.ts        # Word API wrapper
│   ├── ClaudeService.ts      # Backend communication
│   ├── AgentService.ts       # Agent orchestration
│   └── DocumentProcessor.ts  # Unified processor
├── taskpane/                 # UI components
│   ├── components/           # React components
│   └── index.tsx             # Entry point
└── theme/                    # UI theming
```

### Tool System

Isaac's tools are modular TypeScript classes that:
- Extend `BaseTool` for consistent interface
- Define parameters with TypeScript types
- Execute within Word's context
- Return structured results

Example tool structure:
```typescript
export class SearchDocumentTool extends BaseTool {
  name = "search_document";
  description = "Search for text in the document";
  category = "search" as const;
  
  parameters = [
    { name: "pattern", type: "string", required: true },
    { name: "max_results", type: "number", default: 10 }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    // Implementation using Word.js APIs
  }
}
```

## 🛠️ Available Scripts

```bash
npm start           # Start dev server and load in Word
npm run dev-server  # Dev server only (no Word loading)
npm run build       # Production build
npm run lint        # Run ESLint
npm run validate    # Validate manifest.xml
npm run stop        # Stop debugging session
```

## 🔧 Configuration

### Document Settings

Each document stores its own settings:
- System prompts
- Style preferences
- Mode configurations

Access via the Config tab in the add-in.

### Development Settings

Configure in `config` object in package.json:
```json
{
  "app_to_debug": "word",
  "app_type_to_debug": "desktop",
  "dev_server_port": 3001
}
```

## 🐛 Debugging

### Built-in Debug Console

The debug console shows:
- Tool executions with parameters
- API calls and responses
- Error messages and stack traces
- Performance metrics

### Browser DevTools

1. Open DevTools in the task pane
2. Check Console for logs
3. Monitor Network tab for API calls
4. Use Sources for breakpoints

### Common Issues

**Add-in not loading**
- Clear Word cache: `rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef`
- Accept HTTPS certificate at `https://localhost:3001`
- Check manifest.xml is valid

**API Connection Failed**
- Verify backend is running on `https://localhost:3000`
- Check CORS configuration
- Ensure `.env` file exists in backend

**Tool Execution Errors**
- Check Word.run context is properly handled
- Verify tool parameters match definitions
- Review debug console for details

## 🎨 UI Components

### Main Components

- **App.tsx**: Root component with navigation
- **DocumentProcessor.tsx**: Unified mode handler
- **EditorTab.tsx**: Mode selection and execution
- **DebugConsole.tsx**: Real-time debugging output

### Theming

Uses Fluent UI with custom minimal theme:
- Dark header with Isaac branding
- Clean, professional interface
- Responsive design for various pane sizes

## 📡 Backend Integration

### API Communication

- Base URL: `https://localhost:3000`
- Authentication: API key on backend
- Format: JSON with streaming support

### Endpoints Used

- `POST /api/claude/improve` - Text improvements
- `POST /api/claude/analyze-style` - Style analysis
- `POST /api/agent/stream` - Agent streaming
- `GET /health` - Health check

## 🚀 Production Build

```bash
# Build for production
npm run build

# Output in dist/ folder
# Update manifest.xml URLs for production
# Deploy to HTTPS-enabled server
```

## 🔒 Security

- No API keys in client code
- HTTPS required for Office add-ins
- Input sanitization
- Secure communication with backend

## 📚 Resources

- [Office.js Documentation](https://docs.microsoft.com/en-us/office/dev/add-ins/reference/javascript-api-for-office)
- [Word API Reference](https://docs.microsoft.com/en-us/javascript/api/word)
- [Fluent UI React](https://developer.microsoft.com/en-us/fluentui)

---

Part of the Isaac Document Assistant ecosystem