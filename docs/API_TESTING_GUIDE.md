# Enhanced MCP ChatBot API Testing Guide

This guide provides comprehensive examples for testing all implemented functionality of the Enhanced MCP ChatBot API.

## Base URL
```
http://localhost:3000
```

## Main Endpoint
```
POST /enhanced-chatbot
Content-Type: application/json
```

---

## 📁 File Operations

### 1. ## 🔧 Advanced Features

### 15. Multiple Operations in One Queryd File
**Description:** Read the contents of any file using natural language.

```bash
# Read package.json
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read file package.json",
    "enableFileOperations": true
  }'

# Read README file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "show me the content of readme.md",
    "enableFileOperations": true
  }'

# Read TypeScript configuration
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "display file tsconfig.json",
    "enableFileOperations": true
  }'
```

### 2. Write/Create Files
**Description:** Create new files or update existing ones with specified content.

```bash
# Create a simple text file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "write file tmp/test.txt content \"Hello World!\"",
    "enableFileOperations": true
  }'

# Create a JSON configuration file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "create file tmp/config.json content \"{\\\"debug\\\": true, \\\"port\\\": 3000}\"",
    "enableFileOperations": true
  }'

# Create a markdown file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "write file tmp/notes.md content \"# Test Notes\\n\\nThis is a test file created via API.\"",
    "enableFileOperations": true
  }'

# Update an existing file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "update file tmp/test.txt content \"Updated content with timestamp: $(date)\"",
    "enableFileOperations": true
  }'
```

---

## 📂 Directory Operations

### 3. List Directory Contents
**Description:** List files and directories in any folder using natural language.

```bash
# List files in src directory
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list files in src directory",
    "enableFileOperations": true
  }'

# List files in the root project directory
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "show me files in the current directory",
    "enableFileOperations": true
  }'

# List contents of specific subdirectory
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list files in src/functions folder",
    "enableFileOperations": true
  }'

# List temporary files
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "show files in tmp directory",
    "enableFileOperations": true
  }'
```

---

## � GitHub Operations

### 8. Repository Management
**Description:** Manage GitHub repositories through natural language.

```bash
# List your repositories
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list my repositories",
    "enableExternalMCP": true
  }'

# Get specific repository information
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get repository Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# Create a new repository
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "create repository test-repo private",
    "enableExternalMCP": true
  }'

# List another user'\''s repositories
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list repositories user: octocat",
    "enableExternalMCP": true
  }'
```

### 9. Issues Management
**Description:** Create and manage GitHub issues.

```bash
# List issues in a repository
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list issues in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# List only open issues
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list open issues in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# Create a new issue
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "create issue title \"API Enhancement\" body \"Need to add GitHub integration\" in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'
```

### 10. Pull Requests
**Description:** Manage GitHub pull requests.

```bash
# List pull requests
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list pull requests in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# List open pull requests
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list open pull requests in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# Create a pull request
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "create pull request title \"Add GitHub MCP\" from feature-branch to main in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'
```

### 11. File Operations from GitHub
**Description:** Read files directly from GitHub repositories.

```bash
# Get file contents from GitHub
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get file package.json from Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# Read README from a repository
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get file README.md from Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'
```

### 12. Branch and Commit Operations
**Description:** Work with branches and commits.

```bash
# List branches
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list branches in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# List commits
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list commits in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

# List commits from specific branch
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list commits from branch main in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'
```

### 13. User Information
**Description:** Get GitHub user information.

```bash
# Get your own user info
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get user info",
    "enableExternalMCP": true
  }'

# Get another user'\''s info
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get user info for octocat",
    "enableExternalMCP": true
  }'
```

### 14. Search Operations
**Description:** Search GitHub repositories.

```bash
# Search repositories
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "search repositories for \"machine learning\"",
    "enableExternalMCP": true
  }'

# Search for specific language
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "search repositories for \"typescript node.js\"",
    "enableExternalMCP": true
  }'
```

---

## �🔧 Advanced Features

### 4. Multiple Operations in One Query
**Description:** Perform multiple file operations in a single request.

```bash
# Read multiple files
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read package.json and also show me tsconfig.json",
    "enableFileOperations": true
  }'

# List directory and read a specific file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list files in src directory and read src/index.ts",
    "enableFileOperations": true
  }'
```

### 16. Command Execution (Intelligent Conversion)
**Description:** Commands are intelligently converted to appropriate file operations.

```bash
# Execute ls command (converts to directory listing)
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "execute command ls -la",
    "enableFileOperations": true
  }'

# Cat command (converts to file reading)
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "execute cat package.json",
    "enableFileOperations": true
  }'
```

---

## 🎛️ Configuration Options

### 17. Request Parameters
**Description:** Available configuration options for requests.

