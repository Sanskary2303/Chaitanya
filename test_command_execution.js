const WebSocket = require('ws');

async function testCommandExecution() {
  const ws = new WebSocket('ws://localhost:8000');

  ws.on('open', function open() {
    console.log('WebSocket connected');
    
    // Test command execution in streaming interface
    setTimeout(() => {
      console.log('Testing command execution...');
      const message = {
        type: 'stream',
        message: 'execute command ls -la data/',
        sessionId: 'command-test-session'
      };
      ws.send(JSON.stringify(message));
    }, 1000);

    // Close after test
    setTimeout(() => {
      ws.close();
    }, 10000);
  });

  let responseBuffer = '';

  ws.on('message', function message(data) {
    try {
      const response = JSON.parse(data.toString());
      
      if (response.eventtype === 'stream.chunk' && response.payload.message) {
        responseBuffer += response.payload.message;
      } else if (response.eventtype === 'stream.end') {
        console.log('\n=== Complete Response ===');
        console.log(responseBuffer);
        console.log('\n=== Test Complete ===');
      }
    } catch (e) {
      console.log('Raw message:', data.toString().substring(0, 100));
    }
  });

  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });

  ws.on('close', function close() {
    console.log('WebSocket disconnected');
    process.exit(0);
  });
}

testCommandExecution().catch(console.error);
