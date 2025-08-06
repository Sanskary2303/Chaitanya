const WebSocket = require('ws');
const commandRephraser = require('./command_rephraser');

// Test the rephrased commands
function testRephrasedCommands() {
    const ws = new WebSocket('ws://localhost:8000');
    
    const originalCommands = [
        'execute command ls -la data',
        'run command pwd',
        'execute whoami',
        'run command date'
    ];
    
    let currentTest = 0;
    
    ws.on('open', function open() {
        console.log('✅ Connected to WebSocket server');
        console.log('🔄 Testing rephrased commands...\n');
        runNextTest();
    });

    function runNextTest() {
        if (currentTest >= originalCommands.length) {
            console.log('\n🎉 All tests completed!');
            ws.close();
            return;
        }
        
        const originalCommand = originalCommands[currentTest];
        const rephrasedCommand = commandRephraser.rephrase(originalCommand);
        
        console.log(`🧪 Test ${currentTest + 1}/${originalCommands.length}:`);
        console.log(`   Original: "${originalCommand}"`);
        console.log(`   Rephrased: "${rephrasedCommand}"`);
        
        const message = {
            eventtype: 'websocket.stream',
            payload: {
                message: rephrasedCommand,
                sessionId: null
            },
            clientId: 'test-rephrased-' + Date.now()
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
                    fullResponse.includes('total ')) {
                    console.log('✅ SUCCESS: Command executed successfully!');
                } else if (fullResponse.includes('cannot execute') || 
                           fullResponse.includes('I am sorry') || 
                           fullResponse.includes('do not have access')) {
                    console.log('❌ FAILED: Still denying command execution');
                } else if (fullResponse.trim().length === 0) {
                    console.log('⚠️  EMPTY: Got empty response');
                } else {
                    console.log('🤔 UNCLEAR: Response:', fullResponse.trim().substring(0, 80) + '...');
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

console.log('🧪 Testing rephrased command execution...');
testRephrasedCommands();
