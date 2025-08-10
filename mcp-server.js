#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
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

class AthenaServer {
  constructor() {
    this.server = new Server(
      {
        name: 'athena-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize GitHub client
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Initialize Google Drive tools
    this.gdriveTools = new GDriveTools();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ask_athena',
            description: 'Ask Athena AI assistant a question and get an intelligent response',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The question or prompt to ask Athena',
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
            description: 'Get detailed system CPU, memory, and performance statistics',
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
            description: 'Analyze code snippets and provide insights, suggestions, or explanations',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'The code to analyze',
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
            description: 'Generate code based on requirements and specifications',
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
            name: 'file_operations',
            description: 'Perform file system operations like read, write, search, and list files',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Operation to perform: read, write, search, list, delete',
                  enum: ['read', 'write', 'search', 'list', 'delete'],
                },
                path: {
                  type: 'string',
                  description: 'File or directory path',
                },
                content: {
                  type: 'string',
                  description: 'Content to write (for write operation)',
                  optional: true,
                },
                pattern: {
                  type: 'string',
                  description: 'Search pattern (for search operation)',
                  optional: true,
                },
              },
              required: ['operation', 'path'],
            },
          },
          {
            name: 'web_request',
            description: 'Make HTTP requests to external APIs and web services',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to make the request to',
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
          {
            name: 'image_generate',
            description: 'Generate images using DALL-E AI image generation',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Description of the image to generate',
                },
                size: {
                  type: 'string',
                  description: 'Image size',
                  enum: ['256x256', '512x512', '1024x1024'],
                  default: '512x512',
                },
                n: {
                  type: 'number',
                  description: 'Number of images to generate',
                  default: 1,
                  maximum: 4,
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'text_summarize',
            description: 'Summarize long texts using AI',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'Text to summarize',
                },
                length: {
                  type: 'string',
                  description: 'Summary length',
                  enum: ['short', 'medium', 'long'],
                  default: 'medium',
                },
                style: {
                  type: 'string',
                  description: 'Summary style',
                  enum: ['bullet', 'paragraph', 'technical'],
                  default: 'paragraph',
                },
              },
              required: ['text'],
            },
          },
          {
            name: 'translate_text',
            description: 'Translate text between different languages',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'Text to translate',
                },
                from_language: {
                  type: 'string',
                  description: 'Source language (auto-detect if not specified)',
                  optional: true,
                },
                to_language: {
                  type: 'string',
                  description: 'Target language',
                  default: 'english',
                },
              },
              required: ['text', 'to_language'],
            },
          },
          {
            name: 'weather_info',
            description: 'Get current weather information for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'City name or coordinates',
                },
                units: {
                  type: 'string',
                  description: 'Temperature units',
                  enum: ['celsius', 'fahrenheit', 'kelvin'],
                  default: 'celsius',
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'github_operations',
            description: 'Perform GitHub repository operations',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'GitHub operation to perform',
                  enum: ['list_repos', 'get_repo', 'create_issue', 'list_issues', 'get_file', 'search_code'],
                },
                owner: {
                  type: 'string',
                  description: 'Repository owner',
                  optional: true,
                },
                repo: {
                  type: 'string',
                  description: 'Repository name',
                  optional: true,
                },
                query: {
                  type: 'string',
                  description: 'Search query or issue title',
                  optional: true,
                },
                path: {
                  type: 'string',
                  description: 'File path in repository',
                  optional: true,
                },
              },
              required: ['operation'],
            },
          },
          {
            name: 'docker_manage',
            description: 'Manage Docker containers and images',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Docker operation to perform',
                  enum: ['list_containers', 'list_images', 'start_container', 'stop_container', 'container_logs', 'container_stats'],
                },
                container_id: {
                  type: 'string',
                  description: 'Container ID or name',
                  optional: true,
                },
                image: {
                  type: 'string',
                  description: 'Docker image name',
                  optional: true,
                },
              },
              required: ['operation'],
            },
          },
          {
            name: 'process_monitor',
            description: 'Monitor and manage system processes',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Process operation to perform',
                  enum: ['list', 'find', 'kill', 'info'],
                },
                process_name: {
                  type: 'string',
                  description: 'Process name or pattern',
                  optional: true,
                },
                pid: {
                  type: 'number',
                  description: 'Process ID',
                  optional: true,
                },
              },
              required: ['operation'],
            },
          },
          {
            name: 'browser_navigate',
            description: 'Navigate to a webpage and extract content using Puppeteer',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to navigate to',
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector to extract specific content (optional)',
                  optional: true,
                },
                waitForSelector: {
                  type: 'string',
                  description: 'CSS selector to wait for before extracting content (optional)',
                  optional: true,
                },
                waitUntil: {
                  type: 'string',
                  description: 'When to consider navigation complete',
                  enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
                  default: 'networkidle2',
                  optional: true,
                },
                timeout: {
                  type: 'number',
                  description: 'Navigation timeout in milliseconds',
                  default: 30000,
                  optional: true,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'browser_screenshot',
            description: 'Take a screenshot of a webpage using Puppeteer',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to screenshot',
                },
                savePath: {
                  type: 'string',
                  description: 'Path to save the screenshot (optional)',
                  optional: true,
                },
                fullPage: {
                  type: 'boolean',
                  description: 'Capture full page screenshot',
                  default: false,
                  optional: true,
                },
                element: {
                  type: 'string',
                  description: 'CSS selector of element to screenshot (optional)',
                  optional: true,
                },
                viewport: {
                  type: 'object',
                  description: 'Viewport dimensions',
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' }
                  },
                  optional: true,
                },
                format: {
                  type: 'string',
                  description: 'Screenshot format',
                  enum: ['png', 'jpeg'],
                  default: 'png',
                  optional: true,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'browser_interact',
            description: 'Interact with webpage elements (click, type, etc.) using Puppeteer',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to navigate to',
                },
                actions: {
                  type: 'array',
                  description: 'Array of actions to perform',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['click', 'type', 'select', 'wait', 'scroll', 'extract']
                      },
                      selector: { type: 'string' },
                      text: { type: 'string', optional: true },
                      value: { type: 'string', optional: true },
                      timeout: { type: 'number', optional: true },
                      x: { type: 'number', optional: true },
                      y: { type: 'number', optional: true },
                      waitAfter: { type: 'number', optional: true }
                    },
                    required: ['type']
                  }
                },
                timeout: {
                  type: 'number',
                  description: 'Navigation timeout in milliseconds',
                  default: 30000,
                  optional: true,
                },
              },
              required: ['url', 'actions'],
            },
          },
          {
            name: 'browser_pdf',
            description: 'Generate PDF from webpage using Puppeteer',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to convert to PDF',
                },
                savePath: {
                  type: 'string',
                  description: 'Path to save the PDF (optional)',
                  optional: true,
                },
                format: {
                  type: 'string',
                  description: 'PDF format',
                  enum: ['A4', 'A3', 'A2', 'A1', 'A0', 'Legal', 'Letter', 'Tabloid'],
                  default: 'A4',
                  optional: true,
                },
                printBackground: {
                  type: 'boolean',
                  description: 'Include background graphics',
                  default: true,
                  optional: true,
                },
                margin: {
                  type: 'object',
                  description: 'PDF margins',
                  properties: {
                    top: { type: 'string' },
                    right: { type: 'string' },
                    bottom: { type: 'string' },
                    left: { type: 'string' }
                  },
                  optional: true,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'network_tools',
            description: 'Network utilities and diagnostics',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Network operation to perform',
                  enum: ['ping', 'port_scan', 'dns_lookup', 'trace_route'],
                },
                host: {
                  type: 'string',
                  description: 'Target host or IP address',
                },
                port: {
                  type: 'number',
                  description: 'Port number (for port_scan)',
                  optional: true,
                },
                count: {
                  type: 'number',
                  description: 'Number of ping attempts',
                  default: 4,
                  optional: true,
                },
              },
              required: ['operation', 'host'],
            },
          },
          {
            name: 'gdrive_operations',
            description: 'Perform Google Drive operations',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Google Drive operation to perform',
                  enum: ['list_files', 'search_files', 'read_file', 'get_file_info', 'auth_status'],
                },
                query: {
                  type: 'string',
                  description: 'Search query for files (for search_files operation)',
                  optional: true,
                },
                fileId: {
                  type: 'string',
                  description: 'File ID for specific file operations',
                  optional: true,
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                  optional: true,
                },
              },
              required: ['operation'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'ask_athena':
            return await this.handleAskAthena(args);
          
          case 'get_system_stats':
            return await this.handleGetSystemStats(args);
          
          case 'analyze_code':
            return await this.handleAnalyzeCode(args);
          
          case 'generate_code':
            return await this.handleGenerateCode(args);
          
          case 'file_operations':
            return await this.handleFileOperations(args);
          
          case 'web_request':
            return await this.handleWebRequest(args);
          
          case 'image_generate':
            return await this.handleImageGenerate(args);
          
          case 'text_summarize':
            return await this.handleTextSummarize(args);
          
          case 'translate_text':
            return await this.handleTranslateText(args);
          
          case 'weather_info':
            return await this.handleWeatherInfo(args);
          
          case 'github_operations':
            return await this.handleGithubOperations(args);
          
          case 'docker_manage':
            return await this.handleDockerManage(args);
          
          case 'process_monitor':
            return await this.handleProcessMonitor(args);
          
          case 'network_tools':
            return await this.handleNetworkTools(args);
          
          case 'browser_navigate':
            return await this.handleBrowserNavigate(args);
          
          case 'browser_screenshot':
            return await this.handleBrowserScreenshot(args);
          
          case 'browser_interact':
            return await this.handleBrowserInteract(args);
          
          case 'browser_pdf':
            return await this.handleBrowserPDF(args);
          
          case 'gdrive_operations':
            return await this.handleGDriveOperations(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleAskAthena(args) {
    const { prompt, context } = args;
    
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }

      // Prepare the full prompt with context if provided
      const fullPrompt = context 
        ? `Context: ${context}\n\nQuestion: ${prompt}` 
        : prompt;

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are Athena, an intelligent AI assistant specialized in helping with development tasks, code analysis, system monitoring, and technical questions. Provide helpful, accurate, and concise responses."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  async handleGetSystemStats(args) {
    const { detailed = true } = args;
    
    try {
      const stats = getCpuStats();
      
      const summary = `System Statistics:
• CPU: ${stats.cpuModel} (${stats.cpuCount} cores)
• CPU Usage: ${stats.cpuUsage}%
• Memory: ${stats.freeMemory}GB free / ${stats.totalMemory}GB total
• Platform: ${stats.platform} (${stats.architecture})
• Uptime: ${stats.uptime} hours
• Hostname: ${stats.hostname}`;

      const detailedInfo = detailed ? `

Detailed Information:
• CPU Speed: ${stats.cpuSpeed} MHz
• Load Average: 1min=${stats.loadAverage['1min'].toFixed(2)}, 5min=${stats.loadAverage['5min'].toFixed(2)}, 15min=${stats.loadAverage['15min'].toFixed(2)}
• Memory Usage: ${((stats.totalMemory - stats.freeMemory) / stats.totalMemory * 100).toFixed(1)}%` : '';

      return {
        content: [
          {
            type: 'text',
            text: summary + detailedInfo,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  async handleAnalyzeCode(args) {
    const { code, language = 'unknown', analysis_type = 'review' } = args;
    
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }

      let systemPrompt = '';
      let userPrompt = '';

      switch (analysis_type) {
        case 'review':
          systemPrompt = `You are a senior software engineer conducting a thorough code review. Analyze the provided ${language} code and provide constructive feedback on code quality, best practices, potential issues, and improvements.`;
          userPrompt = `Please review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide a detailed code review covering:\n- Code structure and organization\n- Potential bugs or issues\n- Performance considerations\n- Security concerns\n- Best practices and improvements`;
          break;
          
        case 'explain':
          systemPrompt = `You are a technical educator who excels at explaining code in a clear, comprehensive manner. Break down the provided ${language} code and explain how it works.`;
          userPrompt = `Please explain this ${language} code in detail:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nExplain:\n- What the code does\n- How it works step by step\n- Key concepts and patterns used\n- Any important details or nuances`;
          break;
          
        case 'optimize':
          systemPrompt = `You are a performance optimization expert. Analyze the provided ${language} code and suggest specific optimizations for better performance, efficiency, and maintainability.`;
          userPrompt = `Please analyze this ${language} code for optimization opportunities:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n- Performance optimization suggestions\n- Memory usage improvements\n- Algorithm efficiency enhancements\n- Code readability improvements\n- Specific refactored examples where helpful`;
          break;
          
        case 'debug':
          systemPrompt = `You are a debugging expert. Analyze the provided ${language} code to identify potential bugs, issues, and debugging strategies.`;
          userPrompt = `Please help debug this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nIdentify:\n- Potential bugs or logical errors\n- Common pitfalls and edge cases\n- Debugging strategies and techniques\n- Suggested fixes or improvements\n- Testing recommendations`;
          break;
      }

      // Call OpenAI API for intelligent code analysis
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const analysis = completion.choices[0]?.message?.content || 'Sorry, I could not analyze the code.';

      return {
        content: [
          {
            type: 'text',
            text: analysis,
          },
        ],
      };
    } catch (error) {
      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  async handleGenerateCode(args) {
    const { requirements, language = 'javascript', framework, style } = args;
    
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }

      // Build the system prompt
      let systemPrompt = `You are an expert software developer specializing in ${language}. Generate clean, well-documented, and production-ready code based on the given requirements.`;
      
      if (framework) {
        systemPrompt += ` Use the ${framework} framework/library.`;
      }
      
      if (style) {
        systemPrompt += ` Follow ${style} coding style and conventions.`;
      }

      // Build the user prompt
      let userPrompt = `Generate ${language} code for the following requirements:\n\n${requirements}`;
      
      if (framework) {
        userPrompt += `\n\nFramework/Library: ${framework}`;
      }
      
      if (style) {
        userPrompt += `\nCoding Style: ${style}`;
      }

      userPrompt += `\n\nPlease provide:
- Clean, well-structured code
- Appropriate comments and documentation
- Error handling where necessary
- Best practices for ${language}
- Brief explanation of the implementation`;

      // Call OpenAI API for intelligent code generation
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      const generatedCode = completion.choices[0]?.message?.content || 'Sorry, I could not generate the code.';

      return {
        content: [
          {
            type: 'text',
            text: generatedCode,
          },
        ],
      };
    } catch (error) {
      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  // New handler methods for the 10 additional tools

  async handleFileOperations(args) {
    const { operation, path: filePath, content, pattern } = args;
    
    try {
      switch (operation) {
        case 'read':
          if (!await fs.pathExists(filePath)) {
            throw new Error(`File or directory does not exist: ${filePath}`);
          }
          
          const stats = await fs.stat(filePath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(filePath);
            return {
              content: [{
                type: 'text',
                text: `Directory contents of ${filePath}:\n${files.map(f => `• ${f}`).join('\n')}`
              }]
            };
          } else {
            const fileContent = await fs.readFile(filePath, 'utf8');
            return {
              content: [{
                type: 'text',
                text: `Content of ${filePath}:\n\n${fileContent}`
              }]
            };
          }
          
        case 'write':
          if (!content) {
            throw new Error('Content is required for write operation');
          }
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, content, 'utf8');
          return {
            content: [{
              type: 'text',
              text: `Successfully wrote content to ${filePath}`
            }]
          };
          
        case 'search':
          if (!pattern) {
            throw new Error('Pattern is required for search operation');
          }
          
          const searchResults = [];
          const searchInFile = async (file) => {
            try {
              const content = await fs.readFile(file, 'utf8');
              const lines = content.split('\n');
              const matches = [];
              
              lines.forEach((line, index) => {
                if (line.toLowerCase().includes(pattern.toLowerCase())) {
                  matches.push(`Line ${index + 1}: ${line.trim()}`);
                }
              });
              
              if (matches.length > 0) {
                searchResults.push(`\n${file}:\n${matches.join('\n')}`);
              }
            } catch (error) {
              // Skip files that can't be read
            }
          };
          
          if (await fs.pathExists(filePath)) {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
              const files = await fs.readdir(filePath, { recursive: true });
              for (const file of files) {
                const fullPath = path.join(filePath, file);
                const fileStats = await fs.stat(fullPath);
                if (fileStats.isFile() && path.extname(fullPath).match(/\.(js|ts|py|txt|md|json|html|css)$/)) {
                  await searchInFile(fullPath);
                }
              }
            } else {
              await searchInFile(filePath);
            }
          }
          
          return {
            content: [{
              type: 'text',
              text: searchResults.length > 0 
                ? `Search results for "${pattern}":${searchResults.join('')}`
                : `No matches found for "${pattern}" in ${filePath}`
            }]
          };
          
        case 'list':
          if (!await fs.pathExists(filePath)) {
            throw new Error(`Directory does not exist: ${filePath}`);
          }
          
          const items = await fs.readdir(filePath, { withFileTypes: true });
          const listing = items.map(item => {
            const type = item.isDirectory() ? '📁' : '📄';
            return `${type} ${item.name}`;
          }).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Contents of ${filePath}:\n${listing}`
            }]
          };
          
        case 'delete':
          if (!await fs.pathExists(filePath)) {
            throw new Error(`File or directory does not exist: ${filePath}`);
          }
          
          await fs.remove(filePath);
          return {
            content: [{
              type: 'text',
              text: `Successfully deleted ${filePath}`
            }]
          };
          
        default:
          throw new Error(`Unknown file operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  async handleWebRequest(args) {
    const { url, method = 'GET', headers = {}, data } = args;
    
    try {
      const config = {
        method,
        url,
        headers,
        timeout: 10000, // 10 second timeout
      };
      
      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }
      
      const response = await axios(config);
      
      return {
        content: [{
          type: 'text',
          text: `HTTP ${method} ${url}\nStatus: ${response.status} ${response.statusText}\nHeaders: ${JSON.stringify(response.headers, null, 2)}\n\nResponse:\n${typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data}`
        }]
      };
    } catch (error) {
      if (error.response) {
        return {
          content: [{
            type: 'text',
            text: `HTTP Error ${error.response.status}: ${error.response.statusText}\nResponse: ${JSON.stringify(error.response.data, null, 2)}`
          }]
        };
      } else {
        throw new Error(`Web request failed: ${error.message}`);
      }
    }
  }

  async handleImageGenerate(args) {
    const { prompt, size = '512x512', n = 1 } = args;
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }
      
      const response = await this.openai.images.generate({
        model: "dall-e-2",
        prompt,
        n,
        size,
      });
      
      const imageUrls = response.data.map(img => img.url).join('\n');
      
      return {
        content: [{
          type: 'text',
          text: `Generated ${n} image(s) for prompt: "${prompt}"\nSize: ${size}\n\nImage URLs:\n${imageUrls}`
        }]
      };
    } catch (error) {
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else {
        throw new Error(`Image generation failed: ${error.message}`);
      }
    }
  }

  async handleTextSummarize(args) {
    const { text, length = 'medium', style = 'paragraph' } = args;
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }
      
      let lengthInstruction = '';
      switch (length) {
        case 'short':
          lengthInstruction = 'in 2-3 sentences';
          break;
        case 'medium':
          lengthInstruction = 'in 1-2 paragraphs';
          break;
        case 'long':
          lengthInstruction = 'in 3-4 paragraphs with detailed analysis';
          break;
      }
      
      let styleInstruction = '';
      switch (style) {
        case 'bullet':
          styleInstruction = 'Format the summary as bullet points.';
          break;
        case 'paragraph':
          styleInstruction = 'Format the summary as flowing paragraphs.';
          break;
        case 'technical':
          styleInstruction = 'Use technical language and focus on key technical details.';
          break;
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert at summarizing text. Create a clear, concise summary ${lengthInstruction}. ${styleInstruction}`
          },
          {
            role: "user",
            content: `Please summarize the following text:\n\n${text}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });
      
      const summary = completion.choices[0]?.message?.content || 'Sorry, I could not summarize the text.';
      
      return {
        content: [{
          type: 'text',
          text: `Summary (${length}, ${style} style):\n\n${summary}`
        }]
      };
    } catch (error) {
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      } else {
        throw new Error(`Text summarization failed: ${error.message}`);
      }
    }
  }

  async handleTranslateText(args) {
    const { text, from_language, to_language } = args;
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }
      
      const fromLang = from_language ? `from ${from_language}` : 'from the detected language';
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the provided text ${fromLang} to ${to_language}. Provide only the translation, maintaining the original tone and meaning.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });
      
      const translation = completion.choices[0]?.message?.content || 'Sorry, I could not translate the text.';
      
      return {
        content: [{
          type: 'text',
          text: `Translation ${fromLang} to ${to_language}:\n\n${translation}`
        }]
      };
    } catch (error) {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async handleWeatherInfo(args) {
    const { location, units = 'celsius' } = args;
    
    try {
      // Using OpenWeatherMap API (free tier)
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenWeatherMap API key not configured. Please set OPENWEATHER_API_KEY in your environment variables.');
      }
      
      const unitsParam = units === 'fahrenheit' ? 'imperial' : units === 'kelvin' ? 'standard' : 'metric';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${unitsParam}`;
      
      const response = await axios.get(url);
      const weather = response.data;
      
      const tempUnit = units === 'fahrenheit' ? '°F' : units === 'kelvin' ? 'K' : '°C';
      
      const weatherInfo = `Weather in ${weather.name}, ${weather.sys.country}:
• Temperature: ${weather.main.temp}${tempUnit} (feels like ${weather.main.feels_like}${tempUnit})
• Condition: ${weather.weather[0].main} - ${weather.weather[0].description}
• Humidity: ${weather.main.humidity}%
• Pressure: ${weather.main.pressure} hPa
• Wind: ${weather.wind.speed} m/s
• Visibility: ${weather.visibility / 1000} km
• Sunrise: ${new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}
• Sunset: ${new Date(weather.sys.sunset * 1000).toLocaleTimeString()}`;
      
      return {
        content: [{
          type: 'text',
          text: weatherInfo
        }]
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`Location not found: ${location}`);
      } else {
        throw new Error(`Weather request failed: ${error.message}`);
      }
    }
  }

  async handleGithubOperations(args) {
    const { operation, owner, repo, query, path: filePath } = args;
    
    try {
      if (!process.env.GITHUB_TOKEN) {
        throw new Error('GitHub token not configured. Please set GITHUB_TOKEN in your environment variables.');
      }
      
      switch (operation) {
        case 'list_repos':
          const repos = await this.octokit.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 10
          });
          
          const repoList = repos.data.map(repo => 
            `• ${repo.full_name} - ${repo.description || 'No description'} (${repo.language || 'Unknown'})`
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Your recent repositories:\n${repoList}`
            }]
          };
          
        case 'get_repo':
          if (!owner || !repo) {
            throw new Error('Owner and repo are required for get_repo operation');
          }
          
          const repoInfo = await this.octokit.rest.repos.get({
            owner,
            repo
          });
          
          const info = repoInfo.data;
          return {
            content: [{
              type: 'text',
              text: `Repository: ${info.full_name}
Description: ${info.description || 'No description'}
Language: ${info.language || 'Unknown'}
Stars: ${info.stargazers_count}
Forks: ${info.forks_count}
Issues: ${info.open_issues_count}
Created: ${new Date(info.created_at).toLocaleDateString()}
Updated: ${new Date(info.updated_at).toLocaleDateString()}
URL: ${info.html_url}`
            }]
          };
          
        case 'list_issues':
          if (!owner || !repo) {
            throw new Error('Owner and repo are required for list_issues operation');
          }
          
          const issues = await this.octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'open',
            per_page: 10
          });
          
          const issueList = issues.data.map(issue => 
            `• #${issue.number}: ${issue.title} (${issue.state})`
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Open issues in ${owner}/${repo}:\n${issueList}`
            }]
          };
          
        case 'search_code':
          if (!query) {
            throw new Error('Query is required for search_code operation');
          }
          
          const searchResults = await this.octokit.rest.search.code({
            q: query,
            per_page: 5
          });
          
          const codeResults = searchResults.data.items.map(item => 
            `• ${item.repository.full_name}/${item.path}\n  ${item.html_url}`
          ).join('\n\n');
          
          return {
            content: [{
              type: 'text',
              text: `Code search results for "${query}":\n\n${codeResults}`
            }]
          };
          
        default:
          throw new Error(`Unknown GitHub operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`GitHub operation failed: ${error.message}`);
    }
  }

  async handleDockerManage(args) {
    const { operation, container_id, image } = args;
    
    try {
      switch (operation) {
        case 'list_containers':
          const { stdout: containers } = await execAsync('docker ps -a --format "table {{.ID}}\\t{{.Image}}\\t{{.Command}}\\t{{.Status}}\\t{{.Names}}"');
          return {
            content: [{
              type: 'text',
              text: `Docker Containers:\n${containers}`
            }]
          };
          
        case 'list_images':
          const { stdout: images } = await execAsync('docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.ID}}\\t{{.CreatedAt}}\\t{{.Size}}"');
          return {
            content: [{
              type: 'text',
              text: `Docker Images:\n${images}`
            }]
          };
          
        case 'start_container':
          if (!container_id) {
            throw new Error('Container ID is required for start_container operation');
          }
          
          const { stdout: startResult } = await execAsync(`docker start ${container_id}`);
          return {
            content: [{
              type: 'text',
              text: `Started container: ${startResult.trim()}`
            }]
          };
          
        case 'stop_container':
          if (!container_id) {
            throw new Error('Container ID is required for stop_container operation');
          }
          
          const { stdout: stopResult } = await execAsync(`docker stop ${container_id}`);
          return {
            content: [{
              type: 'text',
              text: `Stopped container: ${stopResult.trim()}`
            }]
          };
          
        case 'container_logs':
          if (!container_id) {
            throw new Error('Container ID is required for container_logs operation');
          }
          
          const { stdout: logs } = await execAsync(`docker logs --tail 50 ${container_id}`);
          return {
            content: [{
              type: 'text',
              text: `Logs for container ${container_id}:\n${logs}`
            }]
          };
          
        case 'container_stats':
          if (!container_id) {
            throw new Error('Container ID is required for container_stats operation');
          }
          
          const { stdout: stats } = await execAsync(`docker stats ${container_id} --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.BlockIO}}"`);
          return {
            content: [{
              type: 'text',
              text: `Stats for container ${container_id}:\n${stats}`
            }]
          };
          
        default:
          throw new Error(`Unknown Docker operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Docker operation failed: ${error.message}`);
    }
  }

  async handleProcessMonitor(args) {
    const { operation, process_name, pid } = args;
    
    try {
      switch (operation) {
        case 'list':
          const { stdout: processes } = await execAsync('tasklist /fo csv | findstr /v "INFO:"');
          const lines = processes.split('\n').slice(0, 20); // Limit to first 20 processes
          return {
            content: [{
              type: 'text',
              text: `Running Processes (top 20):\n${lines.join('\n')}`
            }]
          };
          
        case 'find':
          if (!process_name) {
            throw new Error('Process name is required for find operation');
          }
          
          const { stdout: foundProcesses } = await execAsync(`tasklist /fi "imagename eq ${process_name}*" /fo csv`);
          return {
            content: [{
              type: 'text',
              text: `Processes matching "${process_name}":\n${foundProcesses}`
            }]
          };
          
        case 'kill':
          if (!pid && !process_name) {
            throw new Error('Either PID or process name is required for kill operation');
          }
          
          const killCommand = pid ? `taskkill /pid ${pid} /f` : `taskkill /im ${process_name} /f`;
          const { stdout: killResult } = await execAsync(killCommand);
          return {
            content: [{
              type: 'text',
              text: `Kill result: ${killResult}`
            }]
          };
          
        case 'info':
          if (!pid && !process_name) {
            throw new Error('Either PID or process name is required for info operation');
          }
          
          const infoCommand = pid 
            ? `wmic process where processid=${pid} get name,processid,parentprocessid,commandline /format:csv`
            : `wmic process where "name='${process_name}'" get name,processid,parentprocessid,commandline /format:csv`;
          
          const { stdout: processInfo } = await execAsync(infoCommand);
          return {
            content: [{
              type: 'text',
              text: `Process Information:\n${processInfo}`
            }]
          };
          
        default:
          throw new Error(`Unknown process operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Process operation failed: ${error.message}`);
    }
  }

  async handleNetworkTools(args) {
    const { operation, host, port, count = 4 } = args;
    
    try {
      switch (operation) {
        case 'ping':
          const pingResult = await ping.promise.probe(host, {
            timeout: 10,
            extra: [`-n ${count}`],
          });
          
          return {
            content: [{
              type: 'text',
              text: `Ping results for ${host}:
• Host: ${pingResult.host}
• Alive: ${pingResult.alive ? 'Yes' : 'No'}
• Time: ${pingResult.time}ms
• Min: ${pingResult.min}ms
• Max: ${pingResult.max}ms
• Avg: ${pingResult.avg}ms
• Packet Loss: ${pingResult.packetLoss}%`
            }]
          };
          
        case 'port_scan':
          if (!port) {
            throw new Error('Port is required for port_scan operation');
          }
          
          const { stdout: portScan } = await execAsync(`powershell "Test-NetConnection -ComputerName ${host} -Port ${port}"`);
          return {
            content: [{
              type: 'text',
              text: `Port scan results for ${host}:${port}:\n${portScan}`
            }]
          };
          
        case 'dns_lookup':
          const { stdout: dnsResult } = await execAsync(`nslookup ${host}`);
          return {
            content: [{
              type: 'text',
              text: `DNS lookup for ${host}:\n${dnsResult}`
            }]
          };
          
        case 'trace_route':
          const { stdout: traceResult } = await execAsync(`tracert ${host}`);
          return {
            content: [{
              type: 'text',
              text: `Trace route to ${host}:\n${traceResult}`
            }]
          };
          
        default:
          throw new Error(`Unknown network operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Network operation failed: ${error.message}`);
    }
  }

  async handleBrowserNavigate(args) {
    const { url, selector, waitForSelector, waitUntil = 'networkidle2', timeout = 30000 } = args;
    
    try {
      const result = await puppeteerTools.navigateAndExtract(url, {
        selector,
        waitForSelector,
        waitUntil,
        timeout
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const contentText = selector 
        ? JSON.stringify(result.content, null, 2)
        : `Page content extracted (${result.content.length} characters)`;

      return {
        content: [{
          type: 'text',
          text: `Navigation successful for ${url}

Metadata:
• Title: ${result.metadata.title}
• URL: ${result.metadata.url}
• Description: ${result.metadata.description}
• Viewport: ${result.metadata.viewport.width}x${result.metadata.viewport.height}

Content:
${contentText}`
        }]
      };
    } catch (error) {
      throw new Error(`Browser navigation failed: ${error.message}`);
    }
  }

  async handleBrowserScreenshot(args) {
    const { url, savePath, fullPage = false, element, viewport, format = 'png' } = args;
    
    try {
      const result = await puppeteerTools.takeScreenshot(url, {
        savePath,
        fullPage,
        element,
        viewport,
        format
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        content: [{
          type: 'text',
          text: `Screenshot captured successfully for ${url}
• Size: ${(result.size / 1024).toFixed(2)} KB
• Format: ${format}
• Full page: ${fullPage ? 'Yes' : 'No'}
${result.savedTo ? `• Saved to: ${result.savedTo}` : '• Screenshot data available in buffer'}`
        }]
      };
    } catch (error) {
      throw new Error(`Browser screenshot failed: ${error.message}`);
    }
  }

  async handleBrowserInteract(args) {
    const { url, actions, timeout = 30000 } = args;
    
    try {
      const result = await puppeteerTools.interactWithPage(url, actions, {
        timeout
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const actionResults = result.results.map(r => 
        `• ${r.action}${r.selector ? ` (${r.selector})` : ''}: ${r.success ? 'Success' : `Failed - ${r.error}`}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Browser interaction completed for ${url}

Actions performed:
${actionResults}

Final state:
• URL: ${result.finalState.url}
• Title: ${result.finalState.title}`
        }]
      };
    } catch (error) {
      throw new Error(`Browser interaction failed: ${error.message}`);
    }
  }

  async handleBrowserPDF(args) {
    const { url, savePath, format = 'A4', printBackground = true, margin } = args;
    
    try {
      const result = await puppeteerTools.generatePDF(url, {
        savePath,
        format,
        printBackground,
        margin
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        content: [{
          type: 'text',
          text: `PDF generated successfully for ${url}
• Size: ${(result.size / 1024).toFixed(2)} KB
• Format: ${format}
• Background: ${printBackground ? 'Included' : 'Excluded'}
${result.savedTo ? `• Saved to: ${result.savedTo}` : '• PDF data available in buffer'}`
        }]
      };
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async handleGDriveOperations(args) {
    const { operation, query, fileId, maxResults = 10 } = args;
    
    try {
      switch (operation) {
        case 'auth_status':
          const authStatus = await this.gdriveTools.checkAuthStatus();
          return {
            content: [{
              type: 'text',
              text: `Google Drive Authentication Status:
• Authenticated: ${authStatus.authenticated ? 'Yes' : 'No'}
• User: ${authStatus.user || 'Not available'}
${authStatus.authenticated ? '' : '\nTo authenticate, please run the auth setup process as described in the credentials/README.md file.'}`
            }]
          };

        case 'list_files':
          const files = await this.gdriveTools.listFiles(maxResults);
          const fileList = files.map(file => 
            `• ${file.name} (${file.mimeType}) - ID: ${file.id}`
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Google Drive Files (${files.length} results):
${fileList || 'No files found'}`
            }]
          };

        case 'search_files':
          if (!query) {
            throw new Error('Query is required for search_files operation');
          }
          
          const searchResults = await this.gdriveTools.searchFiles(query, maxResults);
          const searchList = searchResults.map(file => 
            `• ${file.name} (${file.mimeType}) - ID: ${file.id}`
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Google Drive Search Results for "${query}" (${searchResults.length} results):
${searchList || 'No files found'}`
            }]
          };

        case 'read_file':
          if (!fileId) {
            throw new Error('File ID is required for read_file operation');
          }
          
          const fileContent = await this.gdriveTools.readFile(fileId);
          return {
            content: [{
              type: 'text',
              text: `File Content:
${fileContent}`
            }]
          };

        case 'get_file_info':
          if (!fileId) {
            throw new Error('File ID is required for get_file_info operation');
          }
          
          const fileInfo = await this.gdriveTools.getFileInfo(fileId);
          return {
            content: [{
              type: 'text',
              text: `File Information:
• Name: ${fileInfo.name}
• Type: ${fileInfo.mimeType}
• Size: ${fileInfo.size ? `${(fileInfo.size / 1024).toFixed(2)} KB` : 'N/A'}
• Created: ${fileInfo.createdTime}
• Modified: ${fileInfo.modifiedTime}
• Owner: ${fileInfo.owners?.[0]?.displayName || 'Unknown'}
• ID: ${fileInfo.id}`
            }]
          };

        default:
          throw new Error(`Unknown Google Drive operation: ${operation}`);
      }
    } catch (error) {
      if (error.message.includes('credentials') || error.message.includes('authentication')) {
        return {
          content: [{
            type: 'text',
            text: `Google Drive Authentication Error: ${error.message}

To set up Google Drive authentication:
1. Follow the instructions in credentials/README.md
2. Create OAuth credentials in Google Cloud Console
3. Run the authentication process
4. Try the operation again`
          }],
          isError: true
        };
      }
      throw new Error(`Google Drive operation failed: ${error.message}`);
    }
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
    console.error('Athena MCP server running on stdio');
  }
}

// Start the server
if (require.main === module) {
  const server = new AthenaServer();
  server.run().catch(console.error);
}

module.exports = AthenaServer;