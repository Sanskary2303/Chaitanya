import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { MCPOrchestrator, MCPServerConfig, MCPTask, MCPExecutionResult } from '../helper/mcp-orchestrator';

// Global orchestrator instance
let orchestrator: MCPOrchestrator | null = null;

/**
 * Initialize the MCP orchestrator
 */
export async function initializeMCPOrchestrator(ctx: GSContext): Promise<GSStatus> {
  try {
    if (orchestrator) {
      return new GSStatus(true, 200, 'MCP orchestrator already initialized');
    }

    orchestrator = new MCPOrchestrator(ctx);
    
    // Load default server configurations
    await loadDefaultServerConfigurations(ctx);
    
    ctx.logger.info('MCP orchestrator initialized successfully');
    
    return new GSStatus(true, 200, 'MCP orchestrator initialized successfully');
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to initialize MCP orchestrator: ${error.message}`);
  }
}

/**
 * Get or create orchestrator instance
 */
function getOrchestrator(ctx: GSContext): MCPOrchestrator {
  if (!orchestrator) {
    orchestrator = new MCPOrchestrator(ctx);
  }
  return orchestrator;
}

/**
 * Register an MCP server
 */
export async function registerMCPServer(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const serverConfig: MCPServerConfig = args as MCPServerConfig;
    
    return await orch.registerServer(serverConfig);
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to register MCP server: ${error.message}`);
  }
}

/**
 * Register a multi-MCP task
 */
export async function registerMCPTask(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const task: MCPTask = args as MCPTask;
    
    return await orch.registerTask(task);
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to register MCP task: ${error.message}`);
  }
}

/**
 * Execute a multi-MCP task
 */
export async function executeMCPTask(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const { taskId, parameters = {} } = args;
    
    if (!taskId) {
      return new GSStatus(false, 400, 'Task ID is required');
    }
    
    const result: MCPExecutionResult = await orch.executeTask(taskId, parameters);
    
    return new GSStatus(result.success, result.success ? 200 : 500, 
      result.success ? 'Task executed successfully' : 'Task execution failed', result);
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to execute MCP task: ${error.message}`);
  }
}

/**
 * List registered MCP servers
 */
export async function listMCPServers(ctx: GSContext): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const servers = orch.getServers();
    
    return new GSStatus(true, 200, 'MCP servers retrieved successfully', {
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        type: server.type,
        initialized: server.initialized,
        status: orch.getServerStatus(server.id)
      }))
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to list MCP servers: ${error.message}`);
  }
}

/**
 * List registered MCP tasks
 */
export async function listMCPTasks(ctx: GSContext): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const tasks = orch.getTasks();
    
    return new GSStatus(true, 200, 'MCP tasks retrieved successfully', {
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        serversCount: task.servers.length,
        stepsCount: task.steps.length,
        parallel: task.parallel
      }))
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to list MCP tasks: ${error.message}`);
  }
}

/**
 * Initialize an MCP server
 */
