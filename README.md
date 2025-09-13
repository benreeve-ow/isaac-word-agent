# Isaac - AI Document Assistant for Microsoft Word

Isaac is an intelligent document assistant that integrates Claude AI directly into Microsoft Word. With advanced editing capabilities, autonomous document processing, and a modular tool system powered by Mastra framework, Isaac helps you write, edit, and review documents more effectively.

## ✨ Features

- 🤖 **Multiple Processing Modes**
  - **Agent Mode**: Autonomous document editing with 15+ specialized tools
  - **Review Mode**: Comprehensive document analysis and commenting
  - **Edit Mode**: Direct text improvements with custom instructions
  
- 🛠️ **Mastra-Powered Architecture**
  - Unified Document View (UDV) for robust table-adjacent editing
  - Persistent working memory with plan/status tracking
  - Intelligent context management with automatic compression
  - SSE-based tool bridge for real-time Word operations

- 📝 **Track Changes Integration** - All edits are tracked with Word's native revision system
- 🎨 **Style Matching** - Analyze and match your document's writing style
- 📊 **Smart Context Management** - Handles up to 160k tokens efficiently
- 🔍 **Real-time Progress Tracking** - See exactly what Isaac is doing
- 🐛 **Built-in Debug Console** - Troubleshoot issues easily

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Microsoft Word (Desktop or Office 365)
- Anthropic API key for Claude

### 1. Clone and Setup

```bash
git clone <repository-url>
cd isaac-word-agent
```

### 2. Backend Setup (Mastra-based)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy .env.example to .env in root directory (if not already done)
# cp ../../.env.example ../../.env

# Edit root .env with your settings:
# - ANTHROPIC_API_KEY=sk-ant-api-your-key-here
# - MODEL=claude-sonnet-4-20250514
# - TOOL_BRIDGE_SECRET=<generate-random-uuid>

# Start the HTTPS server
npm start
```

The backend runs on `https://localhost:3000` with Mastra agent orchestration.

### 3. Add-in Setup

```bash
# In a new terminal, navigate to add-in
cd addin/WordClaudeEditor

# Install dependencies
npm install

# Start and load in Word
npm start
```

This will:
1. Start the development server on `https://localhost:3001`
2. Open Microsoft Word
3. Automatically load Isaac as an add-in
4. Connect to Mastra agent via SSE bridge

## 📖 Usage Guide

### Agent Mode (Autonomous Editing)

Isaac can autonomously edit your document using natural language instructions:

```
Examples:
- "Find all instances of 'utilize' and replace with simpler alternatives"
- "Add a summary table after the introduction section"
- "Review the document and add comments on areas that need improvement"
- "Format all headings consistently and add page breaks between sections"
```

### Review Mode

Get comprehensive document feedback:
- Grammar and spelling checks
- Style consistency analysis
- Structure and flow improvements
- Technical accuracy review

### Edit Mode

Select text and provide specific improvement instructions:
- "Make this more concise"
- "Rewrite in active voice"
- "Expand with more details"
- "Match the style of the introduction"

## 🏗️ Architecture

### System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Word UI   │────▶│  Isaac UI    │────▶│   Backend   │────▶│   Mastra    │
│             │     │   (React)    │     │  (Express)  │     │    Agent    │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                            │                     │                     │
                            ▼                     ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  Context     │◀────│ Tool Bridge │     │  Claude AI  │
                    │   Tools      │     │    (SSE)    │     │    (API)    │
                    └──────────────┘     └─────────────┘     └─────────────┘
```

### Key Components

- **Frontend**: React task pane with context tools for Word operations
- **Backend**: Express.js with Mastra agent orchestration
- **Tool Bridge**: SSE-based async communication between agent and frontend
- **Memory**: SQLite-based persistent memory with automatic compression

## 🛠️ Tool System

Isaac includes 25+ specialized tools:

| Category | Tools | Description |
|----------|-------|-------------|
| **Reading** | `read_selection`, `read_full_document`, `get_document_stats` | Read document content |
| **Editing** | `search_document`, `edit_content`, `insert_content`, `replace_all` | Find and modify text |
| **Tables** | `insert_table`, `edit_table_cell`, `find_tables` | Manage tables |
| **Comments** | `add_comment`, `get_comments`, `resolve_comment` | Review and feedback |
| **Search** | `fuzzy_search`, `search_with_options` | Advanced search capabilities |
| **Advanced** | `get_paragraph_ids`, `edit_by_id`, `analyze_structure` | Precise document control |

### Tool Implementation

Tools are defined in two places:
- **Backend**: `/backend/src/tools/definitions.ts` - Tool schemas for Mastra
- **Frontend**: `/addin/WordClaudeEditor/src/tools/context/` - Actual Word operations

The Tool Bridge handles async communication between them via SSE.

## 📡 API Endpoints

### Agent Endpoints

- `POST /api/agent/stream` - SSE streaming for agent interactions
- `POST /api/agent/tool-result` - Tool execution results from frontend

### Text Processing Endpoints

- `POST /api/text/improve` - Direct text improvement
- `POST /api/text/implement-comment` - Apply reviewer comments
- `POST /api/text/analyze-style` - Analyze writing style

### Health Check

- `GET /health` - Server status and version

## 🔧 Configuration

### Environment Variables

Create `.env` in the root directory (copy from `.env.example`):

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api-your-key-here
MODEL=claude-sonnet-4-20250514

# Context Management
CONTEXT_INPUT_BUDGET_TOKENS=160000
CONTEXT_OUTPUT_BUDGET_TOKENS=40000
CONTEXT_SAFETY_MARGIN=5000

# Memory Storage
MEMORY_URL=file:./memory.db

# Security
TOOL_BRIDGE_SECRET=<generate-random-uuid>

# Server
PORT=3000
NODE_ENV=development
```

