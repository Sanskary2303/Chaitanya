#!/usr/bin/env node

/**
 * Test GitHub MCP tools using the chatbot API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testMCPEndpoint(endpoint, data, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📡 Endpoint: ${endpoint}`);
  
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📋 Response:`, JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || 'Network Error'}`);
    console.log(`💬 Message: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(`📋 Error Details:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testGitHubMCPIntegration() {
  console.log('🚀 Testing GitHub MCP Integration via Chatbot API\n');
  console.log('='.repeat(60));

  // Test 1: Check GitHub MCP tools availability
  await testMCPEndpoint('/github-mcp-tools', {}, 'List available GitHub MCP tools');

  // Test 2: Enhanced MCP chatbot with GitHub query
  await testMCPEndpoint('/enhanced-chatbot', {
    query: "What GitHub operations can you perform?",
    userId: "test-user",
    config: {
      enableExternalMCP: true,
      enableFileOperations: true,
      enableCommandExecution: false,
      maxTokens: 1500
    }
  }, 'Enhanced chatbot - GitHub capabilities query');

  // Test 3: Enhanced MCP chatbot with repository query
  await testMCPEndpoint('/enhanced-chatbot', {
    query: "List my GitHub repositories",
    userId: "test-user", 
    config: {
      enableExternalMCP: true,
      enableFileOperations: true,
      maxTokens: 1500
    }
  }, 'Enhanced chatbot - List repositories');

  // Test 4: Enhanced MCP chatbot with user profile query
  await testMCPEndpoint('/enhanced-chatbot', {
    query: "Show me my GitHub profile information",
    userId: "test-user",
    config: {
      enableExternalMCP: true,
      maxTokens: 1500
    }
  }, 'Enhanced chatbot - GitHub profile');

  // Test 5: Test direct GitHub MCP call
  await testMCPEndpoint('/github-mcp', {
    action: "mcp_github_get_me",
    parameters: {}
  }, 'Direct GitHub MCP call - Get user profile');

  // Test 6: Test GitHub MCP client management
  await testMCPEndpoint('/github-mcp-client', {
    action: "connect",
    config: {
      serverType: "external",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"]
    }
  }, 'GitHub MCP client - Connect to external server');

  // Test 7: Test via MCP eventsource (if available)
  console.log('\n🔧 Testing MCP Event Source...');
  try {
    const mcpResponse = await axios.post(`${API_BASE}/mcp/call-mcp`, {
      server: "github",
      tool: "mcp_github_get_me", 
      parameters: {}
    });
    console.log('✅ MCP Event Source Response:', JSON.stringify(mcpResponse.data, null, 2));
  } catch (error) {
    console.log('❌ MCP Event Source Error:', error.response?.data || error.message);
  }

  // Test 8: Test file operations that might connect to GitHub
  await testMCPEndpoint('/enhanced-chatbot', {
    query: "Can you read files from my GitHub repositories?",
    userId: "test-user",
    config: {
      enableExternalMCP: true,
      enableFileOperations: true,
      maxTokens: 1500
    }
  }, 'Enhanced chatbot - GitHub file operations');
}

async function testWebSocketMCP() {
  console.log('\n🌐 Testing WebSocket MCP Integration...');
  
  try {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8000');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Send GitHub query via WebSocket
        ws.send(JSON.stringify({
          type: 'github-query',
          data: {
            query: "List my repositories",
            userId: "ws-test-user"
          }
        }));
      });

      ws.on('message', (data) => {
        console.log('📨 WebSocket Response:', data.toString());
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        console.log('❌ WebSocket Error:', error.message);
        clearTimeout(timeout);
        reject(error);
      });
    });
  } catch (error) {
    console.log('❌ WebSocket not available:', error.message);
  }
}

async function runTests() {
  // Check if server is running
  try {
    await axios.get(`${API_BASE}/api-docs`);
    console.log('✅ Server is running and accessible\n');
  } catch (error) {
    console.log('❌ Server not accessible. Make sure it\'s running on port 3000');
    process.exit(1);
  }

  await testGitHubMCPIntegration();
  
  try {
    await testWebSocketMCP();
  } catch (error) {
    console.log('⚠️ WebSocket test failed:', error.message);
  }

  console.log('\n🎉 Testing completed!');
  console.log('\n📝 Notes:');
  console.log('• If GitHub operations fail, check your GITHUB_TOKEN in .env');
  console.log('• Some features may require external MCP server installation');
  console.log('• Check the server logs for detailed error information');
}

runTests().catch(console.error);
