const WebSocket = require('ws');

// Test exactly like frontend would send
function testFrontendLikeExecution() {
    const ws = new WebSocket('ws://localhost:8000');
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
        
        // Test the exact command the user mentioned
        const message = {
            eventtype: 'websocket.stream',
            payload: {
                message: 'execute command ls -la data',
                sessionId: null // Let it create a new session like frontend does
            },
            clientId: 'frontend-test-client-' + Date.now()
        };
        
        console.log('🚀 Sending frontend-like message:', JSON.stringify(message, null, 2));
        ws.send(JSON.stringify(message));
    });

    let fullResponse = '';
    let isCollecting = false;

    ws.on('message', function incoming(data) {
        try {
            const response = JSON.parse(data);
            console.log('📥 Raw response:', response);
            
            if (response.eventtype === 'stream.start') {
                fullResponse = '';
                isCollecting = true;
                console.log('🎬 Stream started');
            } else if (response.eventtype === 'stream.chunk' && response.payload.message) {
                fullResponse += response.payload.message;
                process.stdout.write(response.payload.message); // Real-time output
            } else if (response.eventtype === 'stream.end') {
                isCollecting = false;
                console.log('\n🏁 Stream ended');
                console.log('📋 Full response:', fullResponse);
                
                // Analyze the response
                if (fullResponse.includes('cannot execute') || fullResponse.includes('I am sorry')) {
                    console.log('❌ ISSUE DETECTED: Still getting old behavior');
                } else if (fullResponse.includes('docData.json') || fullResponse.includes('system_prompt.json')) {
                    console.log('✅ SUCCESS: Command executed and returned directory listing');
                } else {
                    console.log('🤔 UNCLEAR: Response doesn\'t match expected patterns');
                }
                
                ws.close();
            } else if (response.eventtype === 'error') {
                console.log('❌ Error response:', response);
                ws.close();
            }
        } catch (e) {
            console.log('📋 Raw data:', data.toString());
        }
    });

    ws.on('error', function error(err) {
        console.error('❌ WebSocket error:', err);
    });

    ws.on('close', function close() {
        console.log('🔌 WebSocket connection closed');
    });

    // Timeout after 15 seconds
    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log('⏰ Timeout - closing connection');
            ws.close();
        }
    }, 15000);
}

console.log('🧪 Testing frontend-like command execution...');
testFrontendLikeExecution();
