#!/usr/bin/env node

/**
 * Test script for GitHub MCP integration in the chatbot
 */

const axios = require('axios');

// Your chatbot endpoint (adjust port if different)
const CHATBOT_URL = 'http://localhost:3000/chatbot/query';

// Test queries for GitHub integration
const testQueries = [
  "List my GitHub repositories",
  "Show me the commits in my Chaitanya repository", 
  "Create a new issue in my OOSC3.0-UbuCon-India repository",
  "What are my GitHub notifications?",
  "Show me pull requests in my repositories",
  "Get my GitHub profile information"
];

async function testGitHubIntegration() {
  console.log('🧪 Testing GitHub MCP Integration...\n');
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`📝 Test ${i + 1}: "${query}"`);
    
    try {
      const response = await axios.post(CHATBOT_URL, {
        query: query,
        userId: 'test-user-github',
        config: {
          enableExternalMCP: true,
          enableFileOperations: true,
          enableCommandExecution: false,
          maxTokens: 2048,
          temperature: 0.3
        }
      });
      
      if (response.data.success) {
        console.log('✅ Success:', response.data.data.response);
        if (response.data.data.toolResults && response.data.data.toolResults.length > 0) {
          console.log('🔧 Tool Results:', JSON.stringify(response.data.data.toolResults, null, 2));
        }
      } else {
        console.log('❌ Failed:', response.data.message);
      }
    } catch (error) {
      console.log('💥 Error:', error.response?.data?.message || error.message);
    }
    
    console.log('─'.repeat(80));
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Check if chatbot is running
async function checkChatbotStatus() {
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ Chatbot is running on http://localhost:3000\n');
    return true;
  } catch (error) {
    console.log('❌ Chatbot is not running. Please start it first with: npm start\n');
    return false;
  }
}

async function main() {
  console.log('🤖 GitHub MCP Integration Test\n');
  
  const isRunning = await checkChatbotStatus();
  if (!isRunning) {
    process.exit(1);
  }
  
  await testGitHubIntegration();
  
  console.log('\n🎉 Testing completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Replace GITHUB_TOKEN in .env with your actual token');
  console.log('2. Restart your chatbot: npm start');
  console.log('3. Run this test again: node test_github_integration.js');
}

main().catch(console.error);
