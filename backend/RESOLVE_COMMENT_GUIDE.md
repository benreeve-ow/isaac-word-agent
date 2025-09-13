# resolve_comment Tool Usage Guide

## Overview
The `resolve_comment` tool handles reviewer comments in Word documents. It supports four different actions depending on the type of comment.

## Actions

### 1. `reply` - For praise, feedback, or acknowledgment
**When to use**: Comment is just feedback, praise, or doesn't require document changes
**Required params**: 
- `commentIndex`: Which comment to respond to
- `action`: "reply"
- `replyText`: Your response text
**Effect**: Adds a reply to the comment thread without changing document text

Example:
```json
{
  "commentIndex": 0,
  "action": "reply",
  "replyText": "Thank you for the feedback!"
}
```

### 2. `accept` - For comments requiring text changes
**When to use**: Comment suggests a specific change that you want to implement
**Required params**:
- `commentIndex`: Which comment to accept
- `action": "accept"
- `replacementText`: The new text to replace the commented text
- `replyText` (optional): Additional response
**Effect**: Replaces the commented text AND marks comment as resolved

Example:
```json
{
  "commentIndex": 1,
  "action": "accept",
  "replacementText": "The improved version of the text",
  "replyText": "Good suggestion, implemented!"
}
```

### 3. `implement` - Alternative to accept
**When to use**: Same as accept, when implementing suggested changes
**Required params**: Same as accept
**Effect**: Same as accept

### 4. `reject` - For dismissing comments
**When to use**: Comment suggestion won't be implemented
**Required params**:
- `commentIndex`: Which comment to reject
- `action": "reject"
- `replyText` (optional): Explanation why rejected
**Effect**: Marks comment as resolved without text changes

Example:
```json
{
  "commentIndex": 2,
  "action": "reject",
  "replyText": "This change would alter the intended meaning"
}
```

## Common Patterns

### Praise/Acknowledgment Comments
```json
// ✅ CORRECT - Use reply for comments that don't need text changes
{
  "action": "reply",
  "replyText": "Thank you for the positive feedback!"
}

// ❌ WRONG - Don't use accept without replacementText
{
  "action": "accept",
  "replyText": "Thanks!"  // Missing replacementText!
}
```

### Edit Suggestions
```json
// ✅ CORRECT - Include replacement text when accepting
{
  "action": "accept",
  "replacementText": "The corrected text goes here",
  "replyText": "Fixed the typo, thanks!"
}
```

## Error Messages

- **"replacementText is required when accepting a comment"**: You used `accept` but didn't provide the new text
- **"replyText is required when using 'reply' action"**: You used `reply` but didn't provide response text

## Tips

1. Always check if a comment requires text changes before choosing the action
2. Use `reply` for general feedback, praise, or questions
3. Use `accept`/`implement` only when you need to change the document text
4. Use `reject` to dismiss suggestions you won't implement
5. Comments are 0-indexed (first comment is index 0)