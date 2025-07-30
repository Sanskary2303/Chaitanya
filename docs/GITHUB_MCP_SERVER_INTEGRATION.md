# GitHub MCP Server Integration Guide

This guide shows you how to connect your Enhanced MCP ChatBot to external GitHub MCP servers for more robust GitHub operations.

## 🚀 Quick Start

### 1. Set Up GitHub Token
```bash
export GITHUB_TOKEN=your_github_personal_access_token
```

### 2. Connect to Official GitHub MCP Server
```bash
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "connect",
    "serverType": "official"
  }'
```

### 3. Test GitHub Operations
```bash
curl -X POST http://localhost:3000/github-mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list my repositories"
  }'
```

## 📋 Available GitHub MCP Server Types

### 1. Official GitHub MCP Server
```bash
# Auto-installs and runs the official @modelcontextprotocol/server-github
{
  "serverType": "official"
}
```

### 2. Custom GitHub MCP Server
```bash
# For your own GitHub MCP server implementation
{
  "serverType": "custom"
}
```

### 3. Python GitHub MCP Server
```bash
# For Python-based GitHub MCP servers
{
  "serverType": "python"
}
```

## 🔧 Complete Setup Examples

### Connect to Official GitHub MCP Server
```bash
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "connect",
    "serverType": "official",
    "clientName": "github-main"
  }'
```

### List Available GitHub MCP Tools
```bash
curl -X GET http://localhost:3000/github-mcp-tools
```

### Execute GitHub Operations via Enhanced Chatbot
```bash
# Natural language GitHub operations
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "create a new repository called test-repo with description: My test repository",
    "enableExternalMCP": true
  }'

# Direct GitHub MCP operations
curl -X POST http://localhost:3000/github-mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get repository information for Sanskary2303/Chaitanya"
  }'

# Specific operation calls
curl -X POST http://localhost:3000/github-mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "operation": "github_list_repositories",
    "per_page": 10
  }'
```

## 🛠️ GitHub Operations Supported

### Repository Operations
- **List repositories**: `"list my repositories"`, `"show my repos"`
- **Create repository**: `"create repository called NAME"`
- **Get repository**: `"get repository INFO for USER/REPO"`
- **Delete repository**: `"delete repository USER/REPO"`

### File Operations  
- **Read file**: `"read file PATH in USER/REPO"`
- **Create file**: `"create file PATH with content CONTENT"`
- **Update file**: `"update file PATH in USER/REPO"`
- **Delete file**: `"delete file PATH from USER/REPO"`
- **List files**: `"list files in USER/REPO"`

### Issue Operations
- **List issues**: `"list issues in USER/REPO"`
- **Create issue**: `"create issue in USER/REPO with title TITLE"`
- **Get issue**: `"get issue #NUMBER from USER/REPO"`
- **Close issue**: `"close issue #NUMBER in USER/REPO"`

### Pull Request Operations
- **List PRs**: `"list pull requests in USER/REPO"`
- **Create PR**: `"create pull request in USER/REPO"`
- **Get PR**: `"get pull request #NUMBER from USER/REPO"`

### User Operations
- **User info**: `"get user info for USERNAME"`
- **Search users**: `"search users for QUERY"`

## 🔍 Advanced Usage

### Managing Multiple GitHub MCP Clients
```bash
# Connect multiple clients
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "connect",
    "serverType": "official",
    "clientName": "github-work"
  }'

curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "connect", 
    "serverType": "custom",
    "clientName": "github-personal"
  }'

# List all clients
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "list"
  }'

# Use specific client
curl -X POST http://localhost:3000/github-mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list repositories",
    "clientName": "github-work"
  }'
```

### Error Handling and Fallbacks
The system automatically falls back to internal GitHub API if external MCP servers fail:

```bash
# This will try external MCP first, then fall back to internal API
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list my repositories",
    "enableExternalMCP": true
  }'
```

## 🐛 Troubleshooting

### Check GitHub Token
```bash
# Verify your GitHub token is set
echo $GITHUB_TOKEN

# Test token validity
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Check MCP Client Status
```bash
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "list"
  }'
```

### Disconnect and Reconnect
```bash
# Disconnect all clients
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "disconnect"
  }'

# Reconnect
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "connect",
    "serverType": "official"
  }'
```

## 🏗️ Custom GitHub MCP Server Setup

If you want to use your own GitHub MCP server:

1. **Update server configuration** in `src/helper/github-mcp-client.ts`:
```typescript
custom: {
  name: 'github-mcp-custom',
  command: 'node',  // or 'python', etc.
  args: ['path/to/your/github-mcp-server.js'],
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  },
}
```

2. **Connect to your custom server**:
```bash
curl -X POST http://localhost:3000/github-mcp-client \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "connect",
    "serverType": "custom"
  }'
```

## 🎯 Benefits of External GitHub MCP Servers

1. **Standardized Interface**: Use official GitHub MCP protocol
2. **Better Error Handling**: Dedicated GitHub server implementation
3. **Enhanced Features**: Access to specialized GitHub operations
4. **Automatic Fallback**: Falls back to internal API if external fails
5. **Multiple Clients**: Connect to multiple GitHub MCP servers simultaneously
6. **Future-Proof**: Compatible with any GitHub MCP server implementation

Your Enhanced MCP ChatBot now supports both internal GitHub API integration and external GitHub MCP server connections for maximum flexibility and reliability! 🚀
