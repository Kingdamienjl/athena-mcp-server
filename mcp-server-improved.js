#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } = require('@modelcontextprotocol/sdk/types.js');
const { getCpuStats } = require('./tools/get_cpu_stats');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const ping = require('ping');
const { Octokit } = require('@octokit/rest');
const path = require('path');
require('dotenv').config();
const puppeteerTools = require('./tools/puppeteer_tools');
const { GDriveTools } = require('./tools/gdrive_tools');

const execAsync = promisify(exec);

// Performance and reliability improvements
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// Cache management
function getCachedResponse(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean up old cache entries periodically
  if (cache.size > 1000) {
    const cutoff = Date.now() - CACHE_TTL;
    for (const [k, v] of cache.entries()) {
      if (v.timestamp < cutoff) {
        cache.delete(k);
      }
    }
  }
}

// Retry logic with exponential backoff
async function withRetry(operation, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Don't retry on certain error types
      if (error.code === 'ENOTFOUND' || error.status === 401 || error.status === 403) {
        throw error;
      }
      
      const delay = RETRY_DELAY_BASE * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Input validation schemas
const validationSchemas = {
  image_generate: {
    prompt: { type: 'string', required: true, minLength: 1, maxLength: 1000 },
    size: { type: 'string', enum: ['256x256', '512x512', '1024x1024'] },
    n: { type: 'number', min: 1, max: 4 }
  },
  analyze_code: {
    code: { type: 'string', required: true, minLength: 1 },
    language: { type: 'string' },
    analysis_type: { type: 'string', enum: ['review', 'explain', 'optimize', 'debug'] }
  },
  web_request: {
    url: { type: 'string', required: true },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }
  },
  ask_athena: {
    prompt: { type: 'string', required: true, minLength: 1, maxLength: 2000 }
  }
};

