const WebSocket = require('ws');

// Test with various command formats to see which one works
function testDifferentCommandFormats() {
    const ws = new WebSocket('ws://localhost:8000');
    
    const testCommands = [
        'execute command ls -la data',
        'run the command ls -la data',
        'please execute ls -la data',
        'I need you to execute the command: ls -la data',
        'use the execute_command tool to run ls -la data',
        'run shell command: ls -la data',
        'can you execute ls -la data for me'
    ];
    
    let currentTest = 0;
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
        runNextTest();
    });

    function runNextTest() {
        if (currentTest >= testCommands.length) {
            console.log('\n🏁 All tests completed');
            ws.close();
            return;
        }
        
        const command = testCommands[currentTest];
        console.log(`\n🧪 Test ${currentTest + 1}/${testCommands.length}: "${command}"`);
        
        const message = {
            eventtype: 'websocket.stream',
            payload: {
                message: command,
                sessionId: null
            },
            clientId: 'test-client-' + Date.now()
        };
        
        ws.send(JSON.stringify(message));
    }

    let fullResponse = '';
    let isCollecting = false;

    ws.on('message', function incoming(data) {
        try {
            const response = JSON.parse(data);
            
            if (response.eventtype === 'stream.start') {
                fullResponse = '';
                isCollecting = true;
            } else if (response.eventtype === 'stream.chunk' && response.payload.message) {
                fullResponse += response.payload.message;
                process.stdout.write(response.payload.message);
            } else if (response.eventtype === 'stream.end') {
                isCollecting = false;
                console.log('\n📋 Full response:', fullResponse.trim());
                
                // Analyze the response
                if (fullResponse.includes('docData.json') || fullResponse.includes('system_prompt.json') || fullResponse.includes('test.txt')) {
                    console.log('✅ SUCCESS: Command executed and returned directory listing');
                } else if (fullResponse.includes('cannot execute') || fullResponse.includes('I am sorry') || fullResponse.includes('do not have access')) {
                    console.log('❌ FAILED: Still getting old behavior');
                } else if (fullResponse.trim().length === 0) {
                    console.log('⚠️  EMPTY: Got empty response');
                } else {
                    console.log('🤔 UNCLEAR: Unexpected response format');
                }
                
                currentTest++;
                setTimeout(runNextTest, 2000); // Wait 2 seconds between tests
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
}

console.log('🧪 Testing different command execution formats...');
testDifferentCommandFormats();
