import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { githubMCPManager, GITHUB_MCP_SERVERS } from '../helper/github-mcp-client';

/**
 * Enhanced MCP function that integrates external GitHub MCP servers
 * with the existing chatbot functionality
 */
export default async function enhancedMCPGitHub(ctx: GSContext, args: PlainObject) {
  try {
    const { query, operation, clientName, serverType = 'official' } = ctx.inputs?.data?.body || {};

    if (!query) {
      return new GSStatus(false, 400, 'Query is required');
    }

    // Initialize GitHub MCP client if not exists
    const client = githubMCPManager.getClient(clientName);
    
    if (!client || !client.isConnected()) {
      // Try to create a new client
      try {
        const serverConfig = GITHUB_MCP_SERVERS[serverType];
        if (!serverConfig) {
          return new GSStatus(false, 400, `Unknown GitHub MCP server type: ${serverType}`);
        }

        // Ensure GitHub token is available
        if (!process.env.GITHUB_TOKEN && !serverConfig.env?.GITHUB_PERSONAL_ACCESS_TOKEN) {
          return new GSStatus(false, 400, 'GITHUB_TOKEN environment variable is required for external MCP server');
        }

        // Set the GitHub token in the server config
        if (process.env.GITHUB_TOKEN) {
          serverConfig.env = {
            ...serverConfig.env,
            GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
            GITHUB_TOKEN: process.env.GITHUB_TOKEN,
          };
        }

        console.log(`Creating new GitHub MCP client: ${serverType}`);
        await githubMCPManager.createClient(serverType, serverConfig);
      } catch (error) {
        console.error('Failed to create GitHub MCP client:', error);
        return new GSStatus(false, 500, `Failed to connect to GitHub MCP server: ${error}`);
      }
    }

    // If operation is specified, call it directly
    if (operation) {
      return await callDirectOperation(operation, ctx.inputs?.data?.body || {});
    }

    // Otherwise, analyze the query and determine the best operation
    return await analyzeAndExecute(query, ctx.inputs?.data?.body || {});

  } catch (error) {
    console.error('Enhanced GitHub MCP error:', error);
    return new GSStatus(false, 500, `Enhanced GitHub MCP error: ${error}`);
  }
}

/**
 * Call a specific GitHub MCP operation directly
 */
async function callDirectOperation(operation: string, params: PlainObject): Promise<GSStatus> {
  try {
    const client = githubMCPManager.getClient();
    if (!client) {
      return new GSStatus(false, 500, 'No GitHub MCP client available');
    }

    // List available tools first to validate the operation
    const availableTools = await client.listTools();
    const tool = availableTools.find(t => t.name === operation);
    
    if (!tool) {
      return new GSStatus(false, 400, `Operation '${operation}' not available. Available tools: ${availableTools.map(t => t.name).join(', ')}`);
    }

    // Call the tool with the provided parameters
    const result = await client.callTool(operation, params);
    
    return new GSStatus(true, 200, 'GitHub MCP operation completed successfully', {
      operation,
      result,
      toolInfo: tool,
    });

  } catch (error) {
    console.error(`Direct operation error for ${operation}:`, error);
    return new GSStatus(false, 500, `Operation failed: ${error}`);
  }
}

/**
 * Analyze natural language query and execute appropriate GitHub operations
 */
async function analyzeAndExecute(query: string, params: PlainObject): Promise<GSStatus> {
  try {
    const client = githubMCPManager.getClient();
    if (!client) {
      return new GSStatus(false, 500, 'No GitHub MCP client available');
    }

    // Get available tools from the MCP server
    const availableTools = await client.listTools();
    
    // Natural language processing to determine the best tool
    const selectedTool = determineToolFromQuery(query, availableTools);
    
    if (!selectedTool) {
      return new GSStatus(false, 400, `Could not determine appropriate GitHub operation from query: "${query}". Available tools: ${availableTools.map(t => t.name).join(', ')}`);
    }

    // Extract parameters from the query and provided params
    const toolParams = extractParametersFromQuery(query, selectedTool, params);
    
    console.log(`Executing GitHub MCP tool: ${selectedTool.name} with params:`, toolParams);
    
    // Execute the tool
    const result = await client.callTool(selectedTool.name, toolParams);
    
    return new GSStatus(true, 200, `GitHub operation completed: ${selectedTool.name}`, {
      query,
      tool: selectedTool.name,
      parameters: toolParams,
      result,
    });

  } catch (error) {
    console.error('Query analysis and execution error:', error);
    return new GSStatus(false, 500, `Query execution failed: ${error}`);
  }
}

