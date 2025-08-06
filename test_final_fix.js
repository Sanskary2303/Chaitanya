const WebSocket = require('ws');

// Test command execution after binding the tool to the model
function testAfterToolBinding() {
    const ws = new WebSocket('ws://localhost:8000');
    
    const testCommands = [
        'execute command ls -la data',
        'run command pwd',
        'execute whoami',
        'list files in data directory'
    ];
    
    let currentTest = 0;
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
        console.log('🔄 Testing after binding commandExecutionTool to model...\n');
        runNextTest();
    });

    function runNextTest() {
        if (currentTest >= testCommands.length) {
            console.log('\n🎉 All tests completed!');
            ws.close();
            return;
        }
        
        const command = testCommands[currentTest];
        console.log(`🧪 Test ${currentTest + 1}/${testCommands.length}: "${command}"`);
        
        const message = {
            eventtype: 'websocket.stream',
            payload: {
                message: command,
                sessionId: null
            },
            clientId: 'test-tool-bound-' + Date.now()
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
                console.log('\n📋 Result:');
                
                // Analyze the response
                if (fullResponse.includes('docData.json') || 
                    fullResponse.includes('/home/sanskar/Chaitanya') ||
                    fullResponse.includes('sanskar') ||
                    fullResponse.match(/\d{4}/) || // year in date
                    fullResponse.includes('total ') ||
                    fullResponse.includes('system_prompt.json')) {
                    console.log('✅ SUCCESS: Command executed successfully!');
                } else if (fullResponse.includes('cannot execute') || 
                           fullResponse.includes('I am sorry') || 
                           fullResponse.includes('do not have access') ||
                           fullResponse.includes('I do not have')) {
                    console.log('❌ FAILED: Still denying command execution');
                } else if (fullResponse.trim().length === 0) {
                    console.log('⚠️  EMPTY: Got empty response');
                } else {
                    console.log('🤔 UNCLEAR: Response:', fullResponse.trim().substring(0, 100) + '...');
                }
                
                console.log('---\n');
                currentTest++;
                setTimeout(runNextTest, 1500);
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

console.log('🧪 Testing command execution after binding tool to model...');
testAfterToolBinding();
