# MCP Orchestration System

A comprehensive Model Context Protocol (MCP) orchestration system that enables server-side coordination of multiple MCP servers through natural language commands and structured APIs.

## 🚀 Overview

This system provides a powerful framework for:
- **Multi-server orchestration**: Coordinate multiple MCP servers in complex workflows
- **Natural language interface**: Register servers and execute tasks using conversational commands
- **Flexible initialization**: Support for remote URLs, NPX packages, local binaries, **IP-based servers with authentication**, and **Swagger-generated NPX modules**
- **Task automation**: Create and execute multi-step tasks across different MCP servers
- **Real-time management**: Dynamic server registration and task orchestration
- **Secure connections**: JWT, API Key, and Basic authentication support for IP-based servers
- **Auto-generation**: Automatic MCP server generation from OpenAPI/Swagger specifications

## 🏗️ Architecture

### Core Components

#### 1. MCP Orchestrator (`src/helper/mcp-orchestrator.ts`)
The central orchestration engine that manages multiple MCP server instances.

**Features:**
- Support for 5 server types: `remote`, `npx`, `local`, `ip`, `swagger-npx`
- Child process management for server spawning
- Connection pooling and lifecycle management
- Error handling and automatic reconnection
- Task execution with parallel/sequential support
- Authentication support (JWT, API Key, Basic Auth)
- TLS/SSL configuration for secure connections
- Automatic Swagger/OpenAPI client generation

**Key Methods:**
```typescript
class MCPOrchestrator {
  registerServer(config: MCPServerConfig): Promise<void>
  initializeServer(serverId: string): Promise<void>
  executeTask(taskId: string, parameters?: any): Promise<any>
  listServers(): MCPServerInfo[]
  shutdownServer(serverId: string): Promise<void>
}
```

#### 2. Enhanced MCP Tools (`src/functions/enhanced_mcp_tools.ts`)
High-level API wrapper providing simplified access to orchestration features.

**Functions:**
- `initializeMCPOrchestrator()`: Initialize the orchestrator with default servers
- `registerMCPServer(config)`: Register a new MCP server
- `registerMCPTask(task)`: Define a multi-server task
- `executeMCPTask(taskId, params)`: Execute a registered task
- `listMCPServers()`: Get all registered servers
- `listMCPTasks()`: Get all defined tasks

#### 3. Enhanced Chatbot (`src/functions/enhanced_mcp_chatbot.ts`)
Natural language interface for MCP orchestration.

**Supported Commands:**
```bash
# Server Management
"register-mcp-server id:calendar-server name:\"Calendar Server\" type:npx command:@modelcontextprotocol/server-calendar"
"register-mcp-server id:api-server name:\"External API\" type:ip host:api.example.com port:443 protocol:https auth:jwt token:YOUR_JWT_TOKEN"
"register-mcp-server id:petstore name:\"Petstore API\" type:swagger-npx swagger:https://petstore.swagger.io/v2/swagger.json"
"list all MCP servers"
"show registered MCP servers"

# Task Management  
"register-mcp-task id:analysis name:\"Data Analysis\" servers:[github,filesystem] parallel:false"
"execute task analysis with parameters {repo: 'myrepo'}"
"list all MCP tasks"
```

## 📦 Installation & Setup

### Prerequisites
```bash
npm install @godspeedsystems/core
npm install @godspeedsystems/plugins-express-as-http
```

### MCP Server Packages (Optional)
```bash
# GitHub MCP Server
npm install -g @modelcontextprotocol/server-github

# Filesystem MCP Server  
npm install -g @modelcontextprotocol/server-filesystem

# Memory MCP Server
npm install -g @modelcontextprotocol/server-memory

# SQLite MCP Server
npm install -g @modelcontextprotocol/server-sqlite
```

### Environment Setup
Create a `.env` file with necessary configurations:
```bash
# GitHub token for GitHub MCP server (if using)
GITHUB_TOKEN=your_github_token_here

# Database configuration
DATABASE_URL=your_database_url_here

# IP-based MCP Server Configuration
MCP_IP_SERVER_HOST=api.example.com
MCP_IP_SERVER_PORT=443
MCP_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MCP_API_KEY=sk-1234567890abcdef

# Swagger-generated MCP Configuration  
SWAGGER_SPEC_URL=https://petstore.swagger.io/v2/swagger.json
SWAGGER_OUTPUT_DIR=./tmp/swagger-generated

# TLS Configuration (optional)
MCP_TLS_REJECT_UNAUTHORIZED=false
```

