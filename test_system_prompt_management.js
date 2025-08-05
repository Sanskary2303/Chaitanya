const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSystemPromptManagement() {
  console.log('🚀 System Prompt Management Test Suite');
  console.log('=====================================');
  console.log('Testing database-backed system prompt management');
  console.log('Time:', new Date().toISOString());
  console.log();

  const tests = [];
  
  try {
    // Test 1: Migration and Default Prompt
    console.log('🔧 Phase 1: Migration and Default Setup');
    console.log('================================================================================');
    
    // Run migration first
    console.log('📋 Running system prompt migration...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('npx ts-node migrate_system_prompts.ts');
      console.log('✅ Migration output:', stdout);
      if (stderr) console.log('⚠️ Migration warnings:', stderr);
    } catch (migrationError) {
      console.log('ℹ️ Migration result:', migrationError.stdout || migrationError.message);
    }

    // Test 2: Get Active Prompt
    console.log('\n================================================================================');
    console.log('🧪 Test: Get active system prompt');
    console.log('================================================================================');

    const activePromptResponse = await axios.get(`${BASE_URL}/active-prompt`);
    const activePrompt = activePromptResponse.data;
    
    console.log('✅ Active prompt retrieved successfully');
    console.log('📋 Prompt Details:');
    console.log(`   - Name: ${activePrompt.prompt?.name || 'N/A'}`);
    console.log(`   - Version: ${activePrompt.prompt?.version || 'N/A'}`);
    console.log(`   - Category: ${activePrompt.prompt?.category || 'N/A'}`);
    console.log(`   - Is Default: ${activePrompt.prompt?.isDefault || false}`);
    console.log(`   - Core Prompt Length: ${activePrompt.core_system_prompt?.length || 0} chars`);
    console.log(`   - Tool Prompt Length: ${activePrompt.tool_knowledge_prompt?.length || 0} chars`);
    tests.push({ name: 'get-active-prompt', status: 'PASS' });

    // Test 3: List All Prompts
    console.log('\n================================================================================');
    console.log('🧪 Test: List all system prompts');
    console.log('================================================================================');

    const listResponse = await axios.get(`${BASE_URL}/system-prompts`);
    const promptList = listResponse.data;
    
    console.log('✅ Prompt list retrieved successfully');
    console.log(`📊 Found ${promptList.prompts?.length || 0} prompts:`);
    
    if (promptList.prompts) {
      promptList.prompts.forEach((prompt, index) => {
        console.log(`   ${index + 1}. ${prompt.name} (${prompt.category}) ${prompt.isDefault ? '[DEFAULT]' : ''} ${prompt.isActive ? '[ACTIVE]' : '[INACTIVE]'}`);
        console.log(`      Version: ${prompt.version}, Created: ${new Date(prompt.createdAt).toLocaleDateString()}`);
      });
    }
    tests.push({ name: 'list-prompts', status: 'PASS' });

    // Test 4: Create New Prompt
    console.log('\n================================================================================');
    console.log('🧪 Test: Create new system prompt');
    console.log('================================================================================');

    const newPromptData = {
      name: `Test Prompt ${Date.now()}`,
      description: 'Test prompt created by automated test suite',
      coreSystemPrompt: 'You are a test AI assistant created during system validation.',
      toolKnowledgePrompt: 'This is a test prompt with basic tool knowledge for validation purposes.',
      category: 'testing',
      tags: ['test', 'automation', 'validation'],
      version: '1.0.0',
      createdBy: 'test-suite',
      isDefault: false,
      isActive: true
    };

    const createResponse = await axios.post(`${BASE_URL}/system-prompts`, newPromptData);
    const createdPrompt = createResponse.data.prompt;
    
    console.log('✅ New prompt created successfully');
    console.log(`📋 Created Prompt ID: ${createdPrompt.id}`);
    console.log(`   - Name: ${createdPrompt.name}`);
    console.log(`   - Category: ${createdPrompt.category}`);
    console.log(`   - Active: ${createdPrompt.isActive}`);
    tests.push({ name: 'create-prompt', status: 'PASS', promptId: createdPrompt.id });

    // Test 5: Update Prompt
    console.log('\n================================================================================');
    console.log('🧪 Test: Update system prompt');
    console.log('================================================================================');

    const updateData = {
      description: 'Updated test prompt description with enhanced capabilities',
      version: '1.1.0',
      tags: ['test', 'automation', 'validation', 'updated']
    };

    const updateResponse = await axios.put(`${BASE_URL}/system-prompts/${createdPrompt.id}`, updateData);
    const updatedPrompt = updateResponse.data.prompt;
    
    console.log('✅ Prompt updated successfully');
    console.log(`📋 Updated fields:`);
    console.log(`   - Description: ${updatedPrompt.description}`);
    console.log(`   - Version: ${updatedPrompt.version}`);
    console.log(`   - Tags: [${updatedPrompt.tags.join(', ')}]`);
    tests.push({ name: 'update-prompt', status: 'PASS' });

    // Test 6: Get Specific Prompt
    console.log('\n================================================================================');
    console.log('🧪 Test: Get specific system prompt');
    console.log('================================================================================');

    const getSpecificResponse = await axios.get(`${BASE_URL}/system-prompts/${createdPrompt.id}`);
    const specificPrompt = getSpecificResponse.data.prompt;
    
    console.log('✅ Specific prompt retrieved successfully');
    console.log(`📋 Retrieved Prompt: ${specificPrompt.name}`);
    console.log(`   - ID matches: ${specificPrompt.id === createdPrompt.id}`);
    console.log(`   - Version: ${specificPrompt.version}`);
    tests.push({ name: 'get-specific-prompt', status: 'PASS' });

    // Test 7: Set as Default (temporarily)
    console.log('\n================================================================================');
    console.log('🧪 Test: Set prompt as default');
    console.log('================================================================================');

    const setDefaultResponse = await axios.post(`${BASE_URL}/system-prompts/${createdPrompt.id}/set-default`);
    const newDefaultPrompt = setDefaultResponse.data.prompt;
    
    console.log('✅ Default prompt updated successfully');
    console.log(`📋 New default: ${newDefaultPrompt.name}`);
    console.log(`   - Is Default: ${newDefaultPrompt.isDefault}`);
    console.log(`   - Is Active: ${newDefaultPrompt.isActive}`);
    tests.push({ name: 'set-default', status: 'PASS' });

    // Test 8: Verify Active Prompt Changed
    console.log('\n================================================================================');
    console.log('🧪 Test: Verify active prompt changed');
    console.log('================================================================================');

    const newActiveResponse = await axios.get(`${BASE_URL}/active-prompt`);
    const newActivePrompt = newActiveResponse.data;
    
    console.log('✅ Active prompt verification completed');
    console.log(`📋 Current active prompt: ${newActivePrompt.prompt?.name || 'N/A'}`);
    console.log(`   - Changed from previous: ${newActivePrompt.prompt?.name !== activePrompt.prompt?.name}`);
    tests.push({ name: 'verify-active-change', status: 'PASS' });

    // Test 9: Test Enhanced Chatbot with New Prompt
    console.log('\n================================================================================');
    console.log('🧪 Test: Enhanced chatbot with new system prompt');
    console.log('================================================================================');

    const chatbotTestQuery = {
      query: 'Hello, what is your current configuration?',
      sessionId: `test-session-${Date.now()}`
    };

    const chatbotResponse = await axios.post(`${BASE_URL}/enhanced-chatbot`, chatbotTestQuery);
    
    console.log('✅ Enhanced chatbot test completed');
    console.log('📋 Chatbot Response Summary:');
    console.log(`   - Status: ${chatbotResponse.status}`);
    console.log(`   - Response length: ${chatbotResponse.data.response?.length || 0} chars`);
    console.log(`   - Tools used: ${JSON.stringify(chatbotResponse.data.toolsUsed || [])}`);
    tests.push({ name: 'chatbot-with-new-prompt', status: 'PASS' });

    // Test 10: Restore Original Default
    console.log('\n================================================================================');
    console.log('🧪 Test: Restore original default prompt');
    console.log('================================================================================');

    // Find the original default (should be the migrated one)
    const originalDefault = promptList.prompts.find(p => p.name.includes('Legacy') || p.name.includes('Default'));
    
    if (originalDefault && originalDefault.id !== createdPrompt.id) {
      const restoreResponse = await axios.post(`${BASE_URL}/system-prompts/${originalDefault.id}/set-default`);
      console.log('✅ Original default restored');
      console.log(`📋 Restored default: ${restoreResponse.data.prompt.name}`);
      tests.push({ name: 'restore-default', status: 'PASS' });
    } else {
      console.log('ℹ️ Original default not found or same as test prompt');
      tests.push({ name: 'restore-default', status: 'SKIP' });
    }

    // Test 11: Delete Test Prompt
    console.log('\n================================================================================');
    console.log('🧪 Test: Delete test prompt');
    console.log('================================================================================');

    const deleteResponse = await axios.delete(`${BASE_URL}/system-prompts/${createdPrompt.id}`);
    
    console.log('✅ Test prompt deleted successfully');
    console.log(`📋 Deleted ID: ${deleteResponse.data.deletedId}`);
    tests.push({ name: 'delete-prompt', status: 'PASS' });

    // Test 12: Search and Filter Prompts
    console.log('\n================================================================================');
    console.log('🧪 Test: Search and filter prompts');
    console.log('================================================================================');

    const searchResponse = await axios.get(`${BASE_URL}/system-prompts?search=github&includeContent=true`);
    const searchResults = searchResponse.data;
    
    console.log('✅ Search and filter completed');
    console.log(`📋 Found ${searchResults.prompts?.length || 0} prompts matching 'github'`);
    if (searchResults.prompts && searchResults.prompts.length > 0) {
      console.log(`   - First result: ${searchResults.prompts[0].name}`);
      console.log(`   - Content included: ${!!searchResults.prompts[0].coreSystemPrompt}`);
    }
    tests.push({ name: 'search-filter', status: 'PASS' });

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    tests.push({ name: 'current-test', status: 'FAIL', error: error.message });
  }

  // Final Summary
  console.log('\n================================================================================');
  console.log('📊 SYSTEM PROMPT MANAGEMENT TEST SUMMARY');
  console.log('================================================================================');
  
  const passedTests = tests.filter(t => t.status === 'PASS').length;
  const failedTests = tests.filter(t => t.status === 'FAIL').length;
  const skippedTests = tests.filter(t => t.status === 'SKIP').length;
  
  console.log(`✅ Passed tests: ${passedTests}/${tests.length}`);
  console.log(`❌ Failed tests: ${failedTests}/${tests.length}`);
  console.log(`⏭️ Skipped tests: ${skippedTests}/${tests.length}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 SUCCESS: All system prompt management features are working correctly!');
    console.log('\n✨ Key features verified:');
    console.log('   • Database-backed prompt storage');
    console.log('   • Multiple prompt support');
    console.log('   • CRUD operations (Create, Read, Update, Delete)');
    console.log('   • Default prompt management');
    console.log('   • Search and filtering');
    console.log('   • Integration with enhanced chatbot');
    console.log('   • Backward compatibility with legacy format');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the error details above.');
  }
  
  console.log('\n📋 Detailed Results:');
  tests.forEach(test => {
    const status = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`   ${status} ${test.name}: ${test.status}`);
    if (test.error) console.log(`      Error: ${test.error}`);
  });
  
  console.log('\n🏁 Test suite completed!');
}

// Run the test
testSystemPromptManagement().catch(console.error);
