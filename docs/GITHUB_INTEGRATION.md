# GitHub MCP Integration Setup Guide

This guide explains how to set up and use GitHub integration with the Enhanced MCP ChatBot.

## 🔧 Prerequisites

### 1. GitHub Personal Access Token

You need a GitHub Personal Access Token (PAT) to access the GitHub API.

#### Creating a GitHub Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "Enhanced MCP ChatBot"
4. Select the following scopes:
   - `repo` - Full control of private repositories
   - `public_repo` - Access public repositories
   - `user` - Read user profile data
   - `read:org` - Read organization data (optional)

5. Click "Generate token"
6. **Important:** Copy the token immediately - you won't be able to see it again!

### 2. Environment Variable Setup

Set the GitHub token as an environment variable:

```bash
# Option 1: Set for current session
export GITHUB_TOKEN="your_github_token_here"

# Option 2: Add to your shell profile (persistent)
echo 'export GITHUB_TOKEN="your_github_token_here"' >> ~/.bashrc
source ~/.bashrc

# Option 3: Create a .env file (recommended for development)
echo 'GITHUB_TOKEN=your_github_token_here' >> .env
```

### 3. Restart the Server

After setting the environment variable, restart your server:

```bash
npm restart
# or
pnpm restart
```

## 🚀 Testing GitHub Integration

### Quick Test Commands

```bash
# Test 1: List your repositories
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list my repositories",
    "enableExternalMCP": true
  }'

# Test 2: Get repository info
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get repository YOUR_USERNAME/YOUR_REPO",
    "enableExternalMCP": true
  }'

# Test 3: Get user info
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "get user info",
    "enableExternalMCP": true
  }'
```

### Automated Testing

Run the test script with GitHub token:

```bash
# Set token and run tests
export GITHUB_TOKEN="your_token_here"
./test_api.sh
```

## 📋 Supported GitHub Operations

### Repository Management
- ✅ List repositories (yours or any user's)
- ✅ Get repository details
- ✅ Create new repositories
- ✅ Search repositories

### Issues
- ✅ List issues (open/closed/all)
- ✅ Create new issues
- ✅ Filter issues by state

### Pull Requests
- ✅ List pull requests (open/closed/all)
- ✅ Create pull requests
- ✅ Filter PRs by state

### Files & Content
- ✅ Get file contents from repositories
- ✅ Read any file from any accessible repository

### Branches & Commits
- ✅ List branches
- ✅ List commits
- ✅ Filter commits by branch
- ✅ Create branches

### User Information
- ✅ Get your own user info
- ✅ Get any public user's info

## 🔍 Natural Language Examples

The system understands various ways to express GitHub operations:

### Repository Operations
```
"list my repositories"
"show me my repos"
"list repositories for user octocat"
"get repository owner/repo-name"
"show me details of owner/repo repository"
"create repository test-repo private"
```

### Issues & PRs
```
"list issues in owner/repo"
"show me open issues in owner/repo"
"create issue title 'Bug report' body 'Found a bug' in owner/repo"
"list pull requests in owner/repo"
"show me open PRs in owner/repo"
```

### File Operations
```
"get file package.json from owner/repo"
"read README.md from owner/repo"
"show me the content of src/index.ts from owner/repo"
```

### Branches & Commits
```
"list branches in owner/repo"
"show me branches in owner/repo"
"list commits in owner/repo"
"get commits from branch main in owner/repo"
```

## ⚠️ Security & Best Practices

### Token Security
- **Never commit tokens to version control**
- Use environment variables or secure secret management
- Rotate tokens regularly
- Use minimal required permissions

### Rate Limiting
- GitHub API has rate limits (5000 requests/hour for authenticated users)
- The chatbot doesn't implement rate limiting - use responsibly
- Consider implementing caching for frequently accessed data

### Error Handling
- Invalid tokens return 401 Unauthorized
- Missing repositories return 404 Not Found
- Private repositories require appropriate permissions

## 🔧 Troubleshooting

### Common Issues

#### "GitHub token not configured"
```bash
# Solution: Set the environment variable
export GITHUB_TOKEN="your_token_here"
# Then restart the server
```

#### "404 Not Found"
- Repository doesn't exist
- Repository is private and token lacks access
- User doesn't exist
- Check spelling of owner/repo names

#### "401 Unauthorized"
- Invalid or expired token
- Token lacks required permissions
- Generate a new token with proper scopes

#### "403 Forbidden"
- Rate limit exceeded
- Token permissions insufficient
- Repository access denied

### Debug Mode

Enable debug mode for detailed error information:

```bash
curl -X POST http://localhost:3000/enhanced-chatbot \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "list my repositories",
    "enableExternalMCP": true,
    "debug": true
  }'
```

## 🔗 API Reference

### Request Format
```json
{
  "query": "natural language query here",
  "enableExternalMCP": true,
  "debug": false
}
```

### Response Format
```json
{
  "context": "## Tool Execution Results...",
  "tool_results": [
    {
      "tool": "github-mcp",
      "action": "list_repositories",
      "success": true,
      "result": { ... }
    }
  ],
  "processed_with_tools": true,
  "toolsUsed": ["github-mcp"],
  "timestamp": "2025-07-29T..."
}
```

## 📚 Additional Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Personal Access Tokens Guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)

---

*Last updated: July 29, 2025*
*For technical support, check the main project documentation*