See `.env.enhanced-mcp-example` for complete configuration examples.

## 🎯 Usage Examples

### 1. Server Registration

#### Via Natural Language API
```bash
# NPX Package Server
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "register-mcp-server id:calendar-server name:\"Calendar MCP Server\" type:npx command:@modelcontextprotocol/server-calendar",
    "sessionId": "session-123"
  }'

# IP-based Server with JWT
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "register-mcp-server id:api-jwt name:\"External API (JWT)\" type:ip host:api.example.com port:443 protocol:https auth:jwt token:YOUR_JWT_TOKEN",
    "sessionId": "session-123"
  }'

# Swagger-generated Server
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "register-mcp-server id:petstore name:\"Petstore API\" type:swagger-npx swagger:https://petstore.swagger.io/v2/swagger.json",
    "sessionId": "session-123"
  }'
```

#### Via Direct API
```bash
curl -X POST "http://localhost:3000/register-mcp-server" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "weather-server",
    "name": "Weather MCP Server", 
    "type": "npx",
    "config": {
      "package": "@modelcontextprotocol/server-weather"
    }
  }'
```

#### Server Configuration Types

**NPX Package Server:**
```json
{
  "id": "github-server",
  "name": "GitHub MCP Server",
  "type": "npx", 
  "config": {
    "package": "@modelcontextprotocol/server-github",
    "args": ["--verbose"]
  }
}
```

**Remote URL Server:**
```json
{
  "id": "remote-api",
  "name": "Remote API Server",
  "type": "remote",
  "config": {
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer token"
    }
  }
}
```

**Local Binary Server:**
```json
{
  "id": "local-tool",
  "name": "Local Tool Server", 
  "type": "local",
  "config": {
    "command": "/usr/local/bin/my-mcp-server",
    "args": ["--config", "/etc/mcp/config.json"]
  }
}
```

**IP-based Server with JWT Authentication:**
```json
{
  "id": "external-api",
  "name": "External API Server",
  "type": "ip",
  "config": {
    "host": "api.example.com",
    "port": 443,
    "protocol": "https",
    "auth": {
      "type": "jwt",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "tls": {
      "enabled": true,
      "rejectUnauthorized": true
    }
  }
}
```

**IP-based Server with API Key Authentication:**
```json
{
  "id": "internal-api",
  "name": "Internal API Server",
  "type": "ip",
  "config": {
    "host": "127.0.0.1",
    "port": 8080,
    "protocol": "http",
    "auth": {
      "type": "api-key",
      "secretKey": "sk-1234567890abcdef",
      "keyHeader": "X-API-Key"
    }
  }
}
```

**IP-based Server with Basic Authentication:**
```json
{
  "id": "legacy-api",
  "name": "Legacy API Server",
  "type": "ip",
  "config": {
    "host": "legacy.company.com",
    "port": 9000,
    "protocol": "https",
    "auth": {
      "type": "basic",
      "username": "admin",
      "password": "secretpassword"
    }
  }
}
```

**Swagger-generated NPX Server:**
```json
{
  "id": "petstore-api",
  "name": "Petstore API MCP",
  "type": "swagger-npx",
  "config": {
    "swaggerSpec": "https://petstore.swagger.io/v2/swagger.json",
    "swaggerOptions": {
      "generateClient": true,
      "clientName": "typescript-node",
      "outputDir": "./tmp/swagger-petstore",
      "packageName": "mcp-petstore-api"
    }
  }
}
```

### 2. Task Definition & Execution

#### Register a Complex Task
```bash
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "register-mcp-task id:project-analysis name:\"Comprehensive Project Analysis\" description:\"Analyze project files, GitHub status, and store results\" servers:[github-server,filesystem-server,memory-server] parallel:false",
    "sessionId": "session-123"
  }'
```

#### Execute Task
```bash
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "execute-mcp-task id:project-analysis parameters:{repo:\"myrepo\",branch:\"main\"}",
    "sessionId": "session-123"
  }'
```

### 3. Server Management

