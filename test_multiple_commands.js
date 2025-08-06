const WebSocket = require('ws');

// Test different command execution scenarios
function testMultipleCommands() {
    const ws = new WebSocket('ws://localhost:8000');
    let testCount = 0;
    const tests = [
        'execute command pwd',
        'execute command ls -la',
        'run command echo "Hello from command execution"',
        'please execute the command date'
    ];
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
        sendNextTest();
    });

    function sendNextTest() {
        if (testCount < tests.length) {
            const message = {
                eventtype: 'websocket.stream',
                payload: {
                    message: tests[testCount],
                    sessionId: 'multi-test-session-' + Date.now()
                },
                clientId: 'multi-test-client-' + Date.now()
            };
            
            console.log(`\n🧪 Test ${testCount + 1}: "${tests[testCount]}"`);
            ws.send(JSON.stringify(message));
            testCount++;
        } else {
            console.log('\n✅ All tests completed!');
            ws.close();
        }
    }

    let responseBuffer = '';
    let isCollectingResponse = false;

    ws.on('message', function incoming(data) {
        try {
            const response = JSON.parse(data);
            
            if (response.eventtype === 'stream.start') {
                responseBuffer = '';
                isCollectingResponse = true;
            } else if (response.eventtype === 'stream.chunk' && response.payload.message) {
                responseBuffer += response.payload.message;
            } else if (response.eventtype === 'stream.end') {
                if (isCollectingResponse && responseBuffer.trim()) {
                    console.log('📋 Complete response:', responseBuffer.trim());
                    
                    // Check for success indicators
                    if (responseBuffer.includes('/home/sanskar/Chaitanya') || 
                        responseBuffer.includes('Hello from command execution') ||
                        responseBuffer.includes('total ') ||
                        responseBuffer.match(/\d{4}/)) { // year in date output
                        console.log('✅ Command executed successfully!');
                    } else if (responseBuffer.toLowerCase().includes('cannot execute') || 
                               responseBuffer.toLowerCase().includes('sorry')) {
                        console.log('❌ Command execution failed - old behavior detected');
                    }
                }
                isCollectingResponse = false;
                
                // Send next test after a short delay
                setTimeout(sendNextTest, 1000);
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
}

console.log('🧪 Testing multiple command execution scenarios...');
testMultipleCommands();
