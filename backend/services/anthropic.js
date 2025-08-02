const Anthropic = require('@anthropic-ai/sdk');

class AnthropicService {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required in environment variables');
    }
    
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async improveText({ text, contextBefore, contextAfter, systemPrompt, stylePrompt, userPrompt }) {
    try {
      const fullContext = this.buildContext(text, contextBefore, contextAfter);
      const fullSystemPrompt = this.buildSystemPrompt(systemPrompt, stylePrompt);
      
      // Build the user instruction based on whether a custom prompt is provided
      const instruction = userPrompt 
        ? `User instructions: ${userPrompt}`
        : "Please improve this text for clarity, grammar, and style.";
      
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        system: fullSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `${instruction}

Provide your response in JSON format with two fields:
1. "improvedText": The modified version of the text based on the instructions
2. "explanation": A brief explanation of the changes made

Context before the text:
${contextBefore || '[No context before]'}

TEXT TO MODIFY:
${text}

Context after the text:
${contextAfter || '[No context after]'}

Remember to respond only with valid JSON.`
          }
        ]
      });

      const content = response.content[0].text;
      
      try {
        const result = JSON.parse(content);
        if (!result.improvedText || !result.explanation) {
          throw new Error('Invalid response format from Claude');
        }
        return result;
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.improvedText && result.explanation) {
            return result;
          }
        }
        throw new Error('Failed to parse Claude response as JSON');
      }
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  async implementComment({ text, comment, context, systemPrompt }) {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        system: systemPrompt || 'You are a helpful writing assistant.',
        messages: [
          {
            role: 'user',
            content: `Please edit the following text according to the reviewer's comment. Provide your response in JSON format with two fields:
1. "editedText": The edited version of the text
2. "explanation": A brief explanation of how you addressed the comment

Reviewer's comment: "${comment}"

Context:
${context || '[No additional context]'}

TEXT TO EDIT:
${text}

Remember to respond only with valid JSON.`
          }
        ]
      });

      const content = response.content[0].text;
      
      try {
        const result = JSON.parse(content);
        if (!result.editedText || !result.explanation) {
          throw new Error('Invalid response format from Claude');
        }
        return result;
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.editedText && result.explanation) {
            return result;
          }
        }
        throw new Error('Failed to parse Claude response as JSON');
      }
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  async analyzeStyle({ sampleText, sampleSize }) {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        system: 'You are an expert writing style analyst.',
        messages: [
          {
            role: 'user',
            content: `Analyze the writing style of the following text sample and provide a style prompt that can be used to match this style. Provide your response in JSON format with two fields:
1. "stylePrompt": A detailed prompt describing the writing style (to be used for future text improvements)
2. "characteristics": An array of key style characteristics identified

TEXT SAMPLE (${sampleSize || 'unknown'} words):
${sampleText}

Remember to respond only with valid JSON.`
          }
        ]
      });

      const content = response.content[0].text;
      
      try {
        const result = JSON.parse(content);
        if (!result.stylePrompt || !result.characteristics) {
          throw new Error('Invalid response format from Claude');
        }
        return result;
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.stylePrompt && result.characteristics) {
            return result;
          }
        }
        throw new Error('Failed to parse Claude response as JSON');
      }
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  buildContext(text, contextBefore, contextAfter) {
    return {
      before: contextBefore || '',
      text: text,
      after: contextAfter || ''
    };
  }

  buildSystemPrompt(basePrompt, stylePrompt) {
    const defaultPrompt = 'You are a professional writing assistant helping to improve text in Microsoft Word documents. Focus on clarity, conciseness, and maintaining the author\'s voice.';
    
    let fullPrompt = basePrompt || defaultPrompt;
    
    if (stylePrompt) {
      fullPrompt += `\n\nStyle Guidelines:\n${stylePrompt}`;
    }
    
    return fullPrompt;
  }
}

module.exports = new AnthropicService();