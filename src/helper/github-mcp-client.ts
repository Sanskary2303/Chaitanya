import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { EventEmitter } from 'events';

/**
 * GitHub MCP Client for connecting to external GitHub MCP servers
 * Supports multiple GitHub MCP server implementations
 */
export class GitHubMCPClient extends EventEmitter {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;
  private serverConfig: GitHubMCPServerConfig;

  constructor(config: GitHubMCPServerConfig) {
    super();
    this.serverConfig = config;
  }

  /**
   * Connect to the GitHub MCP server
   */
  async connect(): Promise<void> {
    try {
      // Use the configuration from serverConfig
      const command = this.serverConfig.command;
      const args = this.serverConfig.args;

      // Create stdio transport with proper environment variables
      this.transport = new StdioClientTransport({
        command: command,
        args: args,
        env: {
          ...process.env,
          PATH: process.env.PATH || '',
          NODE_PATH: '/home/sanskar/.nvm/versions/node/v18.20.4/lib/node_modules',
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
          ...this.serverConfig.env || {}
        }
      });

      this.client = new Client({
        name: 'rag-node-github-client',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {},
          resources: {},
        },
      });

      // Connect the client (this automatically starts the transport)
      await this.client.connect(this.transport);
      this.connected = true;
      this.emit('connect');

      console.log('Successfully connected to GitHub MCP server');
    } catch (error) {
      console.error('Failed to connect to GitHub MCP server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the GitHub MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      this.connected = false;
      this.emit('disconnect');
    } catch (error) {
      console.error('Error disconnecting from GitHub MCP server:', error);
      throw error;
    }
  }

  /**
   * List available tools from the GitHub MCP server
   */
  async listTools(): Promise<any[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to GitHub MCP server');
    }

    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error('Error listing GitHub MCP tools:', error);
      throw error;
    }
  }

  /**
   * Call a tool on the GitHub MCP server
   */
  async callTool(toolName: string, arguments_: Record<string, any>): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to GitHub MCP server');
    }

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: arguments_,
      });

      return response;
    } catch (error) {
      console.error(`Error calling GitHub MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * List available resources from the GitHub MCP server
   */
  async listResources(): Promise<any[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to GitHub MCP server');
    }

    try {
      const response = await this.client.listResources();
      return response.resources || [];
    } catch (error) {
      console.error('Error listing GitHub MCP resources:', error);
      throw error;
    }
  }

  /**
   * Read a resource from the GitHub MCP server
   */
  async readResource(uri: string): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to GitHub MCP server');
    }

    try {
      const response = await this.client.readResource({ uri });
      return response;
    } catch (error) {
      console.error(`Error reading GitHub MCP resource ${uri}:`, error);
      throw error;
    }
  }

  /**
   * Check if connected to the GitHub MCP server
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get server configuration
   */
  getConfig(): GitHubMCPServerConfig {
    return { ...this.serverConfig };
  }
}

/**
 * Configuration for GitHub MCP server
 */
export interface GitHubMCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Predefined GitHub MCP server configurations
 */
export const GITHUB_MCP_SERVERS: Record<string, GitHubMCPServerConfig> = {
  // Official GitHub MCP server
  official: {
    name: 'github-mcp-official',
    command: '/home/sanskar/.nvm/versions/node/v22.17.1/bin/npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || '',
      PATH: `/home/sanskar/.nvm/versions/node/v22.17.1/bin:${process.env.PATH}`,
      NODE_PATH: '/home/sanskar/.nvm/versions/node/v22.17.1/lib/node_modules',
    },
  },

  // Custom GitHub MCP server (if you have one installed locally)
  custom: {
    name: 'github-mcp-custom',
    command: 'node',
    args: ['path/to/your/github-mcp-server.js'],
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    },
  },

  // Python-based GitHub MCP server
  python: {
    name: 'github-mcp-python',
    command: 'python',
    args: ['-m', 'mcp_server_github'],
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    },
  },
};

/**
 * GitHub MCP Client Manager
 * Manages multiple GitHub MCP client connections
 */
export class GitHubMCPClientManager {
  private clients: Map<string, GitHubMCPClient> = new Map();
  private defaultClientName: string | null = null;

  /**
   * Create and connect to a GitHub MCP server
   */
  async createClient(name: string, config: GitHubMCPServerConfig): Promise<GitHubMCPClient> {
    if (this.clients.has(name)) {
      throw new Error(`GitHub MCP client '${name}' already exists`);
    }

    const client = new GitHubMCPClient(config);
    
    try {
      await client.connect();
      this.clients.set(name, client);
      
      if (!this.defaultClientName) {
        this.defaultClientName = name;
      }

      return client;
    } catch (error) {
      console.error(`Failed to create GitHub MCP client '${name}':`, error);
      throw error;
    }
  }

  /**
   * Get a GitHub MCP client by name
   */
  getClient(name?: string): GitHubMCPClient | null {
    const clientName = name || this.defaultClientName;
    if (!clientName) return null;
    
    return this.clients.get(clientName) || null;
  }

  /**
   * Remove and disconnect a GitHub MCP client
   */
  async removeClient(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) return;

    try {
      await client.disconnect();
      this.clients.delete(name);
      
      if (this.defaultClientName === name) {
        this.defaultClientName = this.clients.size > 0 ? Array.from(this.clients.keys())[0] : null;
      }
    } catch (error) {
      console.error(`Error removing GitHub MCP client '${name}':`, error);
      throw error;
    }
  }

  /**
   * List all connected GitHub MCP clients
   */
  listClients(): Array<{ name: string; connected: boolean; config: GitHubMCPServerConfig }> {
    return Array.from(this.clients.entries()).map(([name, client]) => ({
      name,
      connected: client.isConnected(),
      config: client.getConfig(),
    }));
  }

  /**
   * Disconnect all GitHub MCP clients
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map(client => 
      client.disconnect().catch(console.error)
    );
    
    await Promise.all(disconnectPromises);
    this.clients.clear();
    this.defaultClientName = null;
  }

  /**
   * Call a tool on the default or specified GitHub MCP client
   */
  async callTool(toolName: string, arguments_: Record<string, any>, clientName?: string): Promise<any> {
    const client = this.getClient(clientName);
    if (!client) {
      throw new Error(`No GitHub MCP client available${clientName ? ` with name '${clientName}'` : ''}`);
    }

    return client.callTool(toolName, arguments_);
  }

  /**
   * List tools from the default or specified GitHub MCP client
   */
  async listTools(clientName?: string): Promise<any[]> {
    const client = this.getClient(clientName);
    if (!client) {
      throw new Error(`No GitHub MCP client available${clientName ? ` with name '${clientName}'` : ''}`);
    }

    return client.listTools();
  }
}

// Global GitHub MCP client manager instance
export const githubMCPManager = new GitHubMCPClientManager();
