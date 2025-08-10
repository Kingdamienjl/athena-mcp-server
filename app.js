const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import tools
const { getCpuStats } = require('./tools/get_cpu_stats');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Athena AI Assistant Backend',
    version: '1.0.0',
    endpoints: [
      'POST /ask - Ask Athena a question',
      'GET /cpu - Get system CPU statistics'
    ]
  });
});

// POST /ask - Main AI assistant endpoint
app.post('/ask', (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
        message: 'Please provide a prompt in the request body'
      });
    }

    // Placeholder response - in a real implementation, this would call OpenAI API
    const response = {
      prompt: prompt,
      response: `Hello! I'm Athena, your AI assistant. You asked: "${prompt}". This is a placeholder response. In a full implementation, I would process your request using AI capabilities and provide a meaningful answer.`,
      timestamp: new Date().toISOString(),
      model: 'athena-v1.0',
      tokens_used: Math.floor(Math.random() * 100) + 50 // Simulated token count
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /ask endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process your request'
    });
  }
});

// GET /cpu - System CPU statistics
app.get('/cpu', (req, res) => {
  try {
    const cpuStats = getCpuStats();
    res.json({
      success: true,
      data: cpuStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting CPU stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve CPU statistics',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Athena AI Assistant Backend running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;