import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MCPServerConfig {
  id: string;
  name: string;
  type: 'remote' | 'npx' | 'local' | 'ip' | 'swagger-npx';
  config: {
    // For remote servers
    url?: string;
    headers?: Record<string, string>;
    // For npx servers
    package?: string;
    args?: string[];
    // For local servers
    command?: string;
    cwd?: string;
    env?: Record<string, string>;
    // For IP-based servers
    host?: string;
    port?: number;
    protocol?: 'http' | 'https' | 'ws' | 'wss';
    auth?: {
      type: 'jwt' | 'bearer' | 'basic' | 'api-key';
      token?: string;
      username?: string;
      password?: string;
      secretKey?: string;
      keyHeader?: string; // Header name for API key (default: 'X-API-Key')
    };
    tls?: {
      enabled: boolean;
      cert?: string;
      key?: string;
      ca?: string;
      rejectUnauthorized?: boolean;
    };
    // For swagger-generated NPX modules
    swaggerSpec?: string; // URL or path to swagger spec
    swaggerOptions?: {
      generateClient?: boolean;
      clientName?: string;
      outputDir?: string;
      packageName?: string;
    };
  };
  capabilities?: string[];
  initialized?: boolean;
  process?: ChildProcess;
  timeout?: number;
}

export interface MCPTask {
  id: string;
  name: string;
  description?: string;
  servers: string[]; // Server IDs to use
  steps: MCPTaskStep[];
  parallel?: boolean; // Execute steps in parallel or sequence
  timeout?: number;
}

export interface MCPTaskStep {
  id: string;
  serverId: string;
  tool: string;
  parameters: any;
  condition?: string; // Optional condition to execute this step
  onSuccess?: MCPTaskStep[]; // Steps to execute on success
  onError?: MCPTaskStep[]; // Steps to execute on error
}

export interface MCPExecutionResult {
  taskId: string;
  success: boolean;
  results: MCPStepResult[];
  executionTime: number;
  error?: string;
}

export interface MCPStepResult {
  stepId: string;
  serverId: string;
  tool: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export class MCPOrchestrator {
  private servers: Map<string, MCPServerConfig> = new Map();
  private tasks: Map<string, MCPTask> = new Map();
  private activeConnections: Map<string, any> = new Map();

  constructor(private ctx: GSContext) {}

  /**
   * Register an MCP server configuration
   */
  async registerServer(config: MCPServerConfig): Promise<GSStatus> {
    try {
      // Validate configuration
      if (!config.id || !config.name || !config.type) {
        return new GSStatus(false, 400, 'Server configuration is incomplete');
      }

      if (config.type === 'remote' && !config.config.url) {
        return new GSStatus(false, 400, 'Remote server requires URL configuration');
      }

      if (config.type === 'npx' && !config.config.package) {
        return new GSStatus(false, 400, 'NPX server requires package configuration');
      }

      if (config.type === 'local' && !config.config.command) {
        return new GSStatus(false, 400, 'Local server requires command configuration');
      }

      if (config.type === 'ip' && (!config.config.host || !config.config.port)) {
        return new GSStatus(false, 400, 'IP server requires host and port configuration');
      }

      if (config.type === 'swagger-npx' && !config.config.swaggerSpec) {
        return new GSStatus(false, 400, 'Swagger NPX server requires swagger specification');
      }

      this.servers.set(config.id, config);
      
      this.ctx.logger.info(`MCP server registered: ${config.id} (${config.type})`);
      
      return new GSStatus(true, 200, 'MCP server registered successfully', {
        serverId: config.id,
        type: config.type
      });
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to register MCP server: ${error.message}`);
    }
  }

  /**
   * Initialize an MCP server based on its configuration
   */
  async initializeServer(serverId: string): Promise<GSStatus> {
    try {
      const server = this.servers.get(serverId);
      if (!server) {
        return new GSStatus(false, 404, `Server not found: ${serverId}`);
      }

      if (server.initialized) {
        return new GSStatus(true, 200, `Server already initialized: ${serverId}`);
      }

      let initResult: GSStatus;

      switch (server.type) {
        case 'remote':
          initResult = await this.initializeRemoteServer(server);
          break;
        case 'npx':
          initResult = await this.initializeNpxServer(server);
          break;
        case 'local':
          initResult = await this.initializeLocalServer(server);
          break;
        case 'ip':
          initResult = await this.initializeIpServer(server);
          break;
        case 'swagger-npx':
          initResult = await this.initializeSwaggerNpxServer(server);
          break;
        default:
          return new GSStatus(false, 400, `Unknown server type: ${server.type}`);
      }

      if (initResult.success) {
        server.initialized = true;
        this.servers.set(serverId, server);
      }

      return initResult;
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to initialize server: ${error.message}`);
    }
  }