function validateInput(toolName, args) {
  const schema = validationSchemas[toolName];
  if (!schema) return true; // No validation schema defined
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = args[field];
    
    if (rules.required && (value === undefined || value === null)) {
      throw new McpError(ErrorCode.InvalidParams, `Missing required field: ${field}`);
    }
    
    if (value !== undefined) {
      if (rules.type === 'string' && typeof value !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be a string`);
      }
      
      if (rules.type === 'number' && typeof value !== 'number') {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be a number`);
      }
      
      if (rules.minLength && value.length < rules.minLength) {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be at least ${rules.minLength} characters`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be at most ${rules.maxLength} characters`);
      }
      
      if (rules.min && value < rules.min) {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be at least ${rules.min}`);
      }
      
      if (rules.max && value > rules.max) {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be at most ${rules.max}`);
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        throw new McpError(ErrorCode.InvalidParams, `Field ${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
  }
  
  return true;
}

class AthenaServer {
  constructor() {
    this.server = new Server(
      {
        name: 'athena-mcp-server-improved',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize OpenAI client with better error handling
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error.message);
      this.openai = null;
    }

    // Initialize GitHub client
    try {
      this.octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });
    } catch (error) {
      console.error('Failed to initialize GitHub client:', error.message);
      this.octokit = null;
    }

    // Initialize Google Drive tools
    try {
      this.gdriveTools = new GDriveTools();
    } catch (error) {
      console.error('Failed to initialize Google Drive tools:', error.message);
      this.gdriveTools = null;
    }

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools with enhanced descriptions
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ask_athena',
            description: 'Ask Athena AI assistant a question with intelligent caching and retry logic',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The question or prompt to ask Athena (1-2000 characters)',
                },
                context: {
                  type: 'string',
                  description: 'Optional context to provide with the question',
                  optional: true,
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'get_system_stats',
            description: 'Get detailed system CPU, memory, and performance statistics with caching',
            inputSchema: {
              type: 'object',
              properties: {
                detailed: {
                  type: 'boolean',
                  description: 'Whether to include detailed system information',
                  default: true,
                },
              },
            },
          },
          {
            name: 'analyze_code',
            description: 'Analyze code snippets with validation and intelligent insights',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'The code to analyze (required, non-empty)',
                },
                language: {
                  type: 'string',
                  description: 'Programming language of the code',
                  optional: true,
                },
                analysis_type: {
                  type: 'string',
                  description: 'Type of analysis: review, explain, optimize, debug',
                  enum: ['review', 'explain', 'optimize', 'debug'],
                  default: 'review',
                },
              },
              required: ['code'],
            },
          },
          {
            name: 'generate_code',
            description: 'Generate code based on requirements with enhanced validation',
            inputSchema: {
              type: 'object',
              properties: {
                requirements: {
                  type: 'string',
                  description: 'Description of what the code should do',
                },
                language: {
                  type: 'string',
                  description: 'Target programming language',
                  default: 'javascript',
                },
                framework: {
                  type: 'string',
                  description: 'Framework or library to use (optional)',
                  optional: true,
                },
                style: {
                  type: 'string',
                  description: 'Code style preferences',
                  optional: true,
                },
              },
              required: ['requirements'],
            },
          },
          {
            name: 'image_generate',
            description: 'Generate images using DALL-E with validation and fallback options',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Description of the image to generate (1-1000 characters)',
                },
                size: {
                  type: 'string',
                  description: 'Image size',
                  enum: ['256x256', '512x512', '1024x1024'],
                  default: '512x512',
                },
                n: {
                  type: 'number',
                  description: 'Number of images to generate (1-4)',
                  maximum: 4,
                  default: 1,
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'web_request',
            description: 'Make HTTP requests with retry logic and validation',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to make the request to (required)',
                },
                method: {
                  type: 'string',
                  description: 'HTTP method',
                  enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                  default: 'GET',
                },
                headers: {
                  type: 'object',
                  description: 'HTTP headers',
                  optional: true,
                },
                data: {
                  type: 'object',
                  description: 'Request body data',
                  optional: true,
                },
              },
              required: ['url'],
            },
          },
          // Add more tools here...
        ],
      };
    });

    // Enhanced tool call handler with validation and caching
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Validate input
        validateInput(name, args);
        
        // Check cache for certain operations
        const cacheKey = `${name}:${JSON.stringify(args)}`;
        const cached = getCachedResponse(cacheKey);
        if (cached && ['get_system_stats', 'ask_athena'].includes(name)) {
          return { content: [{ type: 'text', text: `[CACHED] ${cached}` }] };
        }

        let result;
        
        switch (name) {
          case 'ask_athena':
            result = await this.handleAskAthena(args);
            break;
          case 'get_system_stats':
            result = await this.handleGetSystemStats(args);
            break;
          case 'analyze_code':
            result = await this.handleAnalyzeCode(args);
            break;
          case 'generate_code':
            result = await this.handleGenerateCode(args);
            break;
          case 'image_generate':
            result = await this.handleImageGenerate(args);
            break;
          case 'web_request':
            result = await this.handleWebRequest(args);
            break;
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        // Cache successful results for appropriate tools
        if (['get_system_stats', 'ask_athena'].includes(name)) {
          setCachedResponse(cacheKey, result);
        }

        return { content: [{ type: 'text', text: result }] };
        
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async handleAskAthena(args) {
    const { prompt, context } = args;
    
    if (!this.openai) {
      throw new McpError(ErrorCode.InternalError, 'OpenAI client not initialized. Please check your API key.');
    }

    return await withRetry(async () => {
      const messages = [
        {
          role: 'system',
          content: 'You are Athena, a hyper-sentient AI assistant designed for curiosity, clarity, and utility. Speak with calm intelligence and always provide actionable insights.'
        },
        {
          role: 'user',
          content: context ? `Context: ${context}\n\nQuestion: ${prompt}` : prompt
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    });
  }

  async handleGetSystemStats(args) {
    const { detailed = true } = args;
    
    return await withRetry(async () => {
      const stats = await getCpuStats();
      
      if (detailed) {
        const memInfo = process.memoryUsage();
        const uptime = process.uptime();
        
        return JSON.stringify({
          ...stats,
          memory: {
            rss: `${Math.round(memInfo.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memInfo.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memInfo.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memInfo.external / 1024 / 1024)}MB`,
          },
          uptime: `${Math.round(uptime)}s`,
          platform: process.platform,
          nodeVersion: process.version,
        }, null, 2);
      }
      
      return JSON.stringify(stats, null, 2);
    });
  }

  async handleAnalyzeCode(args) {
    const { code, language, analysis_type = 'review' } = args;
    
    if (!this.openai) {
      throw new McpError(ErrorCode.InternalError, 'OpenAI client not initialized. Please check your API key.');
    }

    return await withRetry(async () => {
      const prompt = `Please ${analysis_type} the following ${language || 'code'}:\n\n${code}\n\nProvide specific, actionable feedback.`;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a senior software engineer providing ${analysis_type} feedback. Be specific, constructive, and focus on best practices.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      return response.choices[0].message.content;
    });
  }

  async handleGenerateCode(args) {
    const { requirements, language = 'javascript', framework, style } = args;
    
    if (!this.openai) {
      throw new McpError(ErrorCode.InternalError, 'OpenAI client not initialized. Please check your API key.');
    }

    return await withRetry(async () => {
      let prompt = `Generate ${language} code that meets these requirements:\n${requirements}`;
      
      if (framework) {
        prompt += `\nUse the ${framework} framework.`;
      }
      
      if (style) {
        prompt += `\nCode style: ${style}`;
      }
      
      prompt += '\n\nProvide clean, well-commented, production-ready code with error handling.';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software developer. Generate clean, efficient, well-documented code with proper error handling and best practices.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      return response.choices[0].message.content;
    });
  }

  async handleImageGenerate(args) {
    const { prompt, size = '512x512', n = 1 } = args;
    
    if (!this.openai) {
      throw new McpError(ErrorCode.InternalError, 'OpenAI client not initialized. Please check your API key.');
    }

    return await withRetry(async () => {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size,
        n,
        quality: 'standard',
      });

      const urls = response.data.map(img => img.url);
      return `Generated ${n} image(s):\n${urls.join('\n')}`;
    });
  }

  async handleWebRequest(args) {
    const { url, method = 'GET', headers = {}, data } = args;
    
    return await withRetry(async () => {
      const config = {
        method,
        url,
        headers: {
          'User-Agent': 'Athena-MCP-Server/2.0.0',
          ...headers,
        },
        timeout: 10000, // 10 second timeout
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }

      const response = await axios(config);
      
      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      }, null, 2);
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Athena MCP Server (Improved) running on stdio');
  }
}

const server = new AthenaServer();
server.run().catch(console.error);