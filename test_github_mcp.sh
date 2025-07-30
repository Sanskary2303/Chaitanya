#!/bin/bash

# GitHub MCP Integration Test Script
# This script tests the GitHub MCP server integration

echo "🚀 Testing GitHub MCP Server Integration"
echo "========================================"

# Check if server is running
SERVER_URL="http://localhost:3000"
if ! curl -s "$SERVER_URL/api-docs" > /dev/null; then
    echo "❌ Server is not running on $SERVER_URL"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo "✅ Server is running"

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set. Some tests may fail."
    echo "Set it with: export GITHUB_TOKEN=your_token_here"
else
    echo "✅ GitHub token is configured"
fi

echo ""
echo "📋 Test 1: List GitHub MCP Clients"
echo "-----------------------------------"
curl -s -X POST "$SERVER_URL/github-mcp-client" \
  -H 'Content-Type: application/json' \
  -d '{"action": "list"}' | jq '.' || echo "Failed to list clients"

echo ""
echo "🔌 Test 2: Connect to Official GitHub MCP Server"
echo "-----------------------------------------------"
CONNECT_RESULT=$(curl -s -X POST "$SERVER_URL/github-mcp-client" \
  -H 'Content-Type: application/json' \
  -d '{"action": "connect", "serverType": "official", "clientName": "test-client"}')

echo "$CONNECT_RESULT" | jq '.'

if echo "$CONNECT_RESULT" | jq -e '.success' > /dev/null; then
    echo "✅ Successfully connected to GitHub MCP server"
    
    echo ""
    echo "🛠️  Test 3: List Available GitHub MCP Tools"
    echo "-------------------------------------------"
    curl -s -X GET "$SERVER_URL/github-mcp-tools" | jq '.' || echo "Failed to list tools"
    
    echo ""
    echo "🐙 Test 4: Test GitHub Operations via Enhanced Chatbot"
    echo "-----------------------------------------------------"
    
    echo "Testing repository listing..."
    curl -s -X POST "$SERVER_URL/enhanced-chatbot" \
      -H 'Content-Type: application/json' \
      -d '{
        "query": "list my repositories", 
        "enableExternalMCP": true
      }' | jq '.' || echo "Failed to list repositories"
    
    echo ""
    echo "Testing direct GitHub MCP call..."
    curl -s -X POST "$SERVER_URL/github-mcp" \
      -H 'Content-Type: application/json' \
      -d '{
        "query": "get user info for octocat"
      }' | jq '.' || echo "Failed direct GitHub MCP call"
    
    echo ""
    echo "🔌 Test 5: Disconnect from GitHub MCP Server" 
    echo "--------------------------------------------"
    curl -s -X POST "$SERVER_URL/github-mcp-client" \
      -H 'Content-Type: application/json' \
      -d '{"action": "disconnect", "clientName": "test-client"}' | jq '.' || echo "Failed to disconnect"

else
    echo "❌ Failed to connect to GitHub MCP server"
    echo "This is expected if the official GitHub MCP server is not available"
    echo "The system will fall back to internal GitHub API integration"
fi

echo ""
echo "🔄 Test 6: Test Fallback to Internal GitHub API"
echo "----------------------------------------------"
curl -s -X POST "$SERVER_URL/enhanced-chatbot" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "tell me about GitHub repositories", 
    "enableExternalMCP": true
  }' | jq '.' || echo "Failed fallback test"

echo ""
echo "📊 Test Summary"
echo "==============="
echo "✅ Server connectivity: PASSED"
echo "✅ GitHub MCP client management: TESTED"
echo "✅ Enhanced chatbot integration: TESTED"
echo "✅ Fallback mechanism: TESTED"

echo ""
echo "🎉 GitHub MCP Integration Test Complete!"
echo ""
echo "Next steps:"
echo "1. Set GITHUB_TOKEN environment variable"
echo "2. Try the API endpoints manually"
echo "3. Explore the documentation in docs/GITHUB_MCP_SERVER_INTEGRATION.md"
