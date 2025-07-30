# Enhanced MCP ChatBot API Testing

This directory contains comprehensive testing resources for the Enhanced MCP ChatBot API, which provides natural language access to file operations and other MCP tools.

## 📋 Available Testing Resources

### 1. 📖 Complete API Documentation
**File:** `API_TESTING_GUIDE.md`
- Comprehensive guide with all API endpoints
- Detailed examples for every feature
- Natural language variations
- Error handling examples
- Response format documentation

### 2. 🚀 Automated Test Script
**File:** `../test_api.sh`
- Executable bash script for automated testing
- Tests all major functionality
- Colored output for easy reading
- Quick test mode available
- Automatic cleanup

**Usage:**
```bash
# Run full test suite
./test_api.sh

# Run quick tests only
./test_api.sh --quick

# Show help
./test_api.sh --help

# Cleanup test files
./test_api.sh --cleanup
```

### 3. 📮 Postman/Insomnia Collection
**File:** `Enhanced_MCP_ChatBot_API.postman_collection.json`
- Ready-to-import collection for API testing tools
- Organized by functionality categories
- Pre-configured requests with examples
- Variable support for base URL

**Import Instructions:**
1. Open Postman or Insomnia
2. Import the JSON collection file
3. Set the `baseUrl` variable to `http://localhost:3000`
4. Start testing!

## 🔧 Prerequisites

Before testing, ensure:

1. **Server is running:**
   ```bash
   npm start
   # or
   pnpm start
   ```

2. **Server is accessible at:** `http://localhost:3000`

3. **For GitHub operations (optional):**
   ```bash
   # Set your GitHub Personal Access Token
   export GITHUB_TOKEN="your_github_token_here"
   ```
   See `GITHUB_INTEGRATION.md` for detailed setup instructions.

4. **For bash script testing:**
   - `jq` is installed for JSON processing
   - `curl` is available (usually pre-installed)

## ✅ Implemented Functionality

### Core File Operations
- ✅ **Read Files** - Read any file using natural language
- ✅ **Write Files** - Create/update files with specified content
- ✅ **List Directories** - Browse directory contents
- ✅ **Smart Path Detection** - Automatic file/directory path extraction

### GitHub Operations (NEW!)
- ✅ **Repository Management** - List, get, create repositories
- ✅ **Issues Management** - List, create issues
- ✅ **Pull Requests** - List, create PRs
- ✅ **File Operations** - Read files directly from GitHub repos
- ✅ **Branch & Commit Operations** - List branches, commits
- ✅ **User Information** - Get GitHub user details
- ✅ **Search** - Search repositories

### Advanced Features
- ✅ **Natural Language Processing** - Multiple ways to express the same request
- ✅ **Command Conversion** - Shell commands converted to appropriate operations
- ✅ **Multi-operation Queries** - Multiple file operations in one request
- ✅ **Error Handling** - Graceful handling of invalid requests
- ✅ **Configurable Options** - Debug mode, output limits, working directory

## 🎯 Quick Test Examples

### Read a file:
```bash
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "read file package.json", "enableFileOperations": true}'
```

### List directory:
```bash
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "list files in src directory", "enableFileOperations": true}'
```

### Create a file:
```bash
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "write file tmp/test.txt content \"Hello World\"", "enableFileOperations": true}'
```

### GitHub operations:
```bash
# Set your GitHub token first
export GITHUB_TOKEN="your_github_token_here"

# List repositories
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "list my repositories", "enableExternalMCP": true}'

# Get repository info
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query": "get repository owner/repo-name", "enableExternalMCP": true}'
```

## 📊 Expected Response Format

All successful responses include:
```json
{
  "context": "## Tool Execution Results...",
  "source_files": "mcp_local_tools",
  "tool_results": [...],
  "processed_with_tools": true,
  "mode": "rag",
  "toolsUsed": ["tool-name"],
  "timestamp": "2025-07-29T13:39:15.362Z"
}
```

## 🔍 Troubleshooting

### Common Issues:
1. **Server not running** - Start with `npm start` or `pnpm start`
2. **Permission errors** - Check file/directory permissions
3. **RAG pipeline errors** - Some queries may need rephrasing with file operation keywords
4. **Empty responses** - Ensure `enableFileOperations: true` is set

### Getting Help:
- Check server logs for detailed error information
- Use `"debug": true` in requests for verbose output
- Review the API_TESTING_GUIDE.md for more examples

## 📁 File Structure

```
docs/
├── API_TESTING_GUIDE.md                           # Complete documentation
├── Enhanced_MCP_ChatBot_API.postman_collection.json  # Postman collection
├── GITHUB_INTEGRATION.md                          # GitHub setup guide
└── README_TESTING.md                              # This file

../test_api.sh                                     # Automated test script
```

## 🚀 Getting Started

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Choose your testing method:**
   - **Quick automated test:** `./test_api.sh --quick`
   - **Full test suite:** `./test_api.sh`
   - **Manual testing:** Use curl commands from `API_TESTING_GUIDE.md`
   - **GUI testing:** Import Postman collection

3. **Verify core functionality:**
   - File reading works
   - Directory listing works  
   - File writing works
   - Natural language processing works

---

*Last updated: July 29, 2025*
*For technical support, check the main project documentation*