### CLAUDE.md Instructions

Isaac respects instructions in `/CLAUDE.md` for consistent behavior across sessions.

### Document Settings

Each Word document stores its own settings via Office.context.document.settings:
- System prompts
- Style preferences
- Mode configurations

## 🐛 Troubleshooting

### Common Issues

**"Load failed" Error**
- Ensure backend is running: `npm start` in backend directory
- Accept HTTPS certificate: visit `https://localhost:3000/health`

**Isaac Not Appearing in Word**
- Clear Word cache:
  - Mac: `rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef`
  - Windows: `rm -rf %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
- Restart Word and run `npm start` again

**Table Insertion/Editing Issues**
- Isaac uses UDV to handle Word's table quirks automatically
- Tables are edited with precise range resolution
- Adjacent paragraph edits maintain document structure

**Certificate Issues**
1. Visit `https://localhost:3000/health` in your browser
2. Accept the security warning
3. Visit `https://localhost:3001` and accept that certificate too
4. Restart both servers

**Port Already in Use**
```bash
# Find process using port
lsof -i :3000  # or :3001

# Kill the process
kill -9 <PID>
```

### Debug Console

The built-in debug console shows:
- Tool executions with parameters
- API requests and responses
- Error messages with stack traces
- Performance metrics
- Memory usage and token counts

## 📚 Development

### Scripts

**Backend**
```bash
npm start           # HTTPS server with TypeScript
npm run dev         # Development with auto-reload
npm run build       # Compile TypeScript
npm run serve       # Run compiled JavaScript
```

**Add-in**
```bash
npm start           # Load in Word
npm run dev-server  # Dev server only
npm run build       # Production build
npm run lint        # Run ESLint
npm run validate    # Validate manifest
```

### Project Structure

```
isaac-word-agent/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── mastra/            # Mastra agent framework
│   │   │   ├── agent.word.ts  # Main agent definition
│   │   │   ├── streamHandler.ts # SSE stream handling
│   │   │   ├── tools/         # Tool bridge implementation
│   │   │   ├── compressors/   # Memory compression
│   │   │   └── prompts/       # System prompts
│   │   ├── tools/             # Tool definitions
│   │   ├── routes/            # API endpoints
│   │   └── services/          # Shared services
│   └── memory.db              # SQLite persistence
├── addin/WordClaudeEditor/     # Word add-in
│   ├── src/
│   │   ├── services/          # Core services
│   │   ├── tools/
│   │   │   └── context/       # Word operation tools
│   │   ├── modes/             # Processing modes
│   │   └── taskpane/          # React UI
│   └── manifest.xml           # Add-in manifest
└── CLAUDE.md                  # AI instructions
```

### Testing

```bash
# Backend tests (to be implemented)
cd backend && npm test

# Add-in browser testing
cd addin/WordClaudeEditor
open test-browser.html
```

### Debugging Tips

1. **VS Code Debugging**: Press F5 in add-in directory → "Debug in Browser"
2. **Network Monitoring**: Check browser DevTools Network tab
3. **Memory Inspection**: View `backend/memory.db` with SQLite browser
4. **Token Usage**: Monitor token counts in debug console

## 🔒 Security

- API keys are stored server-side only
- All communication uses HTTPS with certificates
- Tool Bridge secured with TOOL_BRIDGE_SECRET
- Track changes provide audit trail
- No automatic document modifications without user action
- Input sanitization on all user inputs

## 🚀 Production Deployment

For production deployment:

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use proper SSL certificates
   - Configure environment variables

2. **Build Process**
   ```bash
   # Backend
   cd backend && npm run build
   
   # Add-in
   cd addin/WordClaudeEditor && npm run build
   ```

3. **Security Hardening**
   - Implement rate limiting
   - Add request validation
   - Set up monitoring
   - Configure firewall rules

4. **Deployment**
   - Deploy backend to HTTPS-enabled server
   - Host add-in files on CDN
   - Update manifest.xml URLs
   - Submit to Office Store (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

### Guidelines

- Follow existing code patterns
- Add TypeScript types
- Document new tools
- Test in Word before submitting
- Update this README for new features

## 📄 License

MIT License - see LICENSE file for details
