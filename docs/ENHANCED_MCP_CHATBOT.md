# Enhanced MCP ChatBot Usage Examples

This document provides examples of how to use the Enhanced MCP ChatBot with integrated local tools.

## Basic Usage

### Standard RAG Query
```json
{
  "query": "What is the purpose of this codebase?"
}
```

### Query with Mode Specification
```json
{
  "query": "Analyze the code structure",
  "mode": "analysis",
  "enableFileOperations": true
}
```

## File Operations Examples

### Reading Files
```json
{
  "query": "Read file src/functions/mcp_server.ts",
  "enableFileOperations": true
}
```

```json
{
  "query": "Show me the content of package.json",
  "enableFileOperations": true
}
```

### Writing Files
```json
{
  "query": "Write file test.txt with content 'Hello World'",
  "enableFileOperations": true
}
```

```json
{
  "query": "Create a file called notes.md with content 'Project notes go here'",
  "enableFileOperations": true
}
```

### Directory Listing
```json
{
  "query": "List files in the src directory",
  "enableFileOperations": true,
  "workingDirectory": "src"
}
```

```json
{
  "query": "Show directory contents of src/functions",
  "enableFileOperations": true
}
```

### File Information
```json
{
  "query": "Get file info for src/index.ts",
  "enableFileOperations": true
}
```

## Command Execution Examples

### Basic Commands
```json
{
  "query": "Run command 'ls -la'",
  "enableCommandExecution": true,
  "workingDirectory": "/home/sanskar/Chaitanya"
}
```

```json
{
  "query": "Execute 'npm --version'",
  "enableCommandExecution": true
}
```

### Git Commands
```json
{
  "query": "Run command 'git status'",
  "enableCommandExecution": true
}
```

```json
{
  "query": "Execute 'git log --oneline -5'",
  "enableCommandExecution": true
}
```

## Mode Switching Examples

### Switch to Development Mode
```json
{
  "query": "Switch mode to development",
  "enableFileOperations": true
}
```

### Switch to Debug Mode
```json
{
  "query": "Change mode to debug",
  "enableFileOperations": true
}
```

## External MCP Examples

### Call External MCP Server
```json
{
  "query": "Call MCP server external-api with tool get-data",
  "enableExternalMCP": true
}
```

## Complex Queries

### Multi-Tool Query
```json
{
  "query": "List files in src directory, then read the main index file, and show me the file info",
  "enableFileOperations": true,
  "mode": "analysis"
}
```

### Development Workflow
```json
{
  "query": "Switch to development mode, list files in src/functions, and read the mcp_server.ts file",
  "mode": "development",
  "enableFileOperations": true,
  "workingDirectory": "src"
}
```

### Security-Conscious Query
```json
{
  "query": "Read the package.json file but don't execute any commands",
  "enableFileOperations": true,
  "enableCommandExecution": false,
  "maxOutputLength": 5000
}
```

## Natural Language Examples

The chatbot can understand natural language queries for tool operations:

### File Operations
- "Can you show me what's in the config file?"
- "I need to create a new README file with some basic content"
- "List all TypeScript files in the functions directory"
- "What are the details of the main index file?"

### Command Execution
- "Check the current git branch"
- "Install the missing dependencies"
- "Run the test suite"
- "Check if the server is running"

### Mode Management
- "I want to switch to debugging mode"
- "Change the operating mode to analysis"
- "Set mode to development for coding tasks"

### Combined Operations
- "Switch to development mode, then show me all the function files"
- "Read the main config file and then list the available scripts"
- "Check the project status and show me recent changes"

## Response Examples

### Successful Tool Usage Response
```json
{
  "success": true,
  "code": 200,
  "message": "Query processed successfully",
  "data": {
    "context": "## Tool Execution Results\n\n### read-file\n✅ **Status**: Success\n**Content**: import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core'...",
    "source_files": "mcp_local_tools",
    "mode": "rag",
    "toolsUsed": ["read-file"],
    "tool_results": [
      {
        "tool": "read-file",
        "filePath": "src/functions/mcp_server.ts",
        "success": true,
        "content": "import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core'..."
      }
    ],
    "processed_with_tools": true,
    "timestamp": "2025-07-29T18:45:00.000Z"
  }
}
```

### Standard RAG Response
```json
{
  "success": true,
  "code": 200,
  "message": "Query processed successfully",
  "data": {
    "context": "This codebase appears to be a RAG (Retrieval-Augmented Generation) system...",
    "source_files": "document_chunks",
    "mode": "rag",
    "toolsUsed": [],
    "processed_with_tools": false,
    "timestamp": "2025-07-29T18:45:00.000Z"
  }
}
```

## Security Considerations

1. **File Operations**: Limited to project directory and subdirectories
2. **Command Execution**: Disabled by default, filtered for dangerous commands
3. **Path Traversal**: Prevented by security checks
4. **Output Limits**: Configurable maximum output length
5. **Timeouts**: Commands have execution timeouts

## Best Practices

1. **Enable tools selectively**: Only enable the tools you need for each query
2. **Use working directory**: Specify working directory for relative path operations  
3. **Limit output**: Set appropriate maxOutputLength for large files
4. **Security first**: Be cautious with enableCommandExecution in production
5. **Test queries**: Start with simple queries before complex multi-tool operations

## Integration with MCP Clients

This enhanced chatbot can be used by any MCP client that supports tool calling. The natural language interface makes it easy to request complex operations without needing to know the exact tool APIs.

### Example MCP Client Usage
```javascript
// Using the enhanced chatbot as an MCP tool
const result = await mcpClient.callTool('enhanced-chatbot', {
  query: "Show me the structure of the src directory and read the main config file",
  enableFileOperations: true,
  mode: "analysis"
});

console.log(result.data.context); // Formatted tool results
console.log(result.data.tool_results); // Raw tool outputs
```
