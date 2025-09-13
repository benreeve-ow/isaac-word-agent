# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Microsoft Word add-in that integrates Claude AI for document editing with track changes, custom prompts, and style matching. The architecture consists of:
- **Frontend**: Office.js React app in Word's task pane (port 3001)
- **Backend**: Express.js server proxying Claude API calls (port 3000)
- **Storage**: Office.context.document.settings for user preferences

## Development Commands

### Backend Server
```bash
cd backend
npm install
npm start           # HTTPS server with TypeScript
npm run dev         # HTTPS with nodemon (auto-reload)
npm run build       # Compile TypeScript
npm run serve       # Run compiled JavaScript
```

### Word Add-in
```bash
cd addin/WordClaudeEditor
npm install
npm start           # Loads add-in in Word desktop
npm run dev-server  # Dev server only (https://localhost:3001)
npm run build       # Production build
npm run validate    # Validate manifest.xml
npm run lint        # Run ESLint
npm run stop        # Stop debugging session
```

## Critical Technical Constraints

1. **Office.js Context**: ALL Word document operations MUST be wrapped in `Word.run()`:
```javascript
await Word.run(async (context) => {
  // All Word API calls go here
  await context.sync();
});
```

2. **CORS Requirements**: Backend must allow requests from `https://localhost:3001` and Office domains

3. **HTTPS Required**: Word add-ins require HTTPS. The backend uses Office add-in certificates automatically.

4. **API Key Security**: Backend handles Anthropic API key - NEVER expose in frontend

5. **Track Changes**: Use `document.changeTrackingMode` to enable Word's revision tracking

6. **Search Length Limit**: Word's search API has a 150-character limit for search strings

## Core API Endpoints

- `POST /api/text/improve` - Improve selected text
  - Body: `{ text, contextBefore, contextAfter, userPrompt, systemPrompt }`
  
- `POST /api/text/implement-comment` - Apply reviewer comments
  - Body: `{ text, comment, context, systemPrompt }`

- `POST /api/text/analyze-style` - Analyze document writing style
  - Body: `{ sampleText, sampleSize }`

- `POST /api/agent/stream` - Stream agent responses with tool use
  - Body: `{ messages, documentContext }`

- `POST /api/agent/tool-result` - Submit tool execution results
  - Body: `{ toolCallId, sessionId, result }`

## Key Services

### WordService (`addin/WordClaudeEditor/src/services/WordService.ts`)
- Handles all Word document operations
- Methods: `getSelectedText()`, `applyTextEdit()`, `searchAndReplace()`
- Always use within `Word.run()` context

### ClaudeService (`addin/WordClaudeEditor/src/services/ClaudeService.ts`)
- Communicates with backend API
- Handles token counting and context management
- Methods: `improveText()`, `implementComment()`, `analyzeStyle()`

### Mastra Agent (`backend/src/mastra/agent.word.ts`)
- Autonomous document editing with 25+ specialized tools
- Tool Bridge for async frontend-backend communication
- Memory management with automatic compression
- SSE streaming for real-time updates

## Common Issues & Solutions

1. **"Load failed" Error**: Ensure backend is running with HTTPS (`npm start` in backend/)

2. **Certificate Warnings**: Accept certificate at `https://localhost:3000/health`

3. **No Text Selected**: Check `range.text` is not empty before API calls

4. **Search Length Exceeded**: Break searches into smaller chunks (<150 chars)

5. **Clear Add-in Cache** (if changes don't appear):
   - Mac: `rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef`
   - Windows: `rm -rf %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`

## Environment Setup

1. Create `.env` in root directory:
```
ANTHROPIC_API_KEY=sk-ant-api...
MODEL=claude-3-5-sonnet-20241022
CONTEXT_INPUT_BUDGET_TOKENS=160000
CONTEXT_OUTPUT_BUDGET_TOKENS=40000
MEMORY_URL=file:./memory.db
PORT=3000
```

2. Trust HTTPS certificates:
```bash
open https://localhost:3000/health
# Accept certificate in browser
```

## Testing & Debugging

- VS Code debugging: F5 in add-in directory → "Debug in Browser"
- Debug console: Built into add-in UI (auto-appears on errors)
- Backend health: `curl -k https://localhost:3000/health`
- Memory inspection: View `backend/memory.db` with SQLite browser

## Architecture Notes

- Frontend and backend are separate projects with independent package.json files
- Tool Bridge pattern enables async communication via SSE
- Backend uses Mastra framework for agent orchestration
- Memory persists in SQLite with automatic compression at 160k tokens
- Word API has strict limits on search string length (150 chars max)
- All document edits should preserve formatting and use track changes
- Agent mode uses iterative tool calling with a maximum of 10 steps