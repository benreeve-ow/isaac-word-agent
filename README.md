# Isaac - AI Document Assistant for Microsoft Word

Isaac is an intelligent document assistant that integrates Claude AI directly into Microsoft Word. With advanced editing capabilities, autonomous document processing, and a modular tool system, Isaac helps you write, edit, and review documents more effectively.

## ✨ Features

- 🤖 **Multiple Processing Modes**
  - **Agent Mode**: Autonomous document editing with 15+ specialized tools
  - **Review Mode**: Comprehensive document analysis and commenting
  - **Edit Mode**: Direct text improvements with custom instructions
  
- 🛠️ **Modular Tool System** - Extensible architecture with tools for:
  - Text editing and content manipulation
  - Formatting and styling
  - Document structure (tables, breaks, sections)
  - Review and commenting
  - Document analysis

- 📝 **Track Changes Integration** - All edits are tracked with Word's native revision system
- 🎨 **Style Matching** - Analyze and match your document's writing style
- 📊 **Smart Context Management** - Handles up to 140k tokens efficiently
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
cd word-claude-editor
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file with your API key
echo "ANTHROPIC_API_KEY=sk-ant-api-your-key-here" > .env

# Start the HTTPS server
npm start
```

The backend runs on `https://localhost:3000` with automatic HTTPS certificates.

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
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Word UI   │────▶│  Isaac UI    │────▶│   Backend   │
│             │     │   (React)    │     │  (Express)  │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │ Tool System  │     │  Claude AI  │
                    │  (15+ tools) │     │    (API)    │
                    └──────────────┘     └─────────────┘
```

### Key Components

- **Frontend**: React-based task pane with Fluent UI
- **Tool System**: Modular TypeScript classes for document operations
- **Backend**: Express.js server handling Claude API communication
- **Streaming**: Real-time updates via Server-Sent Events (SSE)

## 🛠️ Tool System

Isaac includes 15+ specialized tools:

| Category | Tools | Description |
|----------|-------|-------------|
| **Editing** | `search_document`, `edit_content`, `insert_content` | Find and modify text |
| **Formatting** | `format_text`, `apply_style` | Apply formatting and styles |
| **Structure** | `insert_table`, `insert_break`, `find_tables` | Manage document structure |
| **Review** | `add_comment`, `get_comments` | Add and read review comments |
| **Analysis** | `analyze_structure`, `read_full_document` | Analyze document content |

### Creating Custom Tools

```typescript
// Example: Create a new tool
export class CustomTool extends BaseTool {
  name = "custom_tool";
  description = "Does something custom";
  category = "editing" as const;
  
  parameters = [
    { name: "text", type: "string", required: true }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    // Implementation using Word.js APIs
    return this.createSuccessResult("Done!");
  }
}
```

## 🔧 Configuration

### Environment Variables

Create `.env` in the backend directory:

```env
ANTHROPIC_API_KEY=sk-ant-api-your-key-here
PORT=3000  # Optional, defaults to 3000
```

### CLAUDE.md Instructions

Isaac respects instructions in `/CLAUDE.md` for consistent behavior across sessions.

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

**Table Insertion Issues**
- Isaac automatically handles Word's table insertion quirks
- Tables are created with buffer paragraphs to prevent content absorption

### Debug Console

The built-in debug console shows:
- Tool executions with parameters
- API requests and responses
- Error messages with stack traces
- Performance metrics

## 📚 Development

### Scripts

**Backend**
```bash
npm start           # HTTPS server (production)
npm run dev         # Development with auto-reload
npm run start:http  # HTTP server (if HTTPS fails)
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
word-claude-editor/
├── backend/                    # Express.js API server
│   ├── routes/                 # API endpoints
│   ├── services/               # Claude integration
│   └── utils/                  # Utilities
├── addin/WordClaudeEditor/     # Word add-in
│   ├── src/
│   │   ├── tools/              # Tool implementations
│   │   ├── modes/              # Processing modes
│   │   ├── prompts/            # AI prompts
│   │   ├── services/           # Core services
│   │   └── taskpane/           # React UI
│   └── manifest.xml            # Add-in manifest
└── CLAUDE.md                   # AI instructions
```

## 🔒 Security

- API keys are stored server-side only
- All communication uses HTTPS
- Track changes provide audit trail
- No automatic document modifications without user action

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

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ using Claude AI, React, TypeScript, and Office.js