```bash
# With debug mode enabled
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read file package.json",
    "enableFileOperations": true,
    "debug": true
  }'

# With custom working directory
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list files in current directory",
    "enableFileOperations": true,
    "workingDirectory": "/home/sanskar/Chaitanya/src"
  }'

# With maximum output length limit
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read file readme.md",
    "enableFileOperations": true,
    "maxOutputLength": 1000
  }'

# Disable file operations for safety
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "what is this project about?",
    "enableFileOperations": false
  }'
```

---

## 📋 Test Scenarios

### 18. Complete Workflow Tests
**Description:** End-to-end testing scenarios.

```bash
# Workflow 1: Create, Write, Read, List
echo "=== Creating a test file ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "create file tmp/workflow_test.txt content \"Step 1: File created successfully\"",
    "enableFileOperations": true
  }'

echo -e "\n=== Reading the created file ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read file tmp/workflow_test.txt",
    "enableFileOperations": true
  }'

echo -e "\n=== Listing tmp directory ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list files in tmp directory",
    "enableFileOperations": true
  }'

# Workflow 2: Project exploration
echo -e "\n=== Exploring project structure ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "show me the project structure by listing the main directory",
    "enableFileOperations": true
  }'

echo -e "\n=== Reading project configuration ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read the package.json to understand project dependencies",
    "enableFileOperations": true
  }'

# Workflow 3: GitHub repository exploration
echo -e "\n=== GitHub Repository Analysis ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get repository Sanskary2303/Chaitanya information",
    "enableExternalMCP": true
  }'

echo -e "\n=== List repository issues ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list open issues in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'

echo -e "\n=== List repository branches ==="
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list branches in Sanskary2303/Chaitanya",
    "enableExternalMCP": true
  }'
```

### 19. Error Handling Tests
**Description:** Test various error conditions and edge cases.

```bash
# Test reading non-existent file
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read file nonexistent.txt",
    "enableFileOperations": true
  }'

# Test listing non-existent directory
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list files in nonexistent_directory",
    "enableFileOperations": true
  }'

# Test with invalid JSON
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "read file package.json",
    "enableFileOperations": true,
    "invalidField": 
  }'

# Test with empty query
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "",
    "enableFileOperations": true
  }'
```

---

## 🔍 Natural Language Variations

### 20. Different Ways to Ask for the Same Thing
**Description:** The chatbot understands various natural language patterns.

```bash
# File Reading Variations
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "read file package.json", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "show me package.json", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "display the contents of package.json", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "what is in package.json file?", "enableFileOperations": true}'

# Directory Listing Variations
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "list files in src", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "show me what is in src directory", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "list contents of src folder", "enableFileOperations": true}'

# File Writing Variations
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "write file tmp/test.txt content \"hello\"", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "create file tmp/test2.txt with content \"world\"", "enableFileOperations": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "save content \"test data\" to file tmp/test3.txt", "enableFileOperations": true}'

# GitHub Operations Variations
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "list my repositories", "enableExternalMCP": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "show me my repos", "enableExternalMCP": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "get repository information for owner/repo", "enableExternalMCP": true}'

curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "show me details of owner/repo repository", "enableExternalMCP": true}'
```

---

## 📊 Response Format

### Expected Response Structure
```json
{
  "context": "## Tool Execution Results\n\n### tool-name\n✅ **Status**: Success\n**Content**: file content here...\n\n",
  "source_files": "mcp_local_tools",
  "tool_results": [
    {
      "tool": "read-file",
      "filePath": "package.json",
      "success": true,
      "content": "actual file content..."
    }
  ],
  "processed_with_tools": true,
  "mode": "rag",
  "toolsUsed": ["read-file"],
  "timestamp": "2025-07-29T13:39:15.362Z"
}
```

---

## 🛠️ Troubleshooting

### Common Issues and Solutions

1. **File not found errors**: Ensure the file path is correct and the file exists
2. **Permission errors**: Check file permissions for read/write operations
3. **RAG pipeline errors**: Some queries may trigger RAG search issues - try rephrasing with specific file operation keywords
4. **Empty responses**: Ensure `enableFileOperations` is set to `true`

### Debugging Tips

- Use `"debug": true` in requests for more detailed information
- Check the `tool_results` array in responses for specific operation details
- Monitor server logs for additional error information

---

## 📝 Quick Reference Commands

```bash
# Read a file
curl -X POST localhost:3000/enhanced-chatbot -H 'Content-Type: application/json' -d '{"query": "read file FILENAME", "enableFileOperations": true}'

# Write a file
curl -X POST localhost:3000/enhanced-chatbot -H 'Content-Type: application/json' -d '{"query": "write file FILENAME content \"CONTENT\"", "enableFileOperations": true}'

# List directory
curl -X POST localhost:3000/enhanced-chatbot -H 'Content-Type: application/json' -d '{"query": "list files in DIRECTORY", "enableFileOperations": true}'
```

Replace `FILENAME`, `CONTENT`, and `DIRECTORY` with your desired values.

---

*Last updated: July 29, 2025*
*Server must be running on http://localhost:3000 for these tests to work*
