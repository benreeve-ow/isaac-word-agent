Project Overview
We're building a Microsoft Word add-in that integrates Claude Sonnet 4 to help users improve their writing. The add-in allows users to:

Select text and get AI-powered improvements
Implement reviewer comments automatically using Claude
Maintain Word's track changes workflow
Configure Claude's behavior with custom prompts
Match the document's writing style automatically

Architecture
Frontend (Word Add-in) <-> Backend Server <-> Claude API

Frontend: Office.js-based React app running in Word's task pane
Backend: Express.js server that proxies Claude API calls
Storage: Local config using Office.context.document.settings

Key Technical Constraints

Office.js Context: All Word document operations must happen inside Word.run()
CORS: Backend must allow requests from https://localhost:3001
Track Changes: Must integrate with Word's native revision tracking
Token Limits: Claude API has context limits; we need to manage selection + context size
API Key: Backend handles the Anthropic API key, not the frontend

File Structure
word-claude-editor/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── claude.js
│   ├── services/
│   │   └── anthropic.js
│   └── utils/
│       └── tokenCounter.js
├── addin/
│   ├── src/
│   │   ├── taskpane/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── index.tsx
│   │   └── commands/
│   └── manifest.xml
└── Claude.md (this file)
API Endpoints
POST /api/claude/improve

Body: { text, contextBefore, contextAfter, systemPrompt, stylePrompt? }
Returns: { improvedText, explanation }

POST /api/claude/implement-comment

Body: { text, comment, context, systemPrompt }
Returns: { editedText, explanation }

POST /api/analyze-style

Body: { sampleText, sampleSize }
Returns: { stylePrompt, characteristics }

Word Add-in Capabilities Needed

Word.Range - For text selection and modification
Word.Document.changeTrackingMode - For track changes
Word.CommentCollection - For reading reviewer comments
Office.context.document.settings - For storing user preferences

UI Components

Main Editor Tab

Improve button
Comment implementation (when applicable)
Results preview with diff view
Accept/Reject buttons


Configuration Tab

System prompt textarea
Context tokens sliders (before/after)
Style matching toggle
Save button



Error Handling Requirements

Network failures (backend unreachable)
Claude API errors (rate limits, invalid requests)
No text selected
Document permissions issues
Invalid configuration