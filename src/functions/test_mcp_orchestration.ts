import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { enhancedMCPTools } from './enhanced_mcp_tools';

/**
 * Test endpoint for MCP orchestration features
 */
export default async function testMCPOrchestration(ctx: GSContext, args: PlainObject) {
  try {
    // Initialize the orchestrator
    console.log('🚀 Initializing MCP orchestrator...');
    const initResult = await enhancedMCPTools.initializeMCPOrchestrator(ctx);
    
    if (!initResult.success) {
      return new GSStatus(false, 500, 'Failed to initialize orchestrator', initResult);
    }

    // Test 1: List available servers
    console.log('📋 Listing MCP servers...');
    const serversResult = await enhancedMCPTools.listMCPServers(ctx);
    console.log('Available servers:', serversResult.data?.servers?.length || 0);

    // Test 2: Register a custom server (example)
    console.log('🔧 Registering custom test server...');
    const customServerResult = await enhancedMCPTools.registerMCPServer(ctx, {
      id: 'test-server',
      name: 'Test MCP Server',
      type: 'npx',
      config: {
        package: '@modelcontextprotocol/server-memory',
        args: []
      },
      capabilities: ['store', 'retrieve'],
      timeout: 30000
    });

    // Test 3: Create a sample multi-MCP task
    console.log('📝 Creating sample MCP task...');
    const taskResult = await enhancedMCPTools.createSampleMCPTask(ctx);
    
    if (!taskResult.success) {
      console.log('⚠️ Warning: Sample task creation failed:', taskResult.message);
    }

    // Test 4: List available tasks
    console.log('📋 Listing MCP tasks...');
    const tasksResult = await enhancedMCPTools.listMCPTasks(ctx);
    console.log('Available tasks:', tasksResult.data?.tasks?.length || 0);

    // Test 5: Try to execute a simple MCP call
    console.log('⚡ Testing direct MCP call...');
    const mcpCallResult = await enhancedMCPTools.callMCPOrchestrated(ctx, {
      serverId: 'filesystem-mcp',
      tool: 'list_directory',
      parameters: { path: '.' },
      autoInit: true
    });

    console.log('✅ MCP orchestration test completed');

    return new GSStatus(true, 200, 'MCP orchestration test completed successfully', {
      tests: {
        orchestratorInit: initResult.success,
        serversListed: serversResult.success,
        customServerRegistered: customServerResult.success,
        sampleTaskCreated: taskResult.success,
        tasksListed: tasksResult.success,
        mcpCallExecuted: mcpCallResult.success
      },
      results: {
        serversCount: serversResult.data?.servers?.length || 0,
        tasksCount: tasksResult.data?.tasks?.length || 0,
        mcpCallResult: mcpCallResult.data
      },
      details: {
        servers: serversResult.data?.servers,
        tasks: tasksResult.data?.tasks,
        lastCall: mcpCallResult.data
      }
    });

  } catch (error: any) {
    console.error('❌ MCP orchestration test failed:', error);
    return new GSStatus(false, 500, 'MCP orchestration test failed', {
      error: error.message,
      stack: error.stack
    });
  }
}
