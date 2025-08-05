#!/usr/bin/env node

/**
 * Test Single MCP Tool Restriction
 * Verifies that only one MCP tool is executed per query, even when multiple are suggested
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

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

async function testSingleMCPToolRestriction() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔒 Single MCP Tool Restriction Test`);
  console.log(`${'='.repeat(80)}`);
  
  // Test queries that could potentially trigger multiple MCP tools
  const testQueries = [
    {
      query: "register-mcp-server id:test1 name:\"Test 1\" type:npx command:package1 and also list all MCP servers",
      description: "Registration + List servers (should only do registration)",
      expectedTool: "register-mcp-server"
    },
    {
      query: "Can you show me GitHub repositories and also register a new MCP server for filesystem operations?",
      description: "GitHub MCP + Server registration (should only do GitHub)",
      expectedTool: "github-mcp"
    },
    {
      query: "List all MCP servers and also execute the analysis task",
      description: "List servers + Execute task (should only do list)",
      expectedTool: "list-mcp-servers"
    },
    {
      query: "register-mcp-task id:task1 name:\"Task 1\" servers:[test] and register-mcp-server id:server1 name:\"Server 1\" type:npx",
      description: "Task registration + Server registration (should only do task)",
      expectedTool: "register-mcp-task"
    },
    {
      query: "Execute the github-analysis task and call the external weather API",
      description: "Task execution + MCP call (should only do task execution)",
      expectedTool: "execute-mcp-task"
    }
  ];

  const results = [];

  for (const test of testQueries) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🧪 Test: ${test.description}`);
    console.log(`📝 Query: "${test.query}"`);
    console.log(`🎯 Expected primary tool: ${test.expectedTool}`);
    
    const result = await makeRequest('/enhanced-chatbot', {
      query: test.query,
      sessionId: `single-tool-test-${Date.now()}`
    }, 'POST');

    if (result.success) {
      const toolsUsed = result.data.toolsUsed || [];
      const mcpToolsUsed = toolsUsed.filter(tool => 
        ['call-mcp', 'register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp'].includes(tool)
      );
      
      console.log(`✅ Request successful`);
      console.log(`🔧 Tools used: ${toolsUsed.join(', ')}`);
      console.log(`🔗 MCP tools used: ${mcpToolsUsed.join(', ')}`);
      console.log(`📊 MCP tool count: ${mcpToolsUsed.length}`);
      
      if (mcpToolsUsed.length <= 1) {
        console.log(`✅ PASS: Only ${mcpToolsUsed.length} MCP tool used (restriction enforced)`);
        if (mcpToolsUsed.length === 1 && mcpToolsUsed[0] === test.expectedTool) {
          console.log(`🎯 PERFECT: Expected tool '${test.expectedTool}' was used`);
        } else if (mcpToolsUsed.length === 1) {
          console.log(`⚠️  DIFFERENT: Expected '${test.expectedTool}' but got '${mcpToolsUsed[0]}'`);
        }
        results.push({ test: test.description, passed: true, mcpToolCount: mcpToolsUsed.length });
      } else {
        console.log(`❌ FAIL: Multiple MCP tools used (${mcpToolsUsed.length}), restriction not enforced!`);
        results.push({ test: test.description, passed: false, mcpToolCount: mcpToolsUsed.length });
      }
      
      // Show tool results if available
      if (result.data.tool_results && result.data.tool_results.length > 0) {
        console.log(`📋 Tool Results:`);
        result.data.tool_results.forEach((toolResult, index) => {
          console.log(`   ${index + 1}. ${toolResult.tool}: ${toolResult.success ? 'SUCCESS' : 'FAIL'}`);
        });
      }
    } else {
      console.log(`❌ Request failed: ${result.error}`);
      results.push({ test: test.description, passed: false, mcpToolCount: 'unknown' });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SINGLE MCP TOOL RESTRICTION TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`✅ Passed tests: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed tests: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 SUCCESS: Single MCP tool restriction is working correctly!`);
    console.log(`✨ Key benefits verified:`);
    console.log(`   • Prevents MCP tool conflicts`);
    console.log(`   • Ensures focused operations`);
    console.log(`   • Maintains system stability`);
    console.log(`   • Provides predictable behavior`);
  } else {
    console.log(`\n⚠️  WARNING: Single MCP tool restriction needs attention!`);
  }

  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`   ${status} Test ${index + 1}: ${result.passed ? 'PASS' : 'FAIL'} (${result.mcpToolCount} MCP tools)`);
  });

  return results;
}

// Test for mixed MCP and local tools
async function testMixedToolExecution() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔀 Mixed Tool Execution Test`);
  console.log(`${'='.repeat(80)}`);
  
  const mixedQuery = "List the files in the current directory and also show me all registered MCP servers";
  
  console.log(`📝 Testing mixed local + MCP tools query:`);
  console.log(`   "${mixedQuery}"`);
  
  const result = await makeRequest('/enhanced-chatbot', {
    query: mixedQuery,
    sessionId: `mixed-test-${Date.now()}`
  }, 'POST');

  if (result.success) {
    const toolsUsed = result.data.toolsUsed || [];
    const mcpTools = toolsUsed.filter(tool => 
      ['call-mcp', 'register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp'].includes(tool)
    );
    const localTools = toolsUsed.filter(tool => 
      ['read-file', 'write-file', 'list-directory', 'get-file-info', 'execute-command', 'switch-mode'].includes(tool)
    );
    
    console.log(`✅ Request successful`);
    console.log(`🔧 All tools used: ${toolsUsed.join(', ')}`);
    console.log(`🏠 Local tools: ${localTools.join(', ')}`);
    console.log(`🔗 MCP tools: ${mcpTools.join(', ')}`);
    
    if (mcpTools.length <= 1) {
      console.log(`✅ PASS: MCP tool restriction maintained (${mcpTools.length} MCP tool)`);
      console.log(`ℹ️  Local tools can still execute alongside 1 MCP tool`);
    } else {
      console.log(`❌ FAIL: Multiple MCP tools used despite restriction`);
    }
  } else {
    console.log(`❌ Mixed tool test failed: ${result.error}`);
  }
}

// Run all tests
async function runSingleMCPToolTests() {
  console.log(`\n🚀 Single MCP Tool Restriction Test Suite`);
  console.log(`=========================================`);
  console.log(`Verifying that only one MCP tool executes per query`);
  console.log(`Time: ${new Date().toISOString()}`);

  await testSingleMCPToolRestriction();
  await testMixedToolExecution();
  
  console.log(`\n🏁 Test suite completed!`);
}

// Export for use in other test files
module.exports = {
  testSingleMCPToolRestriction,
  testMixedToolExecution,
  runSingleMCPToolTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runSingleMCPToolTests().catch(console.error);
}
