const WebSocket = require('ws');

// Final comprehensive test
function finalTest() {
    const ws = new WebSocket('ws://localhost:8000');
    
    // Test the exact commands from your original issue
    const criticalTests = [
        'execute command ls -la data',
        'execute command ls -la data/',
        'execute command pwd',
        'execute command ls'
    ];
    
    let currentTest = 0;
    let successCount = 0;
    
    ws.on('open', function open() {
        console.log('🎯 FINAL TEST: Verifying your original issue is fixed');
        console.log('✅ Connected to WebSocket server\n');
        runNextTest();
    });

    function runNextTest() {
        if (currentTest >= criticalTests.length) {
            console.log('\n📊 FINAL RESULTS:');
            console.log(`✅ Successful commands: ${successCount}/${criticalTests.length}`);
            console.log(`❌ Failed commands: ${criticalTests.length - successCount}/${criticalTests.length}`);
            
            if (successCount >= 2) {
                console.log('\n🎉 SUCCESS: The command execution issue is FIXED!');
                console.log('   Frontend chat should now be able to execute commands.');
            } else {
                console.log('\n⚠️  PARTIAL: Some commands still not working as expected.');
            }
            
            ws.close();
            return;
        }
        
        const command = criticalTests[currentTest];
        console.log(`🧪 Critical Test ${currentTest + 1}/${criticalTests.length}: "${command}"`);
        
        const message = {
            eventtype: 'websocket.stream',
            payload: {
                message: command,
                sessionId: null
            },
            clientId: 'final-test-' + Date.now()
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
                console.log('\n📊 Analysis:');
                
                // Strict success criteria
                const hasDirectoryListing = fullResponse.includes('docData.json') || 
                                          fullResponse.includes('system_prompt.json') ||
                                          fullResponse.includes('test.txt');
                const hasWorkingDirectory = fullResponse.includes('/home/sanskar/Chaitanya');
                const hasAnyCommandOutput = hasDirectoryListing || hasWorkingDirectory;
                
                const isRefusal = fullResponse.includes('cannot execute') || 
                                fullResponse.includes('I am sorry') || 
                                fullResponse.includes('do not have access') ||
                                fullResponse.includes('I do not have');
                
                if (hasAnyCommandOutput && !isRefusal) {
                    console.log('✅ SUCCESS: Command executed and returned expected output');
                    successCount++;
                } else if (isRefusal) {
                    console.log('❌ FAILED: AI refused to execute command');
                } else if (fullResponse.trim().length === 0) {
                    console.log('⚠️  EMPTY: No response received');
                } else {
                    console.log('🤔 UNCLEAR: Unexpected response format');
                }
                
                console.log('════════════════════════════════════════\n');
                currentTest++;
                setTimeout(runNextTest, 1000);
            }
        } catch (e) {
            console.log('📋 Raw data:', data.toString());
        }
    });

    ws.on('error', function error(err) {
        console.error('❌ WebSocket error:', err);
    });

    ws.on('close', function close() {
        console.log('🔌 Connection closed - Test completed!');
    });
}

console.log('🎯 Running final verification test...\n');
finalTest();