export async function initializeMCPServer(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const { serverId } = args;
    
    if (!serverId) {
      return new GSStatus(false, 400, 'Server ID is required');
    }
    
    return await orch.initializeServer(serverId);
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to initialize MCP server: ${error.message}`);
  }
}

/**
 * Load default server configurations
 */
async function loadDefaultServerConfigurations(ctx: GSContext): Promise<void> {
  const orch = getOrchestrator(ctx);
  
  // GitHub MCP Server (NPX)
  await orch.registerServer({
    id: 'github-mcp',
    name: 'GitHub MCP Server',
    type: 'npx',
    config: {
      package: '@modelcontextprotocol/server-github',
      args: [],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || ''
      }
    },
    capabilities: ['repositories', 'issues', 'pull_requests', 'commits'],
    timeout: 30000
  });

  // File System MCP Server (NPX)
  await orch.registerServer({
    id: 'filesystem-mcp',
    name: 'File System MCP Server',
    type: 'npx',
    config: {
      package: '@modelcontextprotocol/server-filesystem',
      args: [process.cwd()], // Allow access to current directory
    },
    capabilities: ['read_file', 'write_file', 'list_directory', 'create_directory'],
    timeout: 30000
  });

  // Memory MCP Server (NPX)
  await orch.registerServer({
    id: 'memory-mcp',
    name: 'Memory MCP Server',
    type: 'npx',
    config: {
      package: '@modelcontextprotocol/server-memory',
      args: []
    },
    capabilities: ['store', 'retrieve', 'search'],
    timeout: 30000
  });

  // SQLite MCP Server (NPX)
  await orch.registerServer({
    id: 'sqlite-mcp',
    name: 'SQLite MCP Server',
    type: 'npx',
    config: {
      package: '@modelcontextprotocol/server-sqlite',
      args: [process.env.DATABASE_PATH || './data/app.db']
    },
    capabilities: ['query', 'execute', 'schema'],
    timeout: 30000
  });

  // Example IP-based MCP Server with JWT authentication
  if (process.env.MCP_IP_SERVER_HOST && process.env.MCP_IP_SERVER_PORT) {
    await orch.registerServer({
      id: 'api-mcp-jwt',
      name: 'External API MCP Server (JWT)',
      type: 'ip',
      config: {
        host: process.env.MCP_IP_SERVER_HOST,
        port: parseInt(process.env.MCP_IP_SERVER_PORT),
        protocol: 'https',
        auth: {
          type: 'jwt',
          token: process.env.MCP_JWT_TOKEN || ''
        },
        tls: {
          enabled: true,
          rejectUnauthorized: true
        }
      },
      capabilities: ['external_api_access'],
      timeout: 45000
    });
  }

  // Example IP-based MCP Server with API Key authentication
  if (process.env.MCP_API_SERVER_HOST && process.env.MCP_API_KEY) {
    await orch.registerServer({
      id: 'api-mcp-key',
      name: 'External API MCP Server (API Key)',
      type: 'ip',
      config: {
        host: process.env.MCP_API_SERVER_HOST,
        port: parseInt(process.env.MCP_API_SERVER_PORT || '443'),
        protocol: 'https',
        auth: {
          type: 'api-key',
          secretKey: process.env.MCP_API_KEY,
          keyHeader: 'X-API-Key'
        }
      },
      capabilities: ['external_api_access'],
      timeout: 30000
    });
  }

  // Example Swagger-generated MCP Server
  if (process.env.SWAGGER_SPEC_URL) {
    await orch.registerServer({
      id: 'swagger-generated-mcp',
      name: 'Swagger Generated MCP Server',
      type: 'swagger-npx',
      config: {
        swaggerSpec: process.env.SWAGGER_SPEC_URL,
        swaggerOptions: {
          generateClient: true,
          clientName: 'typescript-node',
          outputDir: './tmp/swagger-mcp',
          packageName: 'mcp-swagger-api'
        }
      },
      capabilities: ['auto_generated_from_swagger'],
      timeout: 60000
    });
  }

  ctx.logger.info('Default MCP server configurations loaded');
}

/**
 * Create a comprehensive task that demonstrates multi-MCP orchestration
 */
export async function createSampleMCPTask(ctx: GSContext): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    
    // Create a task that uses multiple MCP servers
    const task: MCPTask = {
      id: 'comprehensive-analysis',
      name: 'Comprehensive Project Analysis',
      description: 'Analyze project files, check GitHub status, and store results in memory',
      servers: ['filesystem-mcp', 'github-mcp', 'memory-mcp'],
      parallel: false,
      steps: [
        {
          id: 'list-project-files',
          serverId: 'filesystem-mcp',
          tool: 'list_directory',
          parameters: {
            path: '.'
          }
        },
        {
          id: 'read-package-json',
          serverId: 'filesystem-mcp',
          tool: 'read_file',
          parameters: {
            path: './package.json'
          }
        },
        {
          id: 'get-github-repos',
          serverId: 'github-mcp',
          tool: 'list_repositories',
          parameters: {}
        },
        {
          id: 'store-analysis',
          serverId: 'memory-mcp',
          tool: 'store',
          parameters: {
            key: 'project-analysis',
            value: {
              timestamp: new Date().toISOString(),
              analysis: 'Combined project and GitHub analysis'
            }
          }
        }
      ],
      timeout: 60000
    };
    
    const result = await orch.registerTask(task);
    
    if (result.success) {
      ctx.logger.info('Sample MCP task created successfully');
    }
    
    return result;
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to create sample MCP task: ${error.message}`);
  }
}

/**
 * Enhanced callMCP function that supports orchestration
 */
export async function callMCPOrchestrated(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    const orch = getOrchestrator(ctx);
    const { serverId, tool, parameters = {}, autoInit = true } = args;
    
    if (!serverId || !tool) {
      return new GSStatus(false, 400, 'Server ID and tool are required');
    }
    
    // Auto-initialize server if requested
    if (autoInit) {
      const initResult = await orch.initializeServer(serverId);
      if (!initResult.success) {
        return initResult;
      }
    }
    
    // Create a simple single-step task
    const taskId = `single-call-${Date.now()}`;
    const task: MCPTask = {
      id: taskId,
      name: `Single MCP Call: ${serverId}/${tool}`,
      servers: [serverId],
      steps: [
        {
          id: 'single-step',
          serverId,
          tool,
          parameters
        }
      ],
      parallel: false,
      timeout: 30000
    };
    
    // Register and execute the task
    const registerResult = await orch.registerTask(task);
    if (!registerResult.success) {
      return registerResult;
    }
    
    const executionResult = await orch.executeTask(taskId, {});
    
    if (executionResult.success && executionResult.results.length > 0) {
      const stepResult = executionResult.results[0];
      return new GSStatus(true, 200, 'MCP call completed successfully', {
        serverId,
        tool,
        parameters,
        result: stepResult.data,
        executionTime: stepResult.executionTime
      });
    } else {
      return new GSStatus(false, 500, 'MCP call failed', {
        serverId,
        tool,
        error: executionResult.error || 'Unknown error'
      });
    }
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to call MCP: ${error.message}`);
  }
}

/**
 * Shutdown MCP orchestrator
 */
export async function shutdownMCPOrchestrator(ctx: GSContext): Promise<GSStatus> {
  try {
    if (orchestrator) {
      await orchestrator.shutdown();
      orchestrator = null;
      ctx.logger.info('MCP orchestrator shutdown successfully');
    }
    
    return new GSStatus(true, 200, 'MCP orchestrator shutdown successfully');
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to shutdown MCP orchestrator: ${error.message}`);
  }
}

// Export all enhanced MCP tools
export const enhancedMCPTools = {
  initializeMCPOrchestrator,
  registerMCPServer,
  registerMCPTask,
  executeMCPTask,
  listMCPServers,
  listMCPTasks,
  initializeMCPServer,
  createSampleMCPTask,
  callMCPOrchestrated,
  shutdownMCPOrchestrator
};
