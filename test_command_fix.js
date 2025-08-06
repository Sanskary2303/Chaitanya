const WebSocket = require('ws');

// Test command execution through WebSocket
function testCommandExecution() {
    const ws = new WebSocket('ws://localhost:8000');
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
        
        // Test 1: Simple ls command
        const message1 = {
            eventtype: 'websocket.stream',
            payload: {
                message: 'execute command ls -la data/',
                sessionId: 'test-command-session-' + Date.now()
            },
            clientId: 'test-client-' + Date.now()
        };
        
        console.log('🚀 Sending command execution request:', message1.payload.message);
        ws.send(JSON.stringify(message1));
    });

    ws.on('message', function incoming(data) {
        try {
            const response = JSON.parse(data);
            console.log('📥 Received response:', response);
            
            // Check if we got a successful command execution response
            if (response.content && response.content.includes('data')) {
                console.log('✅ SUCCESS: Command execution working! Got directory listing.');
            } else if (response.content && response.content.includes('cannot execute')) {
                console.log('❌ FAILED: Still getting the old error message.');
            } else {
                console.log('📋 Response content:', response.content);
            }
        } catch (e) {
            console.log('📋 Raw response:', data.toString());
        }
    });

    ws.on('error', function error(err) {
        console.error('❌ WebSocket error:', err);
    });

    ws.on('close', function close() {
        console.log('🔌 WebSocket connection closed');
    });

    // Close after 10 seconds
    setTimeout(() => {
        ws.close();
    }, 10000);
}

console.log('🧪 Testing command execution fix...');
testCommandExecution();
