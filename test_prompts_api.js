/**
 * Test the system prompts API endpoints
 * This will test the HTTP endpoints directly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSystemPromptsAPI() {
    console.log('🌐 Testing System Prompts API Endpoints');
    console.log('='.repeat(50));
    
    try {
        // Test 1: List all system prompts
        console.log('\n1️⃣ Testing GET /system-prompts');
        try {
            const response = await axios.get(`${BASE_URL}/system-prompts`);
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ Found ${response.data.prompts?.length || 0} prompts`);
            
            if (response.data.prompts && response.data.prompts.length > 0) {
                console.log('  Prompts:');
                response.data.prompts.forEach(prompt => {
                    console.log(`    - ${prompt.name} (${prompt.category}) ${prompt.isDefault ? '[DEFAULT]' : ''}`);
                });
            }
        } catch (error) {
            console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
        }
        
        // Test 2: Get active prompt
        console.log('\n2️⃣ Testing GET /active-prompt');
        try {
            const response = await axios.get(`${BASE_URL}/active-prompt`);
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ Active prompt: ${response.data.name} (${response.data.category})`);
        } catch (error) {
            console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
        }
        
        // Test 3: Create a new prompt
        console.log('\n3️⃣ Testing POST /system-prompts');
        try {
            const newPrompt = {
                name: `API Test Prompt ${Date.now()}`,
                description: 'Test prompt created via API',
                coreSystemPrompt: 'You are an API-created assistant.',
                toolKnowledgePrompt: 'Knowledge created via API testing.',
                category: 'api-test',
                tags: ['api', 'test'],
                version: '1.0.0'
            };
            
            const response = await axios.post(`${BASE_URL}/system-prompts`, newPrompt);
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ Created prompt: ${response.data.name} (ID: ${response.data.id})`);
            
            const createdId = response.data.id;
            
            // Test 4: Get specific prompt by ID
            console.log('\n4️⃣ Testing GET /system-prompts/{id}');
            try {
                const getResponse = await axios.get(`${BASE_URL}/system-prompts/${createdId}`);
                console.log(`✅ Status: ${getResponse.status}`);
                console.log(`✅ Retrieved prompt: ${getResponse.data.name}`);
            } catch (error) {
                console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
            }
            
            // Test 5: Update the prompt
            console.log('\n5️⃣ Testing PUT /system-prompts/{id}');
            try {
                const updateData = {
                    description: 'Updated API test prompt description',
                    tags: ['api', 'test', 'updated']
                };
                
                const updateResponse = await axios.put(`${BASE_URL}/system-prompts/${createdId}`, updateData);
                console.log(`✅ Status: ${updateResponse.status}`);
                console.log(`✅ Updated prompt: ${updateResponse.data.description}`);
            } catch (error) {
                console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
            }
            
            // Test 6: Set as default
            console.log('\n6️⃣ Testing POST /system-prompts/{id}/set-default');
            try {
                const defaultResponse = await axios.post(`${BASE_URL}/system-prompts/${createdId}/set-default`);
                console.log(`✅ Status: ${defaultResponse.status}`);
                console.log(`✅ Set as default: ${defaultResponse.data.message || 'Success'}`);
            } catch (error) {
                console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
            }
            
            // Test 7: Verify it's now active
            console.log('\n7️⃣ Testing active prompt after default change');
            try {
                const activeResponse = await axios.get(`${BASE_URL}/active-prompt`);
                console.log(`✅ Status: ${activeResponse.status}`);
                console.log(`✅ New active prompt: ${activeResponse.data.name}`);
            } catch (error) {
                console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
            }
            
            // Test 8: Delete the test prompt
            console.log('\n8️⃣ Testing DELETE /system-prompts/{id}');
            try {
                const deleteResponse = await axios.delete(`${BASE_URL}/system-prompts/${createdId}`);
                console.log(`✅ Status: ${deleteResponse.status}`);
                console.log(`✅ Deleted prompt successfully`);
            } catch (error) {
                console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
            }
            
        } catch (error) {
            console.log(`❌ Create failed: ${error.response?.status || error.code} - ${error.message}`);
        }
        
        // Test 9: Test filtering parameters
        console.log('\n9️⃣ Testing API filtering parameters');
        try {
            const filterResponse = await axios.get(`${BASE_URL}/system-prompts?category=development&limit=2`);
            console.log(`✅ Status: ${filterResponse.status}`);
            console.log(`✅ Filtered results: ${filterResponse.data.prompts?.length || 0} prompts`);
        } catch (error) {
            console.log(`❌ Failed: ${error.response?.status || error.code} - ${error.message}`);
        }
        
        console.log('\n🎉 API Endpoint Tests Completed!');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Overall test failed:', error.message);
    }
}

// Check if server is running first
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/health`);
        console.log('✅ Server is running, starting API tests...');
        return true;
    } catch (error) {
        console.log('❌ Server is not running. Please start the server first.');
        console.log('   Run: npm run dev');
        return false;
    }
}

// Run the test
checkServer().then(isRunning => {
    if (isRunning) {
        testSystemPromptsAPI();
    }
});
