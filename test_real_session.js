const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000?clientId=test-db-session-' + Date.now());

ws.on('open', function open() {
  console.log('Connected to WebSocket');
  console.log('Sending message with real sessionId:');
  
  const messageData = {
    eventtype: 'websocket.stream',
    payload: {
      message: 'Hello with real sessionId - testing DB',
      sessionId: 'cmdczk6re0007m66cwsx7ul78' // Use the new session ID
    }
  };
  
  console.log(JSON.stringify(messageData, null, 2));
  ws.send(JSON.stringify(messageData));
});

ws.on('message', function incoming(data) {
  console.log('Received:', JSON.parse(data.toString()));
});

ws.on('close', function close() {
  console.log('Closing connection');
});

// Close after 8 seconds
setTimeout(() => {
  ws.close();
}, 8000);
