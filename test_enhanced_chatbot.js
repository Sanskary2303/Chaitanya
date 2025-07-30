// Test script for Enhanced MCP ChatBot
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testEnhancedChatBot() {
  console.log('🤖 Testing Enhanced MCP ChatBot...\n');

  const testCases = [
    {
      name: 'Standard RAG Query',
      payload: {
        query: 'What is this project about?'
      }
    },
    {
      name: 'File Reading Request',
      payload: {
        query: 'Read file package.json',
        enableFileOperations: true
      }
    },
    {
      name: 'Directory Listing Request',
      payload: {
        query: 'List files in the src directory',
        enableFileOperations: true
      }
    },
    {
      name: 'Mode Switch Request',
      payload: {
        query: 'Switch mode to development',
        enableFileOperations: true
      }
    },
    {
      name: 'Complex Multi-Tool Query',
      payload: {
        query: 'List files in src/functions directory and read the mcp_server.ts file',
        enableFileOperations: true,
        mode: 'analysis'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.payload.query}"`);
    
    try {
      const response = await axios.post(`${API_URL}/enhanced-chatbot`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Status:', response.data.success ? 'Success' : 'Failed');
      console.log('📊 Response Code:', response.data.code);
      
      if (response.data.data) {
        const data = response.data.data;
        console.log('🔧 Tools Used:', data.toolsUsed?.join(', ') || 'None');
        console.log('🎯 Mode:', data.mode);
        console.log('⚙️ Processed with Tools:', data.processed_with_tools || false);
        
        if (data.context) {
          const preview = data.context.substring(0, 200);
          console.log('📄 Context Preview:', preview + (data.context.length > 200 ? '...' : ''));
        }
        
        if (data.tool_results && data.tool_results.length > 0) {
          console.log('🛠️ Tool Results:');
          data.tool_results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.tool}: ${result.success ? '✅' : '❌'}`);
          });
        }
      }
      
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    console.log('─'.repeat(50));
  }
}

async function testMCPToolsDirectly() {
  console.log('\n🔧 Testing MCP Tools Directly...\n');

  const toolTests = [
    {
      name: 'Read File Tool',
      endpoint: '/mcp/read-file',
      payload: { filePath: 'package.json', encoding: 'utf8' }
    },
    {
      name: 'List Directory Tool',
      endpoint: '/mcp/list-directory',
      payload: { dirPath: 'src' }
    },
    {
      name: 'Get File Info Tool',
      endpoint: '/mcp/get-file-info',
      payload: { filePath: 'src/index.ts' }
    },
    {
      name: 'Switch Mode Tool',
      endpoint: '/mcp/switch-mode',
      payload: { mode: 'debug' }
    }
  ];

  for (const test of toolTests) {
    console.log(`🔧 Testing: ${test.name}`);
    
    try {
      const response = await axios.post(`${API_URL}${test.endpoint}`, test.payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Status:', response.data.success ? 'Success' : 'Failed');
      console.log('📊 Response Code:', response.data.code);
      console.log('💬 Message:', response.data.message);
      
      if (response.data.data) {
        const dataPreview = JSON.stringify(response.data.data, null, 2).substring(0, 300);
        console.log('📄 Data Preview:', dataPreview + '...');
      }
      
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    console.log('─'.repeat(40));
  }
}

async function main() {
  console.log('🚀 Enhanced MCP ChatBot Test Suite\n');
  
  try {
    // Test if server is running
    await axios.get(`${API_URL}/api-docs`);
    console.log('✅ Server is running at', API_URL);
    console.log('📚 API Documentation available at:', `${API_URL}/api-docs\n`);
    
    await testEnhancedChatBot();
    await testMCPToolsDirectly();
    
    console.log('\n🎉 Test suite completed!');
    console.log('\n💡 Usage Tips:');
    console.log('  - Use natural language queries for complex operations');
    console.log('  - Enable only the tools you need for security');
    console.log('  - Specify working directory for relative paths');
    console.log('  - Check tool_results for detailed operation outcomes');
    
  } catch (error) {
    console.error('❌ Server connection failed:', error.message);
    console.log('\n🔧 Make sure the server is running:');
    console.log('   npm run serve');
    console.log('   or');
    console.log('   pnpm serve');
  }
}

main();
