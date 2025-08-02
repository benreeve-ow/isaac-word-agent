# Word Claude Editor Add-in

A Microsoft Word add-in that integrates Claude AI to help improve your writing with intelligent suggestions, style matching, and automated comment implementation.

## Features

### Editor Tab
- **Improve Selected Text**: Select text in your document and get AI-powered improvements
- **Real-time feedback**: Get explanations for suggested changes
- **Context awareness**: Uses surrounding text for better suggestions

### Config Tab
- **Custom system prompts**: Configure how Claude should assist with your writing
- **Style matching**: Enable automatic analysis and matching of your document's style
- **Backend configuration**: Set the URL for your Claude backend server
- **Persistent settings**: Configuration is saved per document

## Quick Start

### Prerequisites
- Microsoft Word (Desktop or Web)
- Node.js 16+ and npm
- Claude backend server running (see backend README)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

3. **Sideload the add-in**:
   - The add-in will automatically open in Word with debugging enabled
   - If not, manually sideload using the manifest.xml file

### Development Mode

```bash
# Start development server with hot reload
npm start

# Build for production
npm run build

# Run TypeScript compiler
npm run build:dev

# Start development server only
npm run dev-server
```

## Project Structure

```
src/
├── taskpane/
│   ├── components/
│   │   ├── App.tsx          # Main app with tab navigation
│   │   ├── EditorTab.tsx    # Text improvement interface
│   │   ├── ConfigTab.tsx    # Configuration settings
│   │   └── Header.tsx       # App header component
│   ├── index.tsx            # Task pane entry point
│   ├── taskpane.html        # Task pane HTML template
│   └── taskpane.ts          # Task pane initialization
├── commands/
│   ├── commands.html        # Commands HTML template
│   └── commands.ts          # Ribbon commands
assets/                      # Icons and images
manifest.xml                 # Add-in manifest
```

## Configuration

### Default Settings
- **System Prompt**: Professional writing assistant focused on clarity and conciseness
- **Style Matching**: Enabled
- **Backend URL**: `http://localhost:3000`

### Customization
1. Open the **Config** tab in the add-in
2. Modify the system prompt to change Claude's behavior
3. Enable/disable style matching based on your needs
4. Update backend URL if running on a different port
5. Click **Save Configuration** to persist changes

## Integration with Backend

The add-in communicates with the Express.js backend server:

- **Endpoint**: `POST /api/claude/improve`
- **CORS**: Backend must allow `https://localhost:3001`
- **Authentication**: API key handled server-side

## Troubleshooting

### Common Issues

1. **Add-in not loading**:
   - Ensure development server is running on `https://localhost:3001`
   - Accept self-signed certificate warnings
   - Check browser console for errors

2. **API errors**:
   - Verify backend server is running on configured URL
   - Check CORS settings in backend
   - Ensure API key is properly configured in backend

3. **TypeScript errors**:
   - Run `npm run build` to check for compilation errors
   - Ensure all dependencies are installed

4. **Manifest issues**:
   - Validate manifest.xml using Office Add-in Validator
   - Check that all URLs in manifest are accessible

### Development Tips

- Use browser DevTools to debug the task pane
- Check Word's add-in debugging tools
- Monitor network requests in DevTools
- Use `console.log()` for debugging (visible in DevTools)

## Available Scripts

- `npm start` - Start development with sideloading
- `npm run build` - Build for production
- `npm run build:dev` - Development build with TypeScript compilation
- `npm run dev-server` - Start webpack dev server only
- `npm run stop` - Stop development server and clear cache

## API Integration

### Text Improvement Flow

1. User selects text in Word document
2. Add-in captures selection using Office.js
3. Text and context sent to backend API
4. Claude processes and returns improvements
5. User reviews and accepts/rejects changes
6. Changes applied using Word's track changes feature

### Error Handling

- Network failures are handled gracefully
- User feedback provided for all operations
- Fallback to default behavior on errors

## Building for Production

1. **Build the add-in**:
   ```bash
   npm run build
   ```

2. **Deploy to web server**:
   - Copy `dist/` folder contents to your web server
   - Update manifest.xml URLs to production domains
   - Ensure HTTPS is enabled

3. **Distribute**:
   - Share manifest.xml with users
   - Or publish to Office Store

## Security Considerations

- API key stored server-side only
- No sensitive data in client-side code
- CORS properly configured
- Input validation on all user data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review browser console for errors
- Open a GitHub issue with detailed information

## License

MIT