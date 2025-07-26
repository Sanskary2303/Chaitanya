const WebSocket = require('ws');

const sessionId = 'cmdczwrk10001m6a8nsu8g7cj'; // From the session we just created
const ws = new WebSocket('ws://localhost:8000');

ws.on('open', function open() {
  console.log('Connected to WebSocket');
  
  // Send a message with correct format
  const message = JSON.stringify({
    eventtype: 'websocket.stream',
    payload: {
      sessionId: sessionId,
      message: 'Testing final database connectivity!'
    }
  });
  
  console.log('Sending message:', message);
  ws.send(message);
});

ws.on('message', function message(data) {
  try {
    const parsedData = JSON.parse(data);
    console.log('Received:', parsedData);
  } catch (e) {
    console.log('Raw data:', data.toString());
  }
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

// Close connection after 15 seconds
setTimeout(() => {
  ws.close();
}, 15000);
