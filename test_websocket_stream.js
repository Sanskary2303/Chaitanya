const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000');

ws.on('open', function open() {
  console.log('WebSocket connected to ws://localhost:8000');
  
  // Send a test message via WebSocket stream event
  const testMessage = {
    eventtype: 'websocket.stream',
    payload: {
      message: 'Hello from WebSocket test! How are you?',
      sessionId: 'test_session_websocket_123',
      mode: 'chat'
    }
  };

  console.log('Sending message:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  console.log('Received response:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

// Keep the connection open for 10 seconds to receive streaming response
setTimeout(() => {
  ws.close();
}, 10000);
