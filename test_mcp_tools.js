const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000');

ws.on('open', function open() {
  console.log('WebSocket connected for MCP testing');
  
  // Test 1: MCP Read File
  console.log('\n--- Testing MCP Read File ---');
  const readFileMessage = {
    eventtype: 'mcp.read-file',
    payload: {
      filePath: 'package.json'
    }
  };

  console.log('Sending read file request:', JSON.stringify(readFileMessage, null, 2));
  ws.send(JSON.stringify(readFileMessage));
  
  // Test 2: MCP List Directory (after a delay)
  setTimeout(() => {
    console.log('\n--- Testing MCP List Directory ---');
    const listDirMessage = {
      eventtype: 'mcp.list-directory',
      payload: {
        dirPath: '.',
        includeHidden: false
      }
    };
    
    console.log('Sending list directory request:', JSON.stringify(listDirMessage, null, 2));
    ws.send(JSON.stringify(listDirMessage));
  }, 2000);
  
  // Test 3: MCP Execute Command (after another delay)
  setTimeout(() => {
    console.log('\n--- Testing MCP Execute Command ---');
    const executeMessage = {
      eventtype: 'mcp.execute-command',
      payload: {
        command: 'pwd'
      }
    };
    
    console.log('Sending execute command request:', JSON.stringify(executeMessage, null, 2));
    ws.send(JSON.stringify(executeMessage));
  }, 4000);
  
  // Test 4: MCP Switch Mode (after another delay)
  setTimeout(() => {
    console.log('\n--- Testing MCP Switch Mode ---');
    const switchModeMessage = {
      eventtype: 'mcp.switch-mode',
      payload: {
        mode: 'development'
      }
    };
    
    console.log('Sending switch mode request:', JSON.stringify(switchModeMessage, null, 2));
    ws.send(JSON.stringify(switchModeMessage));
  }, 6000);
  
  // Close connection after all tests
  setTimeout(() => {
    ws.close();
  }, 8000);
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