  /**
   * Initialize a remote MCP server via HTTP/WebSocket
   */
  private async initializeRemoteServer(server: MCPServerConfig): Promise<GSStatus> {
    try {
      const { url, headers = {} } = server.config;
      
      // Test connection to remote server
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        return new GSStatus(false, response.status, `Remote server not accessible: ${response.statusText}`);
      }

      // Store connection info
      this.activeConnections.set(server.id, {
        type: 'remote',
        url,
        headers
      });

      this.ctx.logger.info(`Remote MCP server initialized: ${server.id} at ${url}`);
      
      return new GSStatus(true, 200, 'Remote MCP server initialized successfully', {
        serverId: server.id,
        url
      });
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to initialize remote server: ${error.message}`);
    }
  }

  /**
   * Initialize an NPX-based MCP server
   */
  private async initializeNpxServer(server: MCPServerConfig): Promise<GSStatus> {
    try {
      const { package: packageName, args = [], cwd, env } = server.config;
      
      if (!packageName) {
        return new GSStatus(false, 400, 'Package name is required for NPX server');
      }
      
      // Spawn NPX process
      const npxArgs = [packageName, ...args];
      const options: any = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...env }
      };
      
      if (cwd) options.cwd = cwd;

      const childProcess = spawn('npx', npxArgs, options);
      
      // Handle process events
      const initPromise = new Promise<GSStatus>((resolve) => {
        let stderr = '';
        let stdout = '';
        
        childProcess.stderr?.on('data', (data: any) => {
          stderr += data.toString();
        });
        
        childProcess.stdout?.on('data', (data: any) => {
          stdout += data.toString();
          // Look for initialization success indicators
          if (stdout.includes('MCP server ready') || stdout.includes('Server started')) {
            resolve(new GSStatus(true, 200, 'NPX MCP server initialized successfully'));
          }
        });
        
        childProcess.on('error', (error: any) => {
          resolve(new GSStatus(false, 500, `NPX server failed to start: ${error.message}`));
        });
        
        childProcess.on('exit', (code: any) => {
          if (code !== 0) {
            resolve(new GSStatus(false, 500, `NPX server exited with code ${code}: ${stderr}`));
          }
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          resolve(new GSStatus(false, 408, 'NPX server initialization timeout'));
        }, 30000);
      });

      const result = await initPromise;
      
      if (result.success) {
        server.process = childProcess;
        this.activeConnections.set(server.id, {
          type: 'npx',
          process: childProcess
        });
        
        this.ctx.logger.info(`NPX MCP server initialized: ${server.id} with package ${packageName}`);
      } else {
        childProcess.kill();
      }
      
      return result;
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to initialize NPX server: ${error.message}`);
    }
  }

  /**
   * Initialize a local MCP server
   */
  private async initializeLocalServer(server: MCPServerConfig): Promise<GSStatus> {
    try {
      const { command, cwd, env } = server.config;
      
      if (!command) {
        return new GSStatus(false, 400, 'Command is required for local server');
      }
      
      // Parse command and arguments
      const [cmd, ...cmdArgs] = command.split(' ');
      
      const options: any = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...env }
      };
      
      if (cwd) options.cwd = cwd;

      const childProcess = spawn(cmd, cmdArgs, options);
      
      // Handle process events similar to NPX
      const initPromise = new Promise<GSStatus>((resolve) => {
        let stderr = '';
        let stdout = '';
        
        childProcess.stderr?.on('data', (data: any) => {
          stderr += data.toString();
        });
        
        childProcess.stdout?.on('data', (data: any) => {
          stdout += data.toString();
          if (stdout.includes('MCP server ready') || stdout.includes('Server started')) {
            resolve(new GSStatus(true, 200, 'Local MCP server initialized successfully'));
          }
        });
        
        childProcess.on('error', (error: any) => {
          resolve(new GSStatus(false, 500, `Local server failed to start: ${error.message}`));
        });
        
        childProcess.on('exit', (code: any) => {
          if (code !== 0) {
            resolve(new GSStatus(false, 500, `Local server exited with code ${code}: ${stderr}`));
          }
        });
        
        setTimeout(() => {
          resolve(new GSStatus(false, 408, 'Local server initialization timeout'));
        }, 30000);
      });

      const result = await initPromise;
      
      if (result.success) {
        server.process = childProcess;
        this.activeConnections.set(server.id, {
          type: 'local',
          process: childProcess
        });
        
        this.ctx.logger.info(`Local MCP server initialized: ${server.id} with command ${command}`);
      } else {
        childProcess.kill();
      }
      
      return result;
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to initialize local server: ${error.message}`);
    }
  }

  /**
   * Initialize an IP-based MCP server with authentication
   */
  private async initializeIpServer(server: MCPServerConfig): Promise<GSStatus> {
    try {
      const { host, port, protocol = 'http', auth, tls } = server.config;
      
      if (!host || !port) {
        return new GSStatus(false, 400, 'Host and port are required for IP server');
      }

      // Build URL
      const baseUrl = `${protocol}://${host}:${port}`;
      
      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (auth) {
        switch (auth.type) {
          case 'jwt':
          case 'bearer':
            if (!auth.token) {
              return new GSStatus(false, 400, 'Token is required for JWT/Bearer authentication');
            }
            headers['Authorization'] = `Bearer ${auth.token}`;
            break;
          
          case 'basic':
            if (!auth.username || !auth.password) {
              return new GSStatus(false, 400, 'Username and password are required for Basic authentication');
            }
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
            break;
          
          case 'api-key':
            if (!auth.secretKey) {
              return new GSStatus(false, 400, 'Secret key is required for API key authentication');
            }
            const keyHeader = auth.keyHeader || 'X-API-Key';
            headers[keyHeader] = auth.secretKey;
            break;
        }
      }

      // Test connection with health check
      const healthUrl = `${baseUrl}/health`;
      
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers
      };

      // Handle TLS configuration for HTTPS
      if (protocol === 'https' && tls) {
        // Note: In a real implementation, you'd configure TLS options
        // This is a simplified version
        if (tls.rejectUnauthorized === false) {
          // In Node.js, you'd set process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
          // For security, this should be configurable and used carefully
        }
      }

      const response = await fetch(healthUrl, fetchOptions);

      if (!response.ok) {
        return new GSStatus(false, response.status, `IP server not accessible: ${response.statusText}`);
      }

      // Store connection info
      this.activeConnections.set(server.id, {
        type: 'ip',
        baseUrl,
        headers,
        auth: auth || null,
        tls: tls || null
      });

      this.ctx.logger.info(`IP MCP server initialized: ${server.id} at ${baseUrl}`);
      
      return new GSStatus(true, 200, 'IP MCP server initialized successfully', {
        serverId: server.id,
        baseUrl,
        authType: auth?.type || 'none'
      });
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to initialize IP server: ${error.message}`);
    }
  }

  /**
   * Initialize a Swagger-generated NPX MCP server
   */
  private async initializeSwaggerNpxServer(server: MCPServerConfig): Promise<GSStatus> {
    try {
      const { swaggerSpec, swaggerOptions = {}, package: packageName, args = [] } = server.config;
      
      if (!swaggerSpec) {
        return new GSStatus(false, 400, 'Swagger specification is required');
      }

      // Generate client from Swagger spec if needed
      if (swaggerOptions.generateClient) {
        const generateResult = await this.generateSwaggerClient(swaggerSpec, swaggerOptions);
        if (!generateResult.success) {
          return generateResult;
        }
      }

      // Use existing NPX initialization if package is provided
      if (packageName) {
        return await this.initializeNpxServer(server);
      }

      // If no package, try to generate and run from swagger spec
      const generatedPackage = swaggerOptions.packageName || `mcp-swagger-${server.id}`;
      const outputDir = swaggerOptions.outputDir || `./tmp/swagger-generated/${server.id}`;

      // Generate the NPX package
      const codegenResult = await this.runSwaggerCodegen(swaggerSpec, {
        ...swaggerOptions,
        packageName: generatedPackage,
        outputDir
      });

      if (!codegenResult.success) {
        return codegenResult;
      }

      // Update server config to use generated package
      server.config.package = generatedPackage;
      server.config.cwd = outputDir;

      // Initialize the generated NPX server
      return await this.initializeNpxServer(server);
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to initialize Swagger NPX server: ${error.message}`);
    }
  }

  /**
   * Generate client code from Swagger specification
   */
  private async generateSwaggerClient(swaggerSpec: string, options: any): Promise<GSStatus> {
    try {
      this.ctx.logger.info(`Generating Swagger client from: ${swaggerSpec}`);
      
      // Check if swagger-codegen is available
      const checkCodegen = spawn('which', ['swagger-codegen'], { stdio: 'pipe' });
      
      const codegenAvailable = await new Promise<boolean>((resolve) => {
        checkCodegen.on('exit', (code) => resolve(code === 0));
        checkCodegen.on('error', () => resolve(false));
      });

      if (!codegenAvailable) {
        // Try with npx swagger-codegen-cli
        this.ctx.logger.info('swagger-codegen not found, trying swagger-codegen-cli via npx');
        return await this.generateWithSwaggerCodegenCli(swaggerSpec, options);
      }

      // Use swagger-codegen if available
      const outputDir = options.outputDir || './tmp/swagger-generated';
      const clientName = options.clientName || 'typescript-node';
      
      const codegenArgs = [
        'generate',
        '-i', swaggerSpec,
        '-l', clientName,
        '-o', outputDir
      ];

      const codegenProcess = spawn('swagger-codegen', codegenArgs, { stdio: 'pipe' });
      
      const result = await new Promise<GSStatus>((resolve) => {
        let stderr = '';
        
        codegenProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        codegenProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(new GSStatus(true, 200, 'Swagger client generated successfully'));
          } else {
            resolve(new GSStatus(false, 500, `Swagger codegen failed: ${stderr}`));
          }
        });
        
        codegenProcess.on('error', (error) => {
          resolve(new GSStatus(false, 500, `Swagger codegen error: ${error.message}`));
        });
      });

      return result;
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to generate Swagger client: ${error.message}`);
    }
  }

  /**
   * Generate client using swagger-codegen-cli via NPX
   */
  private async generateWithSwaggerCodegenCli(swaggerSpec: string, options: any): Promise<GSStatus> {
    try {
      const outputDir = options.outputDir || './tmp/swagger-generated';
      const clientName = options.clientName || 'typescript-node';
      
      const npxArgs = [
        '@openapitools/openapi-generator-cli',
        'generate',
        '-i', swaggerSpec,
        '-g', clientName,
        '-o', outputDir
      ];

      const npxProcess = spawn('npx', npxArgs, { stdio: 'pipe' });
      
      const result = await new Promise<GSStatus>((resolve) => {
        let stderr = '';
        let stdout = '';
        
        npxProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        npxProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        npxProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(new GSStatus(true, 200, 'Swagger client generated successfully with openapi-generator'));
          } else {
            resolve(new GSStatus(false, 500, `OpenAPI generator failed: ${stderr}`));
          }
        });
        
        npxProcess.on('error', (error) => {
          resolve(new GSStatus(false, 500, `NPX OpenAPI generator error: ${error.message}`));
        });
      });

      return result;
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to generate with openapi-generator: ${error.message}`);
    }
  }

  /**
   * Run swagger codegen to generate MCP server package
   */
  private async runSwaggerCodegen(swaggerSpec: string, options: any): Promise<GSStatus> {
    try {
      const { packageName, outputDir } = options;
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Generate MCP server template
      const templateResult = await this.generateMCPServerTemplate(swaggerSpec, outputDir, packageName);
      if (!templateResult.success) {
        return templateResult;
      }

      // Install dependencies
      const installResult = await this.installGeneratedPackageDependencies(outputDir);
      if (!installResult.success) {
        return installResult;
      }

      return new GSStatus(true, 200, 'Swagger MCP server package generated successfully', {
        packageName,
        outputDir
      });
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to run swagger codegen: ${error.message}`);
    }
  }

  /**
   * Generate MCP server template from Swagger spec
   */
  private async generateMCPServerTemplate(swaggerSpec: string, outputDir: string, packageName: string): Promise<GSStatus> {
    try {
      // Create package.json
      const packageJson = {
        name: packageName,
        version: '1.0.0',
        description: `MCP Server generated from Swagger spec`,
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          build: 'tsc',
          dev: 'ts-node index.ts'
        },
        dependencies: {
          '@modelcontextprotocol/sdk': '^latest',
          'axios': '^1.0.0',
          'typescript': '^5.0.0',
          'ts-node': '^10.0.0'
        },
        bin: {
          [packageName]: './index.js'
        }
      };

      await fs.writeFile(
        path.join(outputDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Generate basic MCP server code
      const serverCode = this.generateMCPServerCode(swaggerSpec, packageName);
      await fs.writeFile(path.join(outputDir, 'index.ts'), serverCode);

      // Generate TypeScript config
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        },
        include: ['*.ts'],
        exclude: ['node_modules', 'dist']
      };

      await fs.writeFile(
        path.join(outputDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      return new GSStatus(true, 200, 'MCP server template generated');
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to generate MCP server template: ${error.message}`);
    }
  }

  /**
   * Generate MCP server code from Swagger specification
   */
  private generateMCPServerCode(swaggerSpec: string, packageName: string): string {
    return `#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// Swagger specification URL or path
const SWAGGER_SPEC = '${swaggerSpec}';

class SwaggerMCPServer {
  private server: Server;
  private apiSpec: any;

  constructor() {
    this.server = new Server(
      {
        name: '${packageName}',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  async initialize() {
    // Load Swagger specification
    try {
      if (SWAGGER_SPEC.startsWith('http')) {
        const response = await axios.get(SWAGGER_SPEC);
        this.apiSpec = response.data;
      } else {
        const fs = await import('fs/promises');
        const specContent = await fs.readFile(SWAGGER_SPEC, 'utf8');
        this.apiSpec = JSON.parse(specContent);
      }
    } catch (error) {
      console.error('Failed to load Swagger specification:', error);
      process.exit(1);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [];
      
      // Generate tools from Swagger paths
      if (this.apiSpec?.paths) {
        for (const [path, methods] of Object.entries(this.apiSpec.paths)) {
          for (const [method, spec] of Object.entries(methods as any)) {
            if (typeof spec === 'object' && spec.operationId) {
              tools.push({
                name: spec.operationId,
                description: spec.summary || spec.description || \`\${method.toUpperCase()} \${path}\`,
                inputSchema: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', description: 'API path' },
                    method: { type: 'string', description: 'HTTP method' },
                    parameters: { type: 'object', description: 'Request parameters' },
                    body: { type: 'object', description: 'Request body' }
                  }
                }
              });
            }
          }
        }
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Find the operation in the spec
        const operation = this.findOperation(name);
        if (!operation) {
          throw new Error(\`Operation \${name} not found in API specification\`);
        }

        // Make API call
        const result = await this.makeApiCall(operation, args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: \`Error: \${error instanceof Error ? error.message : String(error)}\`
            }
          ],
          isError: true
        };
      }
    });
  }

  private findOperation(operationId: string) {
    if (!this.apiSpec?.paths) return null;
    
    for (const [path, methods] of Object.entries(this.apiSpec.paths)) {
      for (const [method, spec] of Object.entries(methods as any)) {
        if (typeof spec === 'object' && spec.operationId === operationId) {
          return { path, method, spec };
        }
      }
    }
    return null;
  }

  private async makeApiCall(operation: any, args: any) {
    const { path, method, spec } = operation;
    const baseUrl = this.apiSpec.servers?.[0]?.url || '';
    const url = \`\${baseUrl}\${path}\`;

    const config: any = {
      method: method.toUpperCase(),
      url,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (args.parameters) {
      if (method.toLowerCase() === 'get') {
        config.params = args.parameters;
      } else {
        config.data = args.parameters;
      }
    }

    if (args.body) {
      config.data = args.body;
    }

    const response = await axios(config);
    return response.data;
  }

  async run() {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Swagger MCP Server running on stdio');
  }
}

const server = new SwaggerMCPServer();
server.run().catch(console.error);
`;
  }

  /**
   * Install dependencies for generated package
   */
  private async installGeneratedPackageDependencies(outputDir: string): Promise<GSStatus> {
    try {
      const npmInstall = spawn('npm', ['install'], {
        cwd: outputDir,
        stdio: 'pipe'
      });

      const result = await new Promise<GSStatus>((resolve) => {
        let stderr = '';
        
        npmInstall.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        npmInstall.on('exit', (code) => {
          if (code === 0) {
            resolve(new GSStatus(true, 200, 'Dependencies installed successfully'));
          } else {
            resolve(new GSStatus(false, 500, `npm install failed: ${stderr}`));
          }
        });
        
        npmInstall.on('error', (error) => {
          resolve(new GSStatus(false, 500, `npm install error: ${error.message}`));
        });
      });

      return result;
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to install dependencies: ${error.message}`);
    }
  }

  /**
   * Register a multi-MCP task
   */
  async registerTask(task: MCPTask): Promise<GSStatus> {
    try {
      // Validate task configuration
      if (!task.id || !task.name || !task.steps || task.steps.length === 0) {
        return new GSStatus(false, 400, 'Task configuration is incomplete');
      }

      // Validate that all referenced servers exist
      const allServerIds = new Set([...task.servers]);
      task.steps.forEach(step => allServerIds.add(step.serverId));
      
      for (const serverId of allServerIds) {
        if (!this.servers.has(serverId)) {
          return new GSStatus(false, 400, `Referenced server not found: ${serverId}`);
        }
      }

      this.tasks.set(task.id, task);
      
      this.ctx.logger.info(`MCP task registered: ${task.id} with ${task.steps.length} steps`);
      
      return new GSStatus(true, 200, 'MCP task registered successfully', {
        taskId: task.id,
        stepsCount: task.steps.length,
        serversCount: allServerIds.size
      });
    } catch (error: any) {
      return new GSStatus(false, 500, `Failed to register task: ${error.message}`);
    }
  }

  /**
   * Execute a registered task
   */
  async executeTask(taskId: string, parameters: any = {}): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        return {
          taskId,
          success: false,
          results: [],
          executionTime: Date.now() - startTime,
          error: `Task not found: ${taskId}`
        };
      }

      // Initialize all required servers
      for (const serverId of task.servers) {
        const initResult = await this.initializeServer(serverId);
        if (!initResult.success) {
          return {
            taskId,
            success: false,
            results: [],
            executionTime: Date.now() - startTime,
            error: `Failed to initialize server ${serverId}: ${initResult.message}`
          };
        }
      }

      // Execute steps
      const results: MCPStepResult[] = [];
      
      if (task.parallel) {
        // Execute all steps in parallel
        const stepPromises = task.steps.map(step => this.executeStep(step, parameters));
        const stepResults = await Promise.all(stepPromises);
        results.push(...stepResults);
      } else {
        // Execute steps sequentially
        for (const step of task.steps) {
          const stepResult = await this.executeStep(step, parameters);
          results.push(stepResult);
          
          // Handle conditional execution and error handling
          if (!stepResult.success && step.onError) {
            for (const errorStep of step.onError) {
              const errorStepResult = await this.executeStep(errorStep, parameters);
              results.push(errorStepResult);
            }
          } else if (stepResult.success && step.onSuccess) {
            for (const successStep of step.onSuccess) {
              const successStepResult = await this.executeStep(successStep, parameters);
              results.push(successStepResult);
            }
          }
        }
      }

      const success = results.every(result => result.success);
      
      return {
        taskId,
        success,
        results,
        executionTime: Date.now() - startTime,
        error: success ? undefined : 'One or more steps failed'
      };
    } catch (error: any) {
      return {
        taskId,
        success: false,
        results: [],
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Execute a single task step
   */
  private async executeStep(step: MCPTaskStep, globalParameters: any): Promise<MCPStepResult> {
    const startTime = Date.now();
    
    try {
      const server = this.servers.get(step.serverId);
      if (!server) {
        return {
          stepId: step.id,
          serverId: step.serverId,
          tool: step.tool,
          success: false,
          error: `Server not found: ${step.serverId}`,
          executionTime: Date.now() - startTime
        };
      }

      const connection = this.activeConnections.get(step.serverId);
      if (!connection) {
        return {
          stepId: step.id,
          serverId: step.serverId,
          tool: step.tool,
          success: false,
          error: `Server not connected: ${step.serverId}`,
          executionTime: Date.now() - startTime
        };
      }

      // Merge step parameters with global parameters
      const mergedParameters = { ...globalParameters, ...step.parameters };

      // Execute the tool call based on server type
      let result: any;
      
      switch (connection.type) {
        case 'remote':
          result = await this.callRemoteTool(connection, step.tool, mergedParameters);
          break;
        case 'npx':
        case 'local':
          result = await this.callLocalTool(connection, step.tool, mergedParameters);
          break;
        default:
          throw new Error(`Unknown connection type: ${connection.type}`);
      }

      return {
        stepId: step.id,
        serverId: step.serverId,
        tool: step.tool,
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        stepId: step.id,
        serverId: step.serverId,
        tool: step.tool,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Call a tool on a remote MCP server
   */
  private async callRemoteTool(connection: any, tool: string, parameters: any): Promise<any> {
    const response = await fetch(`${connection.url}/tools/${tool}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...connection.headers
      },
      body: JSON.stringify(parameters)
    });

    if (!response.ok) {
      throw new Error(`Remote tool call failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Call a tool on a local/NPX MCP server via stdio
   */
  private async callLocalTool(connection: any, tool: string, parameters: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = {
        id: Date.now().toString(),
        method: tool,
        params: parameters
      };

      const process = connection.process;
      let responseData = '';

      // Send request
      process.stdin?.write(JSON.stringify(request) + '\n');

      // Listen for response
      const onData = (data: Buffer) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData);
          if (response.id === request.id) {
            process.stdout?.off('data', onData);
            if (response.error) {
              reject(new Error(response.error.message || 'Tool call failed'));
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      process.stdout?.on('data', onData);

      // Timeout after 30 seconds
      setTimeout(() => {
        process.stdout?.off('data', onData);
        reject(new Error('Tool call timeout'));
      }, 30000);
    });
  }

  /**
   * Shutdown all active connections
   */
  async shutdown(): Promise<void> {
    for (const [serverId, connection] of this.activeConnections) {
      try {
        if (connection.process) {
          connection.process.kill();
        }
        this.ctx.logger.info(`Shutdown MCP server: ${serverId}`);
      } catch (error) {
        this.ctx.logger.error(`Failed to shutdown server ${serverId}:`, error);
      }
    }
    
    this.activeConnections.clear();
    
    // Mark all servers as not initialized
    for (const [serverId, server] of this.servers) {
      server.initialized = false;
      this.servers.set(serverId, server);
    }
  }

  /**
   * Get list of registered servers
   */
  getServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get list of registered tasks
   */
  getTasks(): MCPTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): { initialized: boolean; connected: boolean } {
    const server = this.servers.get(serverId);
    const connection = this.activeConnections.get(serverId);
    
    return {
      initialized: server?.initialized || false,
      connected: !!connection
    };
  }
}
