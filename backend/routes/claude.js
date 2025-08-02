const express = require('express');
const router = express.Router();
const anthropicService = require('../services/anthropic');
const { estimateTokens } = require('../utils/tokenCounter');

router.post('/improve', async (req, res) => {
  try {
    const { text, contextBefore, contextAfter, systemPrompt, stylePrompt, userPrompt } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Missing required parameter: text' 
      });
    }

    const totalTokens = estimateTokens(
      (text || '') + 
      (contextBefore || '') + 
      (contextAfter || '') + 
      (systemPrompt || '') + 
      (stylePrompt || '') +
      (userPrompt || '')
    );

    if (totalTokens > 150000) {
      return res.status(400).json({ 
        error: 'Text and context too long. Please reduce the amount of text.',
        estimatedTokens: totalTokens,
        maxTokens: 150000
      });
    }

    const result = await anthropicService.improveText({
      text,
      contextBefore,
      contextAfter,
      systemPrompt,
      stylePrompt,
      userPrompt
    });

    res.json(result);
  } catch (error) {
    console.error('Error in /improve endpoint:', error);
    
    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({ 
        error: 'Server configuration error. Please check API key.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to improve text',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/implement-comment', async (req, res) => {
  try {
    const { text, comment, context, systemPrompt } = req.body;
    
    if (!text || !comment) {
      return res.status(400).json({ 
        error: 'Missing required parameters: text and comment are required' 
      });
    }

    const totalTokens = estimateTokens(
      (text || '') + 
      (comment || '') + 
      (context || '') + 
      (systemPrompt || '')
    );

    if (totalTokens > 150000) {
      return res.status(400).json({ 
        error: 'Text and context too long. Please reduce the amount of text.',
        estimatedTokens: totalTokens,
        maxTokens: 150000
      });
    }

    const result = await anthropicService.implementComment({
      text,
      comment,
      context,
      systemPrompt
    });

    res.json(result);
  } catch (error) {
    console.error('Error in /implement-comment endpoint:', error);
    
    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({ 
        error: 'Server configuration error. Please check API key.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to implement comment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/analyze-style', async (req, res) => {
  try {
    const { sampleText, sampleSize } = req.body;
    
    if (!sampleText) {
      return res.status(400).json({ 
        error: 'Missing required parameter: sampleText' 
      });
    }

    const totalTokens = estimateTokens(sampleText);

    if (totalTokens > 50000) {
      return res.status(400).json({ 
        error: 'Sample text too long. Please provide a shorter sample.',
        estimatedTokens: totalTokens,
        maxTokens: 50000
      });
    }

    const result = await anthropicService.analyzeStyle({
      sampleText,
      sampleSize
    });

    res.json(result);
  } catch (error) {
    console.error('Error in /analyze-style endpoint:', error);
    
    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({ 
        error: 'Server configuration error. Please check API key.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze style',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;