# Word Claude Editor

A Microsoft Word add-in that integrates Claude AI to help users improve their writing with custom instructions, track changes integration, and an autonomous agent mode with modular tools.

## Features

- ✏️ **Custom AI Instructions** - Enter specific instructions for how Claude should improve your text
- 🤖 **Autonomous Agent Mode** - Let Claude automatically edit documents using a suite of tools
- 🛠️ **Modular Tool System** - 11+ tools for editing, formatting, review, and document structure
- 📝 **Track Changes Integration** - All edits are tracked with Word's native revision system
- 🎨 **Style Matching** - Analyze and match your document's writing style
- 📊 **Context Management** - Smart context window handling (up to 140k tokens)
- 🔍 **Real-time Debug Console** - Built-in debugging for troubleshooting

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Microsoft Word (Desktop or Office 365)
- Anthropic API key

### 1. Set up the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env

# Start the HTTPS server
npm start
```

The backend will run on `https://localhost:3000` using the Office add-in certificates.

### 2. Set up the Add-in

```bash
# Navigate to add-in directory
cd addin/WordClaudeEditor

# Install dependencies
npm install

# Start the development server
npm run dev-server
```

The add-in dev server will run on `https://localhost:3001`.

### 3. Load the Add-in in Word

```bash
# In the add-in directory, run:
npm start
```

This will:
1. Start the dev server
2. Open Word
3. Automatically sideload the add-in

## Usage Modes

### Edit Mode (Manual)

1. **Select Text** - Highlight text in your Word document
2. **Enter Instructions** - Type your improvement instructions or click an example
3. **Click "Edit Text"** - Send to Claude API
4. **Changes Applied** - Text is replaced with track changes enabled

### Agent Mode (Autonomous)

1. **Enter Task** - Describe what you want the agent to do
2. **Click "Run Agent"** - Agent analyzes the document and executes tools
3. **Watch Progress** - See each tool execution in real-time
4. **Review Changes** - All edits are tracked in Word

#### Example Agent Tasks

- "Find all instances of 'AI' and replace with 'artificial intelligence'"
- "Add a summary table after the introduction"
- "Make all headings bold and apply Heading 2 style"
- "Insert page breaks between major sections"
- "Analyze the document structure and add comments for improvements"

## Tool System Architecture

### How It Works

The add-in uses a **modular tool system** where:

1. **Frontend defines tools** - Each tool is a TypeScript class that manipulates Word
2. **Backend orchestrates** - Claude decides which tools to use based on the task
3. **Execution is client-side** - Tools run in the browser context with access to Word APIs

```
User Task → Claude (Backend) → Tool Decision → Frontend Execution → Word Document
```

### Available Tools

| Tool | Category | Description |
|------|----------|-------------|
| `search_document` | Search | Find text with context |
| `edit_content` | Editing | Replace text with track changes |
| `insert_content` | Editing | Insert at various positions |
| `apply_formatting` | Formatting | Bold, italic, underline, highlight |
| `apply_style` | Formatting | Apply Word styles (Heading 1-4, Normal, etc.) |
| `add_comment` | Review | Add review comments with priority |
| `get_comments` | Review | Read document comments |
| `insert_table` | Structure | Create tables with data |
| `insert_break` | Structure | Page/section/line breaks |
| `analyze_structure` | Analysis | Document stats and outline |

### Adding New Tools

1. Create a new tool class in `addin/WordClaudeEditor/src/tools/[category]/`
2. Extend `BaseTool` and implement required methods
3. Register in `src/tools/index.ts`

Example:
```typescript
export class MyNewTool extends BaseTool {
  name = "my_new_tool";
  description = "What this tool does";
  category = "editing" as const;
  
  parameters = [
    { name: "param1", type: "string", description: "...", required: true }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    // Tool implementation using Word.js APIs
  }
}
```

## Project Structure

```
word-claude-editor/
├── backend/                    # Express.js backend server
│   ├── server-https.js         # HTTPS server (default)
│   ├── routes/                 # API routes
│   │   ├── claude.js          # Text improvement endpoints
│   │   └── agent.js           # Agent streaming endpoint
│   ├── services/              
│   │   ├── anthropic.js       # Direct Claude API integration
│   │   └── agent-service.js   # Agent orchestration
│   └── utils/                  # Token counting utilities
└── addin/                      # Word add-in (React/TypeScript)
    └── WordClaudeEditor/
        ├── manifest.xml        # Office add-in manifest
        ├── src/
        │   ├── tools/          # Modular tool system
        │   │   ├── core/       # Tool registry & executor
        │   │   ├── editing/    # Text manipulation tools
        │   │   ├── formatting/ # Style and format tools
        │   │   ├── review/     # Comment tools
        │   │   ├── structure/  # Document structure tools
        │   │   └── analysis/   # Analysis tools
        │   ├── services/       
        │   │   ├── WordService.ts    # Word document operations
        │   │   ├── ClaudeService.ts  # Backend communication
        │   │   └── AgentService.ts   # Agent & tool execution
        │   └── taskpane/       
        │       └── components/ # React UI components
        └── dist/               # Built files
```

