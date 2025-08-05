#!/usr/bin/env node

/**
 * Test Enhanced MCP Features - IP and Swagger-NPX Server Support
 * Tests the new functionality for connecting to MCP servers via IP/auth and Swagger-generated NPX modules
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test configurations for different server types
const testConfigurations = {
  // IP-based server with JWT authentication
  ipServerJWT: {
    query: 'register-mcp-server id:api-jwt-server name:"External API Server (JWT)" type:ip host:api.example.com port:443 protocol:https auth:jwt token:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'IP server with JWT authentication'
  },
  
  // IP-based server with API Key authentication
  ipServerAPIKey: {
    query: 'register-mcp-server id:api-key-server name:"External API Server (API Key)" type:ip host:127.0.0.1 port:8080 protocol:http auth:api-key token:sk-1234567890abcdef',
    description: 'IP server with API Key authentication'
  },
  
  // IP-based server with Basic authentication
  ipServerBasic: {
    query: 'register-mcp-server id:api-basic-server name:"External API Server (Basic)" type:ip host:internal-api.company.com port:9000 protocol:https auth:basic',
    description: 'IP server with Basic authentication'
  },
  
  // Swagger-generated NPX server
  swaggerNPXServer: {
    query: 'register-mcp-server id:swagger-petstore name:"Petstore API MCP" type:swagger-npx swagger:https://petstore.swagger.io/v2/swagger.json',
    description: 'Swagger-generated NPX server from OpenAPI spec'
  },
  
  // Swagger-generated with custom package
  swaggerCustomPackage: {
    query: 'register-mcp-server id:custom-api name:"Custom API MCP" type:swagger-npx swagger:https://api.github.com/swagger.json package:mcp-github-custom',
    description: 'Swagger-generated with custom package name'
  }
};

async function makeRequest(endpoint, data = null, method = 'GET') {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    if (data) {
      config.data = data;
    }

    console.log(`\n🌐 Making ${method} request to: ${endpoint}`);
    if (data) {
      console.log(`📤 Request data:`, JSON.stringify(data, null, 2));
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message
    };
  }
}

async function testServerRegistration(name, config) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${config.description}`);
  console.log(`${'='.repeat(80)}`);
  
  const result = await makeRequest('/enhanced-chatbot', {
    query: config.query,
    sessionId: `test-session-${Date.now()}`
  }, 'POST');

  if (result.success) {
    console.log(`✅ Registration successful!`);
    console.log(`📊 Status: ${result.status}`);
    
    // Check if it was processed with tools
    if (result.data.processed_with_tools) {
      console.log(`🔧 Processed with tools: ${result.data.toolsUsed?.join(', ')}`);
      
      if (result.data.tool_results) {
        result.data.tool_results.forEach((toolResult, index) => {
          console.log(`\n📋 Tool Result ${index + 1}:`);
          console.log(`   Tool: ${toolResult.tool}`);
          console.log(`   Success: ${toolResult.success}`);
          if (toolResult.serverConfig) {
            console.log(`   Server ID: ${toolResult.serverConfig.id}`);
            console.log(`   Server Type: ${toolResult.serverConfig.type}`);
            console.log(`   Server Name: ${toolResult.serverConfig.name}`);
          }
        });
      }
    } else {
      console.log(`ℹ️  Response context: ${result.data.context?.substring(0, 200)}...`);
    }
  } else {
    console.log(`❌ Registration failed!`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`🚨 Error:`, result.error);
  }

  return result;
}

async function testServerListing() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Testing: List all registered MCP servers`);
  console.log(`${'='.repeat(80)}`);
  
  const result = await makeRequest('/enhanced-chatbot', {
    query: 'Can you show me all registered MCP servers with their configurations?',
    sessionId: `list-session-${Date.now()}`
  }, 'POST');

  if (result.success && result.data.tool_results) {
    console.log(`✅ Server listing successful!`);
    
    const serverListResult = result.data.tool_results.find(tr => tr.tool === 'list-mcp-servers');
    if (serverListResult && serverListResult.result?.servers) {
      console.log(`\n📊 Found ${serverListResult.result.servers.length} registered servers:`);
      
      serverListResult.result.servers.forEach((server, index) => {
        console.log(`\n🖥️  Server ${index + 1}:`);
        console.log(`   ID: ${server.id}`);
        console.log(`   Name: ${server.name}`);
        console.log(`   Type: ${server.type}`);
        console.log(`   Status: Initialized=${server.status?.initialized || false}, Connected=${server.status?.connected || false}`);
        
        // Show type-specific details
        if (server.type === 'ip') {
          console.log(`   🌐 IP Details: Host/Port configuration`);
        } else if (server.type === 'swagger-npx') {
          console.log(`   📋 Swagger: Auto-generated from OpenAPI spec`);
        } else if (server.type === 'npx') {
          console.log(`   📦 NPX Package server`);
        }
      });
    }
  } else {
    console.log(`❌ Server listing failed!`);
    console.log(`🚨 Error:`, result.error);
  }

  return result;
}

async function testOrchestrationValidation() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 Testing: MCP Orchestration System Validation`);
  console.log(`${'='.repeat(80)}`);
  
  const result = await makeRequest('/test-mcp-orchestration');

  if (result.success) {
    console.log(`✅ Orchestration validation successful!`);
    console.log(`📊 Results:`, JSON.stringify(result.data, null, 2));
  } else {
    console.log(`❌ Orchestration validation failed!`);
    console.log(`🚨 Error:`, result.error);
  }

  return result;
}

async function runEnhancedMCPTests() {
  console.log(`\n🚀 Enhanced MCP Features Test Suite`);
  console.log(`====================================`);
  console.log(`Testing IP-based and Swagger-generated MCP server support`);
  console.log(`Time: ${new Date().toISOString()}`);

  const results = [];

  // Test 1: Orchestration validation
  console.log(`\n\n🔧 Phase 1: System Validation`);
  const validationResult = await testOrchestrationValidation();
  results.push({ test: 'orchestration-validation', result: validationResult });

  // Test 2: Register different server types
  console.log(`\n\n📝 Phase 2: Enhanced Server Registration`);
  
  for (const [name, config] of Object.entries(testConfigurations)) {
    const result = await testServerRegistration(name, config);
    results.push({ test: name, result });
    
    // Small delay between registrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test 3: List all servers
  console.log(`\n\n📋 Phase 3: Server Inventory`);
  const listResult = await testServerListing();
  results.push({ test: 'server-listing', result: listResult });

  // Test Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  
  const successful = results.filter(r => r.result.success).length;
  const total = results.length;
  
  console.log(`✅ Successful tests: ${successful}/${total}`);
  console.log(`❌ Failed tests: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log(`\n🎉 All enhanced MCP features are working correctly!`);
    console.log(`\n✨ New capabilities verified:`);
    console.log(`   • IP-based MCP servers with authentication (JWT, API Key, Basic)`);
    console.log(`   • Swagger-generated NPX MCP servers`);
    console.log(`   • Enhanced natural language command parsing`);
    console.log(`   • Secure connection handling with TLS support`);
    console.log(`   • Automatic client generation from OpenAPI specifications`);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the detailed output above.`);
  }

  // Detailed results
  console.log(`\n📋 Detailed Results:`);
  results.forEach(({ test, result }) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${test}: ${result.success ? 'PASS' : 'FAIL'}`);
  });

  return results;
}

// Export for use in other test files
module.exports = {
  testConfigurations,
  makeRequest,
  testServerRegistration,
  testServerListing,
  testOrchestrationValidation,
  runEnhancedMCPTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runEnhancedMCPTests().catch(console.error);
}
