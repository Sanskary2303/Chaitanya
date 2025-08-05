# MCP Orchestration Configuration

This file contains configuration examples for MCP server registration and task orchestration.

## Server Configurations

### GitHub MCP Server (NPX)
```json
{
  "id": "github-mcp",
  "name": "GitHub MCP Server",
  "type": "npx",
  "config": {
    "package": "@modelcontextprotocol/server-github",
    "args": [],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"
    }
  },
  "capabilities": ["repositories", "issues", "pull_requests", "commits"],
  "timeout": 30000
}
```

### File System MCP Server (NPX)
```json
{
  "id": "filesystem-mcp",
  "name": "File System MCP Server",
  "type": "npx",
  "config": {
    "package": "@modelcontextprotocol/server-filesystem",
    "args": ["/home/sanskar/Chaitanya"]
  },
  "capabilities": ["read_file", "write_file", "list_directory", "create_directory"],
  "timeout": 30000
}
```

### Memory MCP Server (NPX)
```json
{
  "id": "memory-mcp",
  "name": "Memory MCP Server",
  "type": "npx",
  "config": {
    "package": "@modelcontextprotocol/server-memory",
    "args": []
  },
  "capabilities": ["store", "retrieve", "search"],
  "timeout": 30000
}
```

### Remote MCP Server
```json
{
  "id": "remote-api",
  "name": "Remote API MCP Server",
  "type": "remote",
  "config": {
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer your_token_here",
      "Content-Type": "application/json"
    }
  },
  "capabilities": ["custom_tools"],
  "timeout": 30000
}
```

### Local MCP Server
```json
{
  "id": "local-server",
  "name": "Local MCP Server",
  "type": "local",
  "config": {
    "command": "python ./custom_mcp_server.py",
    "cwd": "/path/to/server",
    "env": {
      "CUSTOM_CONFIG": "value"
    }
  },
  "capabilities": ["custom_local_tools"],
  "timeout": 30000
}
```

## Task Configurations

### Simple File Analysis Task
```json
{
  "id": "file-analysis",
  "name": "Simple File Analysis",
  "description": "Read and analyze project files",
  "servers": ["filesystem-mcp"],
  "parallel": false,
  "steps": [
    {
      "id": "read-package",
      "serverId": "filesystem-mcp",
      "tool": "read_file",
      "parameters": {
        "path": "./package.json"
      }
    },
    {
      "id": "list-src",
      "serverId": "filesystem-mcp",
      "tool": "list_directory",
      "parameters": {
        "path": "./src"
      }
    }
  ],
  "timeout": 60000
}
```

### Multi-Server Project Analysis
```json
{
  "id": "comprehensive-analysis",
  "name": "Comprehensive Project Analysis",
  "description": "Analyze project files, check GitHub status, and store results",
  "servers": ["filesystem-mcp", "github-mcp", "memory-mcp"],
  "parallel": false,
  "steps": [
    {
      "id": "list-project-files",
      "serverId": "filesystem-mcp",
      "tool": "list_directory",
      "parameters": {
        "path": "."
      }
    },
    {
      "id": "read-package-json",
      "serverId": "filesystem-mcp",
      "tool": "read_file",
      "parameters": {
        "path": "./package.json"
      }
    },
    {
      "id": "get-github-repos",
      "serverId": "github-mcp",
      "tool": "list_repositories",
      "parameters": {}
    },
    {
      "id": "store-analysis",
      "serverId": "memory-mcp",
      "tool": "store",
      "parameters": {
        "key": "project-analysis",
        "value": {
          "timestamp": "{{timestamp}}",
          "analysis": "Combined project and GitHub analysis"
        }
      }
    }
  ],
  "timeout": 120000
}
```

### Parallel Processing Task
```json
{
  "id": "parallel-github-analysis",
  "name": "Parallel GitHub Analysis",
  "description": "Fetch multiple GitHub resources in parallel",
  "servers": ["github-mcp"],
  "parallel": true,
  "steps": [
    {
      "id": "get-repositories",
      "serverId": "github-mcp",
      "tool": "list_repositories",
      "parameters": {}
    },
    {
      "id": "get-issues",
      "serverId": "github-mcp",
      "tool": "list_issues",
      "parameters": {
        "state": "open"
      }
    },
    {
      "id": "get-pull-requests",
      "serverId": "github-mcp",
      "tool": "list_pull_requests",
      "parameters": {
        "state": "open"
      }
    }
  ],
  "timeout": 90000
}
```

### Conditional Execution Task
```json
{
  "id": "conditional-workflow",
  "name": "Conditional Workflow",
  "description": "Execute different steps based on conditions",
  "servers": ["filesystem-mcp", "github-mcp", "memory-mcp"],
  "parallel": false,
  "steps": [
    {
      "id": "check-package",
      "serverId": "filesystem-mcp",
      "tool": "read_file",
      "parameters": {
        "path": "./package.json"
      },
      "onSuccess": [
        {
          "id": "analyze-dependencies",
          "serverId": "memory-mcp",
          "tool": "store",
          "parameters": {
            "key": "package-analysis",
            "value": "Package.json found and analyzed"
          }
        }
      ],
      "onError": [
        {
          "id": "create-package",
          "serverId": "filesystem-mcp",
          "tool": "write_file",
          "parameters": {
            "path": "./package.json",
            "content": "{\"name\": \"new-project\", \"version\": \"1.0.0\"}"
          }
        }
      ]
    }
  ],
  "timeout": 60000
}
```

## Usage Examples

### Natural Language Commands

1. **Register a server:**
   - "register server github-mcp type npx package @modelcontextprotocol/server-github"
   - "add server filesystem-mcp type npx package @modelcontextprotocol/server-filesystem"

2. **Register a task:**
   - "register task file-analysis servers [filesystem-mcp]"
   - "create task comprehensive-analysis servers [filesystem-mcp, github-mcp, memory-mcp] parallel"

3. **Execute a task:**
   - "execute task file-analysis"
   - "run task comprehensive-analysis parameters {\"timestamp\": \"2025-08-05\"}"

4. **List resources:**
   - "list mcp servers"
   - "show mcp tasks"

5. **Direct MCP calls:**
   - "call mcp server github-mcp tool list_repositories"
   - "mcp server filesystem-mcp tool read_file path ./README.md"

## Installation Commands

To install the official MCP servers:

```bash
# GitHub MCP Server
npm install -g @modelcontextprotocol/server-github

# File System MCP Server
npm install -g @modelcontextprotocol/server-filesystem

# Memory MCP Server
npm install -g @modelcontextprotocol/server-memory

# SQLite MCP Server
npm install -g @modelcontextprotocol/server-sqlite
```

## Environment Variables

Set these environment variables for full functionality:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="your_github_token"
export GITHUB_TOKEN="your_github_token"  # Alternative
```
