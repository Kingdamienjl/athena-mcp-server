# Athena MCP Server

A comprehensive Model Context Protocol (MCP) server that provides AI-powered tools and system utilities. This server integrates with OpenAI GPT models to deliver intelligent responses and analysis capabilities.

## Features

### Core AI Tools (OpenAI GPT-powered)
- **ask_athena**: Intelligent AI assistant for general queries and problem-solving
- **analyze_code**: Advanced code analysis with optimization suggestions
- **generate_code**: Intelligent code generation based on requirements
- **text_summarize**: AI-powered text summarization with customizable length and style
- **translate_text**: Multi-language translation using OpenAI models
- **image_generate**: DALL-E powered image generation

### System & Development Tools
- **get_system_stats**: Real-time system monitoring (CPU, memory, disk usage)
- **file_operations**: Comprehensive file and directory management
- **process_monitor**: System process monitoring and management
- **docker_manage**: Docker container and image management
- **network_tools**: Network diagnostics (ping, port scan, DNS lookup, traceroute)

### Web & API Tools
- **web_request**: HTTP client for API testing and web scraping
- **weather_info**: Real-time weather information using OpenWeatherMap API
- **github_operations**: GitHub repository management and code search

## 📁 Project Structure

```
Athena MCP/
├── app.js                 # Backend entry point
├── mcp-server.js          # MCP server for Trae integration
├── mcp-config.json        # MCP configuration file
├── package.json           # Backend dependencies
├── .env                   # Environment variables
├── tools/                 # Custom tools directory
│   └── get_cpu_stats.js   # CPU statistics tool
├── frontend/              # React frontend
│   ├── package.json       # Frontend dependencies
│   ├── public/
│   └── src/
│       ├── App.js         # Main React component
│       ├── App.css        # Component styles
│       ├── index.js       # React entry point
│       └── index.css      # Global styles
├── docker-compose.yml     # Docker orchestration
├── Dockerfile.backend     # Backend Docker image
└── README.md             # This file
```

## 🔌 MCP Integration with Trae

### Quick Setup for Trae

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start MCP server:**
   ```bash
   npm run mcp
   ```

3. **Add to Trae configuration:**
   Add this to your Trae MCP configuration:
   ```json
   {
     "mcpServers": {
       "athena": {
         "command": "node",
         "args": ["mcp-server.js"],
         "cwd": "d:\\Projects\\Athena MCP"
       }
     }
   }
   ```

### Available MCP Tools

| Tool Name | Description |
|-----------|-------------|
| `ask_athena` | Ask Athena AI assistant questions and get intelligent responses powered by OpenAI GPT |
| `get_system_stats` | Get detailed system CPU, memory, and performance statistics |
| `analyze_code` | Analyze code snippets with AI-powered review, explain, optimize, or debug modes |
| `generate_code` | Generate code based on requirements and specifications using OpenAI |

### MCP Tool Examples

**Ask Athena:**
```json
{
  "name": "ask_athena",
  "arguments": {
    "prompt": "How do I optimize React performance?",
    "context": "Working on a large React application with performance issues"
  }
}
```

**Get System Stats:**
```json
{
  "name": "get_system_stats",
  "arguments": {
    "detailed": true
  }
}
```

**Analyze Code:**
```json
{
  "name": "analyze_code",
  "arguments": {
    "code": "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }",
    "language": "javascript",
    "analysis_type": "optimize"
  }
}
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

### Method 1: Local Development

1. **Clone and setup backend:**
   ```bash
   cd "d:\Projects\Athena MCP"
   npm install
   ```

2. **Setup frontend:**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment:**
   - Edit `.env` file and add your OpenAI API key:
   ```
   PORT=4000
   OPENAI_API_KEY=your_actual_api_key_here
   ```

4. **Run the applications:**
   
   **Terminal 1 (Backend):**
   ```bash
   npm start
   # Backend runs on http://localhost:4000
   ```
   
   **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm start
   # Frontend runs on http://localhost:3000
   ```

### Method 2: Docker Compose

1. **Set environment variables:**
   ```bash
   # Create .env file with your API key
   echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
   ```

2. **Run with Docker:**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - Backend on http://localhost:4000
   - Frontend on http://localhost:3000

## 🔌 API Endpoints

### Backend API (Port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/`      | API information and available endpoints |
| POST   | `/ask`   | Send a prompt to Athena AI |
| GET    | `/cpu`   | Get system CPU and memory statistics |
| GET    | `/health`| Health check endpoint |

### Example API Usage

**Ask Athena a question:**
```bash
curl -X POST http://localhost:4000/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is artificial intelligence?"}'
```

**Get CPU statistics:**
```bash
curl http://localhost:4000/cpu
```

## 🎨 Frontend Features

- **Modern UI**: Clean, responsive design with gradient backgrounds
- **Real-time Interaction**: Instant feedback and loading states
- **Error Handling**: User-friendly error messages
- **Mobile Responsive**: Works on all device sizes
- **System Monitoring**: Visual display of CPU and memory stats

## 🔧 Development

### Adding New Tools

1. Create a new file in the `tools/` directory:
   ```javascript
   // tools/my_new_tool.js
   function myNewTool() {
     // Your tool logic here
     return { result: "Tool output" };
   }
   
   module.exports = { myNewTool };
   ```

2. Import and use in `app.js`:
   ```javascript
   const { myNewTool } = require('./tools/my_new_tool');
   
   app.get('/my-endpoint', (req, res) => {
     const result = myNewTool();
     res.json(result);
   });
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 4000 |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Required |
| `NODE_ENV` | Environment mode | development |

## 🐳 Docker Commands

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose build backend
docker-compose build frontend
```

## 🚀 Production Deployment

1. **Set production environment variables**
2. **Build optimized frontend:**
   ```bash
   cd frontend
   npm run build
   ```
3. **Use process manager like PM2:**
   ```bash
   npm install -g pm2
   pm2 start app.js --name athena-backend
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🆘 Troubleshooting

**Backend won't start:**
- Check if port 4000 is available
- Verify Node.js version (18+)
- Check `.env` file configuration

**Frontend can't connect to backend:**
- Ensure backend is running on port 4000
- Check CORS configuration
- Verify API_BASE_URL in frontend

**Docker issues:**
- Ensure Docker is running
- Check port conflicts
- Verify environment variables in docker-compose.yml

---

**Happy coding! 🎉**