/**
 * Determine the best GitHub MCP tool based on natural language query
 */
function determineToolFromQuery(query: string, availableTools: any[]): any | null {
  const queryLower = query.toLowerCase();
  
  // Define query patterns and their corresponding tool mappings
  const toolPatterns = [
    // Repository operations
    { patterns: ['list repositories', 'show repos', 'get repositories', 'my repos'], toolNames: ['github_list_repositories', 'list_repositories', 'get_repositories'] },
    { patterns: ['create repository', 'new repo', 'make repository'], toolNames: ['github_create_repository', 'create_repository'] },
    { patterns: ['delete repository', 'remove repo'], toolNames: ['github_delete_repository', 'delete_repository'] },
    { patterns: ['get repository', 'show repository', 'repo info'], toolNames: ['github_get_repository', 'get_repository'] },
    
    // File operations
    { patterns: ['read file', 'get file', 'show file', 'file content'], toolNames: ['github_read_file', 'read_file', 'get_file_contents'] },
    { patterns: ['create file', 'write file', 'new file'], toolNames: ['github_create_file', 'create_file', 'write_file'] },
    { patterns: ['update file', 'edit file', 'modify file'], toolNames: ['github_update_file', 'update_file'] },
    { patterns: ['delete file', 'remove file'], toolNames: ['github_delete_file', 'delete_file'] },
    { patterns: ['list files', 'show files', 'directory'], toolNames: ['github_list_files', 'list_directory_contents'] },
    
    // Issue operations
    { patterns: ['list issues', 'show issues', 'get issues'], toolNames: ['github_list_issues', 'list_issues'] },
    { patterns: ['create issue', 'new issue', 'open issue'], toolNames: ['github_create_issue', 'create_issue'] },
    { patterns: ['get issue', 'show issue', 'issue details'], toolNames: ['github_get_issue', 'get_issue'] },
    { patterns: ['close issue', 'resolve issue'], toolNames: ['github_close_issue', 'close_issue'] },
    
    // Pull Request operations
    { patterns: ['list pull requests', 'show prs', 'get pull requests'], toolNames: ['github_list_pull_requests', 'list_pull_requests'] },
    { patterns: ['create pull request', 'new pr', 'open pull request'], toolNames: ['github_create_pull_request', 'create_pull_request'] },
    { patterns: ['get pull request', 'show pr'], toolNames: ['github_get_pull_request', 'get_pull_request'] },
    
    // User operations
    { patterns: ['user info', 'profile', 'user profile'], toolNames: ['github_get_user', 'get_user'] },
    { patterns: ['search users', 'find users'], toolNames: ['github_search_users', 'search_users'] },
    
    // Search operations
    { patterns: ['search repositories', 'find repos'], toolNames: ['github_search_repositories', 'search_repositories'] },
    { patterns: ['search code', 'find code'], toolNames: ['github_search_code', 'search_code'] },
  ];

  // Find the best matching tool
  for (const { patterns, toolNames } of toolPatterns) {
    for (const pattern of patterns) {
      if (queryLower.includes(pattern)) {
        // Find the first available tool that matches
        for (const toolName of toolNames) {
          const tool = availableTools.find(t => t.name === toolName);
          if (tool) {
            return tool;
          }
        }
      }
    }
  }

  // If no specific pattern matches, try to find tools by partial name matching
  const queryWords = queryLower.split(/\s+/);
  for (const tool of availableTools) {
    const toolNameLower = tool.name.toLowerCase();
    if (queryWords.some(word => toolNameLower.includes(word))) {
      return tool;
    }
  }

  return null;
}

/**
 * Extract parameters from query and provided params based on tool schema
 */
