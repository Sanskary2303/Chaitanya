const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000');

ws.on('open', function open() {
  console.log('Connected to WebSocket');
  
  // Send a test message
  ws.send(JSON.stringify({
    eventtype: 'websocket.stream',
    payload: {
      message: 'Hello, this is a test message!',
      sessionId: null
    }
  }));
});

ws.on('message', function message(data) {
  console.log('Received:', JSON.parse(data.toString()));
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

// Close after 10 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 10000);
