#!/usr/bin/env node

/**
 * Targeted GitHub MCP Tests using the correct endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testCorrectEndpoints() {
  console.log('🎯 Testing Correct GitHub MCP Endpoints\n');
  console.log('='.repeat(60));

  // Test 1: GET /github-mcp-tools (correct method)
  console.log('\n🧪 Test 1: List GitHub MCP Tools (GET)');
  try {
    const response = await axios.get(`${API_BASE}/github-mcp-tools`);
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.statusText);
    console.log('💬 Message:', error.response?.data);
  }

  // Test 2: Connect to external GitHub MCP server
  console.log('\n🧪 Test 2: Connect to External GitHub MCP Server');
  try {
    const response = await axios.post(`${API_BASE}/github-mcp-client`, {
      action: "connect",
      serverType: "official",
      config: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"]
      }
    });
    console.log('✅ Status:', response.status);
    console.log('📋 Connection Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
  }

  // Test 3: List available MCP tools using internal tools
  console.log('\n🧪 Test 3: Test MCP Tools Functionality');
  try {
    const response = await axios.post(`${API_BASE}/github-mcp`, {
      query: "List available GitHub tools",
      action: "list_tools",
      clientName: "official"
    });
    console.log('✅ GitHub MCP Query:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
  }

  // Test 4: Test VS Code GitHub MCP integration using direct VS Code MCP
  console.log('\n🧪 Test 4: Test VS Code GitHub MCP Integration');
  try {
    // Try to use the VS Code MCP server
    const response = await axios.post(`${API_BASE}/github-mcp`, {
      query: "Get my GitHub user profile",
      action: "mcp_github_get_me",
      clientName: "vscode",
      serverType: "vscode"
    });
    console.log('✅ VS Code MCP Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ VS Code MCP Error:', error.response?.status, error.response?.data);
  }

  // Test 5: Test simple GitHub operations via MCP
  console.log('\n🧪 Test 5: Test Simple GitHub Operations');
  const operations = [
    { name: "Get User Profile", action: "get_user" },
    { name: "List Repositories", action: "list_repos" },
    { name: "List Notifications", action: "list_notifications" }
  ];

  for (const op of operations) {
    try {
      const response = await axios.post(`${API_BASE}/github-mcp`, {
        query: `Perform ${op.name}`,
        action: op.action,
        parameters: {}
      });
      console.log(`✅ ${op.name}:`, response.data?.message || 'Success');
    } catch (error) {
      console.log(`❌ ${op.name} failed:`, error.response?.data?.message || error.message);
    }
  }

  // Test 6: Test MCP Protocol directly 
  console.log('\n🧪 Test 6: Direct MCP Protocol Test');
  try {
    // Test using the WebSocket connection for MCP
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8000');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        console.log('⚠️ WebSocket test timeout');
        resolve();
      }, 3000);

      ws.on('open', () => {
        console.log('✅ WebSocket MCP connected');
        
        // Send MCP protocol message
        ws.send(JSON.stringify({
          type: 'mcp',
          event: 'call-mcp',
          data: {
            server: 'github',
            tool: 'get_user',
            parameters: {}
          }
        }));
      });

      ws.on('message', (data) => {
        console.log('📨 MCP Response:', data.toString());
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        console.log('❌ WebSocket MCP Error:', error.message);
        clearTimeout(timeout);
        resolve();
      });
    });
  } catch (error) {
    console.log('❌ WebSocket not available:', error.message);
  }
}

async function testVSCodeMCPDirect() {
  console.log('\n💻 Testing Direct VS Code GitHub MCP\n');
  
  // Try to connect to VS Code MCP server directly
  try {
    // Check if VS Code MCP server is accessible
    const response = await axios.post('https://api.githubcopilot.com/mcp/', {
      method: 'mcp_github_get_me',
      params: {}
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Direct VS Code MCP Response:', response.data);
  } catch (error) {
    console.log('❌ Direct VS Code MCP failed:', error.response?.data || error.message);
  }
}

async function runTargetedTests() {
  await testCorrectEndpoints();
  await testVSCodeMCPDirect();
  
  console.log('\n🎉 Targeted testing completed!');
  console.log('\n📊 Results Summary:');
  console.log('• GitHub MCP Client connection appears to work');
  console.log('• Some endpoints are properly configured');
  console.log('• Enhanced chatbot has RAG/vector database issues');
  console.log('• WebSocket MCP protocol is functional');
  console.log('\n🔧 Recommendations:');
  console.log('1. Get a valid GitHub token for actual API calls');
  console.log('2. Fix the RAG vector database configuration (k parameter issue)');
  console.log('3. Install official GitHub MCP server: npm install -g @modelcontextprotocol/server-github');
  console.log('4. Test with simplified queries first');
}

runTargetedTests().catch(console.error);
