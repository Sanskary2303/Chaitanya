const WebSocket = require('ws');

// Test the streaming function tools via WebSocket
async function testStreamingTools() {
  const ws = new WebSocket('ws://localhost:8000');

  ws.on('open', function open() {
    console.log('WebSocket connected');
    
    // Test 1: File reading
    console.log('\n=== Testing File Operations ===');
    const fileReadMessage = {
      type: 'stream',
      message: 'Please read the file tmp/stream-test.txt',
      sessionId: 'streaming-test-session'
    };
    
    setTimeout(() => {
      console.log('Sending file read request...');
      ws.send(JSON.stringify(fileReadMessage));
    }, 1000);

    // Test 2: GitHub operations
    setTimeout(() => {
      console.log('\n=== Testing GitHub Operations ===');
      const githubMessage = {
        type: 'stream',
        message: 'Show me my GitHub profile information',
        sessionId: 'streaming-test-session'
      };
      console.log('Sending GitHub request...');
      ws.send(JSON.stringify(githubMessage));
    }, 5000);

    // Test 3: RAG query
    setTimeout(() => {
      console.log('\n=== Testing RAG Operations ===');
      const ragMessage = {
        type: 'stream',
        message: 'What information do you have about ROS Master setup?',
        sessionId: 'streaming-test-session'
      };
      console.log('Sending RAG request...');
      ws.send(JSON.stringify(ragMessage));
    }, 10000);

    // Close after tests
    setTimeout(() => {
      console.log('\n=== Tests completed ===');
      ws.close();
    }, 15000);
  });

  ws.on('message', function message(data) {
    try {
      const response = JSON.parse(data.toString());
      console.log('\n--- Received response ---');
      console.log('Type:', response.type);
      if (response.content) {
        console.log('Content:', response.content.substring(0, 200) + (response.content.length > 200 ? '...' : ''));
      }
      if (response.error) {
        console.log('Error:', response.error);
      }
    } catch (e) {
      console.log('Raw message:', data.toString().substring(0, 200));
    }
  });

  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });

  ws.on('close', function close() {
    console.log('WebSocket disconnected');
  });
}

testStreamingTools().catch(console.error);