#### List All Servers
```bash
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Can you show me all registered MCP servers?",
    "sessionId": "session-123"
  }'
```

#### Check Server Status
```bash
curl -X GET "http://localhost:3000/test-mcp-orchestration"
```

## 🔧 API Endpoints

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/enhanced-chatbot` | POST | Natural language MCP interface |
| `/test-mcp-orchestration` | GET | Orchestration system validation |
| `/github-mcp-tools` | GET | GitHub MCP server tools |
| `/github-mcp-client` | POST | GitHub MCP client operations |

### WebSocket Endpoints

| Event | Description |
|-------|-------------|
| `stream` | Real-time streaming responses |
| `mcp.enhanced-chatbot` | MCP chatbot via WebSocket |
| `mcp.call-mcp` | Direct MCP server calls |

## 📊 Response Formats

### Successful Server Registration
```json
{
  "context": "## Tool Execution Results\n\n### register-mcp-server\n✅ **Status**: Success\n**Server Config**: calendar-server (npx)\n\n",
  "tool_results": [
    {
      "tool": "register-mcp-server",
      "serverConfig": {
        "type": "npx",
        "config": {
          "package": "@modelcontextprotocol/server-calendar"
        },
        "id": "calendar-server",
        "name": "Calendar MCP Server"
      },
      "success": true,
      "result": {
        "serverId": "calendar-server",
        "type": "npx"
      }
    }
  ],
  "processed_with_tools": true,
  "mode": "rag",
  "toolsUsed": ["call-mcp", "register-mcp-server"],
  "timestamp": "2025-08-05T04:14:12.546Z"
}
```

### Server List Response
```json
{
  "context": "## Tool Execution Results\n\n### list-mcp-servers\n✅ **Status**: Success\n\n",
  "tool_results": [
    {
      "tool": "list-mcp-servers",
      "success": true,
      "result": {
        "servers": [
          {
            "id": "calendar-server",
            "name": "Calendar MCP Server",
            "type": "npx",
            "status": {
              "initialized": false,
              "connected": false
            }
          },
          {
            "id": "weather-server", 
            "name": "Weather MCP Server",
            "type": "npx",
            "status": {
              "initialized": false,
              "connected": false
            }
          }
        ]
      }
    }
  ],
  "processed_with_tools": true,
  "toolsUsed": ["call-mcp", "list-mcp-servers"]
}
```

## 🧪 Testing

### Orchestration Validation
```bash
# Test the complete orchestration system
curl -X GET "http://localhost:3000/test-mcp-orchestration" | jq .

# Expected results:
# ✅ Orchestrator initialization
# ✅ Server listing (multiple servers)
# ✅ Custom server registration  
# ✅ Task creation
# ✅ Task listing
```

### Enhanced Features Testing
```bash
# Test IP-based servers and Swagger-generated modules
node test_enhanced_mcp_features.js

# Test IP server registration
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{"query": "register-mcp-server id:test-api name:\"Test API\" type:ip host:httpbin.org port:443 protocol:https", "sessionId": "test"}'

# Test Swagger server registration  
curl -X POST "http://localhost:3000/enhanced-chatbot" \
  -H "Content-Type: application/json" \
  -d '{"query": "register-mcp-server id:swagger-test name:\"Swagger Test\" type:swagger-npx swagger:https://petstore.swagger.io/v2/swagger.json", "sessionId": "test"}'
```

## 🎛️ Configuration

### Default Server Configurations
The system comes with pre-configured default servers:

```typescript
const defaultServers = [
  {
    id: 'github-mcp',
    name: 'GitHub MCP Server',
    type: 'npx',
    config: { package: '@modelcontextprotocol/server-github' }
  },
  {
    id: 'filesystem-mcp', 
    name: 'File System MCP Server',
    type: 'npx',
    config: { package: '@modelcontextprotocol/server-filesystem' }
  },
  {
    id: 'memory-mcp',
    name: 'Memory MCP Server', 
    type: 'npx',
    config: { package: '@modelcontextprotocol/server-memory' }
  },
  {
    id: 'sqlite-mcp',
    name: 'SQLite MCP Server',
    type: 'npx', 
    config: { package: '@modelcontextprotocol/server-sqlite' }
  }
];
```

### Task Templates
Example multi-server task configuration:

```typescript
const comprehensiveAnalysisTask = {
  id: 'comprehensive-analysis',
  name: 'Comprehensive Project Analysis',
  description: 'Analyze project files, check GitHub status, and store results in memory',
  parallel: false,
  steps: [
    {
      server: 'filesystem-mcp',
      tool: 'list_directory',
      parameters: { path: '.' }
    },
    {
      server: 'github-mcp', 
      tool: 'get_repository',
      parameters: { owner: 'user', repo: 'project' }
    },
    {
      server: 'memory-mcp',
      tool: 'store_data',
      parameters: { key: 'analysis_results', data: '${previous_results}' }
    }
  ]
};
```

## 🔍 Troubleshooting

### Common Issues

#### Connection Timeouts
```bash
# Check if MCP package is installed
npm list -g @modelcontextprotocol/server-github

