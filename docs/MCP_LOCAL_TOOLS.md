# MCP Local Tools Documentation

This document describes the local tools available through the Model Context Protocol (MCP) server implementation in RAG-Node.

## Overview

The MCP server provides reusable local tools that can be called by MCP clients to perform various operations safely within the project environment. All tools include security checks to prevent unauthorized access outside the project directory.

## Available Tools

### 1. Handle Query (`mcp.handle-query`)

**Purpose**: Process natural language queries using the RAG pipeline.

**Parameters**:
- `query` (string, required): The natural language question to process

**Example**:
```json
{
  "query": "What is Godspeed framework?"
}
```

**Returns**: Context and source files from the knowledge base.

---

### 2. Read File (`mcp.read-file`)

**Purpose**: Read the contents of a file within the project directory.

**Parameters**:
- `filePath` (string, required): Path to the file relative to project root
- `encoding` (string, optional): File encoding (default: utf8)

**Example**:
```json
{
  "filePath": "src/functions/mcp_server.ts",
  "encoding": "utf8"
}
```

**Security**: Prevents reading files outside the project directory.

---

### 3. Write File (`mcp.write-file`)

**Purpose**: Write content to a file within the project directory.

**Parameters**:
- `filePath` (string, required): Path to the file relative to project root
- `content` (string, required): Content to write to the file
- `encoding` (string, optional): File encoding (default: utf8)
- `createDirs` (boolean, optional): Create parent directories if they don't exist

**Example**:
```json
{
  "filePath": "docs/new-file.md",
  "content": "# New Documentation\n\nThis is new content.",
  "createDirs": true
}
```

**Security**: Prevents writing files outside the project directory.

---

### 4. Execute Command (`mcp.execute-command`)

**Purpose**: Execute shell commands with output capture and security restrictions.

**Parameters**:
- `command` (string, required): Shell command to execute
- `timeout` (number, optional): Command timeout in milliseconds (default: 30000)
- `cwd` (string, optional): Working directory for command execution
- `env` (object, optional): Environment variables for command execution

**Example**:
```json
{
  "command": "npm test",
  "timeout": 60000,
  "cwd": "."
}
```

**Security**: 
- Blocks dangerous commands (rm -rf, del /s, format, mkfs, dd if=, sudo)
- 10MB output buffer limit
- Configurable timeout

---

### 5. List Directory (`mcp.list-directory`)

**Purpose**: List files and directories within the project directory.

**Parameters**:
- `dirPath` (string, optional): Directory path to list (default: current directory)
- `includeHidden` (boolean, optional): Include hidden files and directories
- `recursive` (boolean, optional): List contents recursively

**Example**:
```json
{
  "dirPath": "src/functions",
  "includeHidden": false,
  "recursive": true
}
```

**Security**: Prevents listing directories outside the project directory.

---

### 6. Get File Info (`mcp.get-file-info`)

**Purpose**: Get detailed information about a file or directory.

**Parameters**:
- `filePath` (string, required): Path to the file or directory to inspect

**Example**:
```json
{
  "filePath": "package.json"
}
```

**Returns**: File size, permissions, timestamps, type, and other metadata.

**Security**: Prevents accessing files outside the project directory.

---

### 7. Switch Mode (`mcp.switch-mode`)

**Purpose**: Switch between different operation modes for the system.

**Parameters**:
- `mode` (string, required): Mode to switch to
  - `rag`: Retrieval-Augmented Generation mode
  - `chat`: Interactive chat mode
  - `analysis`: Code and data analysis mode
  - `development`: Development assistance mode
  - `debug`: Debug and troubleshooting mode
- `config` (object, optional): Additional configuration for the mode

**Example**:
```json
{
  "mode": "development",
  "config": {
    "language": "typescript",
    "framework": "godspeed"
  }
}
```

---

### 8. Call MCP (`mcp.call-mcp`)

**Purpose**: Make calls to external MCP servers (currently simulated).

**Parameters**:
- `server` (string, required): MCP server identifier or endpoint
- `tool` (string, required): Name of the tool to call on the MCP server
- `parameters` (object, optional): Parameters to pass to the MCP tool
- `timeout` (number, optional): Request timeout in milliseconds (default: 30000)

**Example**:
```json
{
  "server": "database-mcp",
  "tool": "query",
  "parameters": {
    "sql": "SELECT * FROM users LIMIT 10"
  }
}
```

**Note**: This is currently a simulation. Real MCP client implementation needed for actual external calls.

## Usage Examples

### Using with MCP Client

```javascript
// Example MCP client usage
const client = new MCPClient('stdio://path/to/rag-node');

// Read a file
const fileContent = await client.call('mcp.read-file', {
  filePath: 'src/index.ts'
});

// Execute a command
const result = await client.call('mcp.execute-command', {
  command: 'npm run build'
});

// Switch to development mode
await client.call('mcp.switch-mode', {
  mode: 'development',
  config: { debug: true }
});
```

### Using with Godspeed Events

These tools are automatically available as MCP tools when the server starts. They can be called by any MCP client that connects to the server.

## Security Features

1. **Path Traversal Protection**: All file operations are restricted to the project directory
2. **Command Filtering**: Dangerous commands are blocked
3. **Resource Limits**: Timeouts and buffer limits prevent resource exhaustion
4. **Input Validation**: All inputs are validated before processing

## Error Handling

All tools return standardized GSStatus responses:
- Success: `{ success: true, code: 200, data: ... }`
- Client Error: `{ success: false, code: 4xx, message: "Error description" }`
- Server Error: `{ success: false, code: 5xx, message: "Error description" }`

## Extension Points

The MCP tools system can be extended by:
1. Adding new function files in `src/functions/mcp_*.ts`
2. Creating corresponding event YAML files in `src/events/mcp_*.yaml`
3. Implementing additional security checks as needed
4. Adding new operation modes to the switch-mode tool

## Configuration

MCP server configuration is in `src/eventsources/mcp.yaml`:
```yaml
type: mcp
name: rag-node-mcp
version: 1.0.0
```

Each tool's configuration is in its respective event YAML file in `src/events/`.
