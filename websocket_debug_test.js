const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000?clientId=debug-test-' + Date.now());

ws.on('open', function open() {
  console.log('Connected to WebSocket');
  
  // Send exactly what the web client sends
  const message = {
    eventtype: 'websocket.stream',
    payload: {
      message: 'Hello test message',
      sessionId: 'debug-session-' + Date.now()
    }
  };
  
  console.log('Sending message:', JSON.stringify(message, null, 2));
  ws.send(JSON.stringify(message));
  
  // Close after 5 seconds
  setTimeout(() => {
    console.log('Closing connection');
    ws.close();
    process.exit(0);
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('Connection closed');
  process.exit(0);
});