# Install if missing
npm install -g @modelcontextprotocol/server-github
```

#### IP Server Connection Issues
```bash
# Test IP connectivity
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.example.com:443/health

# Check authentication
curl -H "X-API-Key: YOUR_API_KEY" http://127.0.0.1:8080/health
```

#### Swagger Generation Failures
```bash
# Install OpenAPI Generator globally
npm install -g @openapitools/openapi-generator-cli

# Test Swagger spec accessibility
curl https://petstore.swagger.io/v2/swagger.json

# Check generated files
ls -la ./tmp/swagger-generated/
```
```typescript
// Increase timeout in server configuration
{
  "config": {
    "package": "@modelcontextprotocol/server-github",
    "timeout": 60000  // 60 seconds
  }
}
```

#### Natural Language Parsing Issues
Ensure commands follow the structured format:
```
# NPX Server
register-mcp-server id:server-id name:"Server Name" type:npx command:package-name

# IP Server  
register-mcp-server id:server-id name:"Server Name" type:ip host:hostname port:443 protocol:https auth:jwt token:YOUR_TOKEN

# Swagger Server
register-mcp-server id:server-id name:"Server Name" type:swagger-npx swagger:https://api.example.com/swagger.json
```

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=mcp:* npm run dev
```

## 🚀 Advanced Features

### Parallel Task Execution
```json
{
  "id": "parallel-analysis",
  "name": "Parallel Data Analysis", 
  "parallel": true,
  "steps": [
    {"server": "api-server-1", "tool": "fetch_data", "parameters": {"source": "db1"}},
    {"server": "api-server-2", "tool": "fetch_data", "parameters": {"source": "db2"}},
    {"server": "api-server-3", "tool": "fetch_data", "parameters": {"source": "db3"}}
  ]
}
```

### Custom Error Handling
```typescript
try {
  const result = await executeMCPTask('complex-task', {
    retries: 3,
    timeout: 120000,
    fallback: 'alternative-task'
  });
} catch (error) {
  // Handle task execution failures
  console.error('Task execution failed:', error);
}
```

### Server Health Monitoring
```typescript
// Monitor server health
const healthStatus = await orchestrator.checkServerHealth('github-mcp');
console.log('Server health:', healthStatus);
```

### IP-based Server with Custom Authentication
```typescript
// Register server with custom authentication headers
const serverConfig = {
  id: 'custom-auth-server',
  name: 'Custom Auth API',
  type: 'ip',
  config: {
    host: 'api.example.com',
    port: 443,
    protocol: 'https',
    auth: {
      type: 'api-key',
      secretKey: process.env.CUSTOM_API_KEY,
      keyHeader: 'X-Custom-Auth'
    },
    tls: {
      enabled: true,
      rejectUnauthorized: true
    }
  }
};
```

### Swagger Server Auto-generation
```typescript
// Auto-generate MCP server from OpenAPI spec
const swaggerConfig = {
  id: 'auto-generated-api',
  name: 'Auto-generated API Server',
  type: 'swagger-npx',
  config: {
    swaggerSpec: 'https://api.github.com/swagger.json',
    swaggerOptions: {
      generateClient: true,
      clientName: 'typescript-node',
      outputDir: './tmp/github-api-mcp',
      packageName: 'mcp-github-api'
    }
  }
};
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-mcp-feature`
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation

---

**Built with ❤️ using Godspeed Framework and Model Context Protocol**