## API Architecture

### Tool Definition Flow
```
Frontend → Backend → Claude
```
- Frontend sends tool definitions to backend
- Backend passes them to Claude API
- Claude decides which tools to use

### Tool Execution Flow
```
Claude → Backend (SSE) → Frontend → Word Document
```
- Claude returns tool use decisions
- Backend streams via Server-Sent Events
- Frontend executes tools locally
- Tools manipulate Word document directly

### Why This Architecture?

- **Separation of Concerns**: Backend handles AI, frontend handles Word
- **Security**: API keys stay on backend
- **Flexibility**: Easy to add new tools without backend changes
- **Type Safety**: Each tool has validated parameters
- **Real-time Feedback**: Streaming responses show progress

## API Endpoints

### Backend API

- `GET /health` - Health check
- `POST /api/claude/improve` - Improve selected text
- `POST /api/claude/analyze-style` - Analyze writing style
- `POST /api/agent/stream` - Stream agent responses (SSE)
  ```json
  {
    "messages": [{"role": "user", "content": "task"}],
    "documentContext": "current document text",
    "tools": [/* optional custom tools */]
  }
  ```

## Debugging

### Built-in Debug Console

The add-in includes a debug console that shows:
- Tool executions with parameters
- API responses
- Error messages
- Performance timing

### Common Issues & Solutions

#### "Load failed" Error
**Solution:** Ensure backend is running with HTTPS:
```bash
cd backend
npm start  # Uses HTTPS by default
```

#### Certificate Warnings
**Solution:** Accept the certificate in your browser:
```bash
open https://localhost:3000/health
```

#### Agent Not Working
**Solution:** Check that:
1. Backend is running (`npm start` in backend/)
2. API key is set in `.env`
3. Document has content for context

### Testing Tools Individually

You can test tools directly in the browser console:
```javascript
// In the add-in context
await agentService.executeTool("search_document", {
  pattern: "test",
  context_lines: 2
});
```

## Configuration

### System Prompt

1. Click the **Config** tab in the add-in
2. Edit the system prompt to customize Claude's behavior
3. Click **Save Configuration**

### Environment Variables

Create a `.env` file in the backend directory:

```env
ANTHROPIC_API_KEY=sk-ant-api...
PORT=3000  # Optional, defaults to 3000
```

## Development Scripts

### Backend

```bash
npm start           # Start HTTPS server (production)
npm run dev         # Start with nodemon (auto-reload)
npm run start:http  # Start HTTP server (legacy)
```

### Add-in

```bash
npm start           # Load in Word
npm run dev-server  # Start dev server only
npm run build       # Build for production
npm run validate    # Validate manifest
npm run lint        # Run ESLint
npm run stop        # Stop debugging session
```

## Security Notes

- Never commit your `.env` file
- The backend handles the API key, not the frontend
- HTTPS is required for Word add-ins in production
- All edits use Word's track changes for auditability
- Tools require explicit execution, no automatic changes

## Troubleshooting

### Clear Office Cache (if add-in won't update)

**Mac:**
```bash
rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
```

**Windows:**
```bash
rm -rf %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\
```

### Check Backend Health

```bash
curl -k https://localhost:3000/health
```

### View Agent Logs

The debug console in the Agent tab shows:
- Each tool execution
- Parameters passed
- Results returned
- Any errors encountered

## Tech Stack

- **Frontend:** React, TypeScript, Fluent UI, Office.js
- **Backend:** Express.js, Anthropic SDK
- **Tools:** Modular TypeScript classes
- **Streaming:** Server-Sent Events (SSE)
- **Build:** Webpack, Babel
- **Development:** Office Add-in Dev Tools

## Contributing

To add new capabilities:

1. **New Tool**: Create in `src/tools/[category]/`
2. **New UI**: Modify components in `src/taskpane/components/`
3. **New API**: Add endpoints in `backend/routes/`

All tools should:
- Extend `BaseTool`
- Define clear parameters
- Handle errors gracefully
- Use track changes when editing

## License

MIT