function extractParametersFromQuery(query: string, tool: any, providedParams: PlainObject): PlainObject {
  const params: PlainObject = { ...providedParams };
  
  // Basic parameter extraction patterns
  const extractors = [
    { pattern: /repo(?:sitory)?\s+['"]?([^'"]+)['"]?/i, param: 'repo' },
    { pattern: /owner\s+['"]?([^'"]+)['"]?/i, param: 'owner' },
    { pattern: /file\s+['"]?([^'"]+)['"]?/i, param: 'path' },
    { pattern: /path\s+['"]?([^'"]+)['"]?/i, param: 'path' },
    { pattern: /branch\s+['"]?([^'"]+)['"]?/i, param: 'branch' },
    { pattern: /issue\s+#?(\d+)/i, param: 'issue_number' },
    { pattern: /pr\s+#?(\d+)/i, param: 'pull_number' },
    { pattern: /user\s+['"]?([^'"]+)['"]?/i, param: 'username' },
  ];

  for (const { pattern, param } of extractors) {
    if (!params[param]) {
      const match = query.match(pattern);
      if (match) {
        params[param] = match[1];
      }
    }
  }

  // If repo is specified but owner is not, try to split repo into owner/name
  if (params.repo && !params.owner && typeof params.repo === 'string') {
    const repoParts = params.repo.split('/');
    if (repoParts.length === 2) {
      params.owner = repoParts[0];
      params.repo = repoParts[1];
    }
  }

  // Set default values based on tool requirements
  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties;
    
    // Set common defaults
    if (properties.per_page && !params.per_page) {
      params.per_page = 30;
    }
    
    if (properties.state && !params.state) {
      params.state = 'open';
    }
  }

  return params;
}

/**
 * List available GitHub MCP tools
 */
export async function listGitHubMCPTools(ctx: GSContext, args: PlainObject) {
  try {
    const client = githubMCPManager.getClient();
    if (!client) {
      return new GSStatus(false, 500, 'No GitHub MCP client available');
    }

    const tools = await client.listTools();
    const resources = await client.listResources();
    
    return new GSStatus(true, 200, 'GitHub MCP tools and resources retrieved', {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
      resources: resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
      })),
      clientInfo: client.getConfig(),
    });

  } catch (error) {
    console.error('Error listing GitHub MCP tools:', error);
    return new GSStatus(false, 500, `Failed to list tools: ${error}`);
  }
}

/**
 * Manage GitHub MCP client connections
 */
export async function manageGitHubMCPClient(ctx: GSContext, args: PlainObject) {
  try {
    const { action, clientName, serverType = 'official' } = ctx.inputs?.data?.body || {};

    switch (action) {
      case 'connect':
        const serverConfig = GITHUB_MCP_SERVERS[serverType];
        if (!serverConfig) {
          return new GSStatus(false, 400, `Unknown server type: ${serverType}`);
        }

        if (process.env.GITHUB_TOKEN) {
          serverConfig.env = {
            ...serverConfig.env,
            GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
            GITHUB_TOKEN: process.env.GITHUB_TOKEN,
          };
        }

        const client = await githubMCPManager.createClient(clientName || serverType, serverConfig);
        return new GSStatus(true, 200, `Connected to GitHub MCP server: ${serverType}`, {
          clientName: clientName || serverType,
          serverType,
          connected: client.isConnected(),
        });

      case 'disconnect':
        if (clientName) {
          await githubMCPManager.removeClient(clientName);
          return new GSStatus(true, 200, `Disconnected from client: ${clientName}`);
        } else {
          await githubMCPManager.disconnectAll();
          return new GSStatus(true, 200, 'Disconnected from all GitHub MCP clients');
        }

      case 'list':
        const clients = githubMCPManager.listClients();
        return new GSStatus(true, 200, 'GitHub MCP clients listed', {
          clients,
          availableServerTypes: Object.keys(GITHUB_MCP_SERVERS),
        });

      default:
        return new GSStatus(false, 400, `Unknown action: ${action}. Use: connect, disconnect, list`);
    }

  } catch (error) {
    console.error('GitHub MCP client management error:', error);
    return new GSStatus(false, 500, `Client management failed: ${error}`);
  }
}
