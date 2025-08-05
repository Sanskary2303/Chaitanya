const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:8000...');

const ws = new WebSocket('ws://localhost:8000');

ws.on('open', function open() {
  console.log('✅ WebSocket connected');
  
  // Send a test message similar to what the web client sends
  const testMessage = {
    eventtype: 'websocket.stream',
    payload: {
      message: "list my repositories",
      sessionId: "test-session-123",
      mode: "enhanced"
    },
    clientId: "test-client"
  };
  
  console.log('📤 Sending message:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Received:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('📥 Received (raw):', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('⏱️  Closing connection after 10 seconds');
  ws.close();
}, 10000);
