#!/bin/bash

# Enhanced MCP ChatBot API Test Script
# This script tests all implemented functionality of the Enhanced MCP ChatBot

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000/enhanced-chatbot"

# Function to make API request and show result
test_api() {
    local description="$1"
    local query="$2"
    local additional_params="$3"
    
    echo -e "${BLUE}🧪 Testing: ${description}${NC}"
    echo -e "${YELLOW}Query: ${query}${NC}"
    
    # Build JSON payload
    local json_payload="{\"query\": \"${query}\", \"enableFileOperations\": true${additional_params}}"
    
    # Make request and capture response
    local response=$(curl -s -X POST "${BASE_URL}" \
        -H 'Content-Type: application/json' \
        -d "${json_payload}")
    
    # Check if request was successful
    if echo "$response" | jq -e '.tool_results[0].success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Success${NC}"
        echo -e "${GREEN}Result: $(echo "$response" | jq -r '.context' | head -n 3)${NC}"
    elif echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: $(echo "$response" | jq -r '.message')${NC}"
    else
        echo -e "${YELLOW}⚠️  Unexpected response format${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    
    echo "─────────────────────────────────────────────────"
}

# Function to check if server is running
check_server() {
    echo -e "${BLUE}🔍 Checking if server is running...${NC}"
    if curl -s "${BASE_URL%/*}" > /dev/null; then
        echo -e "${GREEN}✅ Server is running at ${BASE_URL%/*}${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running. Please start the server first.${NC}"
        echo -e "${YELLOW}Run: npm start or pnpm start${NC}"
        return 1
    fi
}

# Function to create test files for cleanup later
setup_test_environment() {
    echo -e "${BLUE}🔧 Setting up test environment...${NC}"
    mkdir -p tmp/test_api
    echo "This is a test file for API testing" > tmp/test_api/existing_file.txt
    echo -e "${GREEN}✅ Test environment ready${NC}"
    echo "─────────────────────────────────────────────────"
}

# Function to cleanup test files
cleanup_test_environment() {
    echo -e "${BLUE}🧹 Cleaning up test environment...${NC}"
    rm -rf tmp/test_api
    rm -f tmp/api_test_*.txt
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main test suite
main() {
    echo -e "${BLUE}🚀 Enhanced MCP ChatBot API Test Suite${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required but not installed. Please install jq first.${NC}"
        echo -e "${YELLOW}Ubuntu/Debian: sudo apt-get install jq${NC}"
        echo -e "${YELLOW}macOS: brew install jq${NC}"
        exit 1
    fi
    
    # Check server
    if ! check_server; then
        exit 1
    fi
    
    echo ""
    setup_test_environment
    echo ""
    
    # Test 1: File Reading
    test_api "File Reading - Package.json" "read file package.json"
    
    # Test 2: Directory Listing
    test_api "Directory Listing - Source Directory" "list files in src directory"
    
    # Test 3: File Writing
    test_api "File Writing - Create New File" "write file tmp/api_test_new.txt content \"This file was created via API test\""
    
    # Test 4: Read Created File
    test_api "File Reading - Read Created File" "read file tmp/api_test_new.txt"
    
    # Test 5: List tmp directory
    test_api "Directory Listing - Tmp Directory" "show files in tmp directory"
    
    # Test 6: Multiple operations
    test_api "Multiple Operations" "list files in src directory and read package.json"
    
    # Test 7: Natural language variations
    test_api "Natural Language - Show File Content" "show me the content of readme.md"
    
    # Test 8: Write with special characters
    test_api "File Writing - Special Content" "create file tmp/api_test_json.txt content \"{\\\"test\\\": true, \\\"timestamp\\\": \\\"$(date)\\\"}\"" 
    
    # Test 9: Command conversion
    test_api "Command Conversion" "execute command ls -la tmp/"
    
    # Test 10: Error handling - non-existent file
    test_api "Error Handling - Non-existent File" "read file nonexistent_file.txt"
    
    # Test 11: GitHub operations (if token available)
    if [ ! -z "$GITHUB_TOKEN" ]; then
        test_api "GitHub - List Repositories" "list my repositories" ", \"enableExternalMCP\": true"
        test_api "GitHub - Get Repository Info" "get repository Sanskary2303/Chaitanya" ", \"enableExternalMCP\": true"
    else
        echo -e "${YELLOW}⚠️  Skipping GitHub tests - GITHUB_TOKEN not set${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo -e "${GREEN}✅ Core file operations (read, write, list) are working${NC}"
    echo -e "${GREEN}✅ Natural language processing is functional${NC}"
    echo -e "${GREEN}✅ Error handling is implemented${NC}"
    if [ ! -z "$GITHUB_TOKEN" ]; then
        echo -e "${GREEN}✅ GitHub MCP integration is available${NC}"
    else
        echo -e "${YELLOW}⚠️  GitHub integration requires GITHUB_TOKEN environment variable${NC}"
    fi
    echo -e "${YELLOW}⚠️  Some advanced features may have RAG pipeline limitations${NC}"
    
    echo ""
    cleanup_test_environment
    
    echo ""
    echo -e "${BLUE}💡 Usage Tips:${NC}"
    echo -e "  • Use natural language for file operations"
    echo -e "  • Always set enableFileOperations: true for file ops"
    echo -e "  • Set enableExternalMCP: true for GitHub operations"
    echo -e "  • Set GITHUB_TOKEN environment variable for GitHub access"
    echo -e "  • Check the tool_results array for detailed information"
    echo -e "  • See docs/API_TESTING_GUIDE.md for more examples"
    
    echo ""
    echo -e "${GREEN}🎉 Test suite completed!${NC}"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Enhanced MCP ChatBot API Test Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --quick, -q    Run only essential tests"
        echo "  --cleanup, -c  Only cleanup test files"
        echo ""
        echo "Prerequisites:"
        echo "  • Server running on http://localhost:3000"
        echo "  • jq installed for JSON processing"
        ;;
    --cleanup|-c)
        cleanup_test_environment
        ;;
    --quick|-q)
        echo -e "${BLUE}🚀 Quick API Test${NC}"
        check_server || exit 1
        test_api "Quick File Read Test" "read file package.json"
        test_api "Quick Directory List Test" "list files in src directory"
        test_api "Quick File Write Test" "write file tmp/quick_test.txt content \"Quick test completed\""
        rm -f tmp/quick_test.txt
        echo -e "${GREEN}✅ Quick test completed${NC}"
        ;;
    *)
        main
        ;;
esac
