#!/bin/bash

# API Endpoint Testing Script
BASE_URL="http://localhost:3000"
WS_URL="ws://localhost:8000"

echo "=== API Endpoint Testing ==="
echo "Testing endpoints for RAG-Node application"
echo ""

# Test function to make HTTP requests
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "Testing: $description"
    echo "  Method: $method"
    echo "  Endpoint: $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        if [ -z "$data" ]; then
            response=$(curl -s -w "%{http_code}" -o /tmp/response.txt -X POST "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "%{http_code}" -o /tmp/response.txt -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        fi
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.txt -X DELETE "$BASE_URL$endpoint")
    fi
    
    status_code=$response
    response_body=$(cat /tmp/response.txt)
    
    echo "  Status Code: $status_code"
    if [ ${#response_body} -gt 500 ]; then
        echo "  Response: [Response too long, showing first 200 chars...]"
        echo "  $(echo "$response_body" | head -c 200)..."
    else
        echo "  Response: $response_body"
    fi
    echo ""
}

echo "1. Testing Authentication Endpoints"
echo "===================================="

# Test auth endpoints
test_endpoint "POST" "/auth/register" '{"username":"testuser","email":"test@example.com","password":"testpass123"}' "User Registration"
test_endpoint "POST" "/auth/login" '{"username":"testuser","password":"testpass123"}' "User Login"
test_endpoint "GET" "/auth/profile" "" "Get User Profile"

echo "2. Testing Document Management Endpoints"
echo "========================================"

# Test document metadata
test_endpoint "GET" "/meta/doc" "" "Get Document Metadata"

# Test document deletion (with dummy ID)
test_endpoint "DELETE" "/doc/dummy-id" "" "Delete Document"

echo "3. Testing Repository Management Endpoints"
echo "=========================================="

# Test repository metadata
test_endpoint "GET" "/meta/repo" "" "Get Repository Metadata"

echo "4. Testing System Prompt Endpoints"
echo "=================================="

# Test system prompt endpoints
test_endpoint "GET" "/system-prompt" "" "Get System Prompt"
test_endpoint "POST" "/system-prompt" '{"prompt":"Test system prompt"}' "Set System Prompt"

echo "5. Testing Chat Session Endpoints"
echo "================================="

# Test chat session endpoints
test_endpoint "GET" "/chat-sessions" "" "Get Chat Sessions"
test_endpoint "POST" "/chat-session" '{"name":"Test Session"}' "Create Chat Session"

echo "6. Testing GitHub MCP Endpoints"
echo "==============================="

# Test GitHub MCP endpoints
test_endpoint "GET" "/github-mcp-tools" "" "Get GitHub MCP Tools"
test_endpoint "POST" "/github-mcp" '{"query":"test query"}' "GitHub MCP Request"
test_endpoint "POST" "/github-mcp-client" '{"action":"test"}' "GitHub MCP Client"

echo "7. Testing Enhanced Chatbot Endpoint"
echo "===================================="

test_endpoint "POST" "/enhanced-chatbot" '{"message":"Hello, how are you?"}' "Enhanced Chatbot"

echo "8. Testing MCP Orchestration Endpoint"
echo "====================================="

test_endpoint "GET" "/test-mcp-orchestration" "" "Test MCP Orchestration"

echo "9. Testing Message Endpoint"
echo "==========================="

test_endpoint "POST" "/message" '{"content":"Test message","sessionId":"test-session"}' "Send Message"

echo "10. Testing File Upload Endpoint"
echo "================================"

# Create a test file for upload
echo "This is a test document for upload testing." > /tmp/test-doc.txt

# Test file upload
echo "Testing: File Upload"
echo "  Method: POST"
echo "  Endpoint: /upload_docs"
upload_response=$(curl -s -w "%{http_code}" -o /tmp/upload_response.txt -X POST -F "files=@/tmp/test-doc.txt" -F "metadata=[{\"description\":\"test document\"}]" "$BASE_URL/upload_docs")
echo "  Status Code: $upload_response"
echo "  Response: $(cat /tmp/upload_response.txt)"
echo ""

echo "11. Testing Frontend-Referenced Endpoints"
echo "========================================="

# Test endpoints that the frontend references but might not exist
test_endpoint "POST" "/prompt/update" '{"message":"Updated prompt"}' "Prompt Update (Frontend Referenced)"
test_endpoint "DELETE" "/github_links/dummy-id" "" "Delete GitHub Link (Frontend Referenced)"

echo "12. Testing Swagger Documentation"
echo "================================="

test_endpoint "GET" "/api-docs" "" "Swagger Documentation"

echo ""
echo "=== Testing Complete ==="

# Cleanup
rm -f /tmp/response.txt /tmp/upload_response.txt /tmp/test-doc.txt

echo ""
echo "Summary:"
echo "- Check the status codes and responses above"
echo "- 200-299: Success"
echo "- 400-499: Client errors (might need proper authentication or data)"
echo "- 500-599: Server errors (need to be fixed)"
echo "- Connection errors: Endpoint might not exist"
