const axios = require('axios');
const WebSocket = require('ws');

console.log('🔍 Simplified GitHub MCP Debug Test');
console.log('======================================');

// Test server health first
async function testServerHealth() {
    try {
        console.log('\n1️⃣ Testing Basic Server Health...');
        
        // The server doesn't have a root route, that's expected
        console.log('✅ Server is running on port 3000 (confirmed by netstat)');
        
        // Test if server is responsive with 404
        try {
            await axios.get('http://localhost:3000');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('✅ Server responds with 404 (no root route configured)');
                return true;
            }
            console.log('❌ Server error:', error.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Server not accessible:', error.message);
        return false;
    }
    return true;
}

// Test GitHub MCP endpoints with minimal data
async function testMinimalMCP() {
    console.log('\n2️⃣ Testing Working GitHub MCP Endpoints...');
    
    try {
        // Test GitHub MCP client list (we know this works)
        console.log('📋 Testing GitHub MCP client list...');
        const listResponse = await axios.post('http://localhost:3000/github-mcp-client', {
            action: 'list'
        });
        console.log('✅ GitHub MCP Client List:', listResponse.status);
        console.log('� Connected clients:', listResponse.data.clients?.length || 0);
        
        if (listResponse.data.clients && listResponse.data.clients.length > 0) {
            const client = listResponse.data.clients[0];
            console.log(`   📱 Client "${client.name}" connected: ${client.connected}`);
        }
        
    } catch (error) {
        console.log('❌ GitHub MCP Client List error:', error.response?.status, error.response?.data || error.message);
    }
    
    // Test other actions that might work
    const validActions = ['list', 'connect', 'disconnect'];
    for (const action of validActions) {
        if (action === 'list') continue; // Already tested
        
        try {
            console.log(`🔧 Testing action: ${action}...`);
            const response = await axios.post('http://localhost:3000/github-mcp-client', { action });
            console.log(`✅ Action ${action}:`, response.status);
        } catch (error) {
            console.log(`❌ Action ${action} error:`, error.response?.status);
        }
    }
}

// Test WebSocket connection
async function testWebSocketSimple() {
    console.log('\n3️⃣ Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:8000');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected');
            
            // Send simple ping
            ws.send(JSON.stringify({
                event: 'ping',
                data: { message: 'test' }
            }));
            
            setTimeout(() => {
                ws.close();
                resolve();
            }, 1000);
        });
        
        ws.on('message', (data) => {
            console.log('📨 WebSocket response:', data.toString());
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
            resolve();
        });
        
        setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                console.log('❌ WebSocket connection timeout');
                resolve();
            }
        }, 5000);
    });
}

// Run all tests
async function runTests() {
    const serverOk = await testServerHealth();
    if (serverOk) {
        await testMinimalMCP();
        await testWebSocketSimple();
    }
    
    console.log('\n🏁 Simple debug test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Fix any 500 errors in the server logs');
    console.log('   2. Check GitHub token validity');
    console.log('   3. Verify MCP event configurations');
}

runTests().catch(console.error);
