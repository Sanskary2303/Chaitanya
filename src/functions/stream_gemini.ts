import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END, MemorySaver, Annotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RAGPipeline } from '../helper/mcpRag';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getPrompts } from '../helper/prompts';
import { memorySaver } from '../helper/memory';

export default async function stream_gemini(ctx: GSContext): Promise<GSStatus> {
  const { ws, clientId, payload } = ctx.inputs.data;
  const prisma: GSDataSource = ctx.datasources.chatbot;

  // Add debug logging to see what we're receiving
  if (!ws || ws.readyState !== ws.OPEN) {
    ctx.logger.error(`WebSocket not connected: ${clientId}`);
    return new GSStatus(false, 400, 'WebSocket disconnected');
  }

  // Create or get chat session
  let sessionId = payload.sessionId;
  
  if (!sessionId) {
    // Create new session when sessionId is null
    try {
      const session = await prisma.execute(ctx, {
        meta: {
          entityType: 'ChatSession',
          method: 'create'
        },
        data: {
          title: 'New Chat Session',
          metadata: { clientId }
        }
      });
      sessionId = session.data.id;
      ctx.logger.info(`Created new session: ${sessionId}`);
    } catch (error) {
      ctx.logger.error('Failed to create session:', error);
      // Don't save messages if we can't create a session
      ws.send(JSON.stringify({
        eventtype: 'error',
        payload: { message: 'Failed to create chat session' }
      }));
      return new GSStatus(false, 500, 'Failed to create chat session');
    }
  } else {
    // Verify existing session exists
    try {
      const existingSession = await prisma.execute(ctx, {
        meta: {
          entityType: 'ChatSession',
          method: 'findUnique'
        },
        where: { id: sessionId }
      });
      
      if (!existingSession.data) {
        ctx.logger.error(`Session ${sessionId} not found, creating new one`);
        const session = await prisma.execute(ctx, {
          meta: {
            entityType: 'ChatSession',
            method: 'create'
          },
          data: {
            title: 'New Chat Session',
            metadata: { clientId }
          }
        });
        sessionId = session.data.id;
        ctx.logger.info(`Created replacement session: ${sessionId}`);
      }
    } catch (error) {
      ctx.logger.error('Error checking/creating session:', error);
      // Don't save messages if we can't verify/create session
      ws.send(JSON.stringify({
        eventtype: 'error',
        payload: { message: 'Session error' }
      }));
      return new GSStatus(false, 500, 'Session error');
    }
  }

  // Save user message
  try {
    const userMessage = await prisma.execute(ctx, {
      meta: {
        entityType: 'Message',
        method: 'create'
      },
      data: {
        sessionId,
        role: 'USER',
        content: payload.message,
        metadata: { timestamp: new Date().toISOString() }
      }
    });
    ctx.logger.info(`Saved user message: ${userMessage.data.id}`);
  } catch (error) {
    ctx.logger.error('Failed to save user message:', error);
    ctx.logger.error('SessionId was:', sessionId);
    // Continue processing even if message save fails
  }

  // STEP 1: Load VectorStore + Create RAG Tool

  const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
    systemPrompt: Annotation<string>({
      reducer: (x, y) => y ?? x, 
      default: () => '',
    }),
  });
  
  const ragTool = tool(
    async (input) => {
      const rag = new RAGPipeline()
      const result = await rag.run(input.query);
      return result;
    },
    {
      name: 'get_relevant_docs',
      description: 'Call to get revelant documents from user query.',
      schema: z.object({
        query: z.string().describe('User query to get relevant docs.'),
      }),
    },
  );

  // Enhanced GitHub MCP Tool for reading, writing, and GitHub operations
  const enhancedGithubTool = tool(
    async (input) => {
      try {
        // Import the GitHub MCP manager and server configs
        const { githubMCPManager, GITHUB_MCP_SERVERS } = await import('../helper/github-mcp-client');
        
        // Check if we have a connected client, if not, try to create one
        let client = githubMCPManager.getClient();
        
        if (!client || !client.isConnected()) {
          try {
            ctx.logger.info('GitHub MCP client not connected, attempting to initialize...');
            
            // Try to connect to the official GitHub MCP server
            const serverConfig = GITHUB_MCP_SERVERS['official'];
            if (serverConfig && process.env.GITHUB_TOKEN) {
              serverConfig.env = {
                ...serverConfig.env,
                GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
                GITHUB_TOKEN: process.env.GITHUB_TOKEN,
              };
              
              client = await githubMCPManager.createClient('official', serverConfig);
              ctx.logger.info('Successfully initialized GitHub MCP client');
            } else {
              return 'Error: GitHub MCP client not available and GITHUB_TOKEN environment variable not set. Please configure GitHub access to use GitHub operations.';
            }
          } catch (initError: any) {
            ctx.logger.error('Failed to initialize GitHub MCP client:', initError);
            return `Error: Failed to connect to GitHub MCP server: ${initError.message}. GitHub operations are not available.`;
          }
        }
        
        // Import the enhanced GitHub MCP function
        const { default: enhancedMCPGitHub } = await import('./enhanced_github_mcp');
        
        // Use the actual context and modify the inputs temporarily
        const originalBody = ctx.inputs?.data?.body;
        
        // Temporarily update the context inputs
        if (ctx.inputs?.data) {
          ctx.inputs.data.body = {
            query: input.query,
            operation: input.operation,
            ...input.parameters
          };
        }
        
        const result = await enhancedMCPGitHub(ctx, {});
        
        // Restore original body
        if (ctx.inputs?.data && originalBody) {
          ctx.inputs.data.body = originalBody;
        }
        
        if (result.success) {
          return JSON.stringify(result.data || result.message || 'Operation completed successfully');
        } else {
          return `Error: ${result.message}`;
        }
      } catch (error: any) {
        ctx.logger.error('GitHub operation error:', error);
        return `Error executing GitHub operation: ${error.message}`;
      }
    },
    {
      name: 'enhanced_github_operations',
      description: 'Perform GitHub operations like reading files, writing files, creating issues, listing repositories, and more. Use this tool for any GitHub-related tasks.',
      schema: z.object({
        query: z.string().describe('Natural language description of what you want to do with GitHub (e.g., "read file README.md from owner/repo", "create a new issue", "list my repositories")'),
        operation: z.string().optional().describe('Specific operation to perform (optional, will be inferred from query if not provided)'),
        parameters: z.object({}).optional().describe('Additional parameters for the operation')
      }),
    },
  );

  // File operations tool for reading/writing local files
  const fileOperationsTool = tool(
    async (input) => {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Security: Restrict file operations to safe directories
        const workspaceRoot = process.cwd();
        const dataDir = path.join(workspaceRoot, 'data');
        const tmpDir = path.join(workspaceRoot, 'tmp');
        const allowedDirs = [dataDir, tmpDir];
        
        if (input.operation === 'read') {
          if (!input.filePath) {
            return 'Error: File path is required for read operation';
          }
          
          // Security check: ensure file is in allowed directory
          const fullPath = path.resolve(input.filePath);
          const isAllowed = allowedDirs.some(dir => fullPath.startsWith(path.resolve(dir)));
          
          if (!isAllowed) {
            return `Error: File access denied. Only files in ${allowedDirs.join(', ')} are accessible.`;
          }
          
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return `File content of ${input.filePath}:\n\n${content}`;
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              return `Error: File ${input.filePath} not found`;
            }
            return `Error reading file ${input.filePath}: ${error.message}`;
          }
        } else if (input.operation === 'write') {
          if (!input.filePath || !input.content) {
            return 'Error: File path and content are required for write operation';
          }
          
          // Security check: ensure file is in allowed directory
          const fullPath = path.resolve(input.filePath);
          const isAllowed = allowedDirs.some(dir => fullPath.startsWith(path.resolve(dir)));
          
          if (!isAllowed) {
            return `Error: File access denied. Only files in ${allowedDirs.join(', ')} can be written.`;
          }
          
          try {
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(fullPath, input.content, 'utf-8');
            return `Successfully wrote content to ${input.filePath}`;
          } catch (error: any) {
            return `Error writing file ${input.filePath}: ${error.message}`;
          }
        } else if (input.operation === 'list') {
          const dirPath = input.filePath || dataDir;
          const fullPath = path.resolve(dirPath);
          
          // Security check: ensure directory is in allowed paths
          const isAllowed = allowedDirs.some(dir => fullPath.startsWith(path.resolve(dir))) || fullPath === path.resolve(workspaceRoot);
          
          if (!isAllowed) {
            return `Error: Directory access denied. Only directories in ${allowedDirs.join(', ')} or workspace root can be listed.`;
          }
          
          try {
            const files = await fs.readdir(fullPath, { withFileTypes: true });
            const fileList = files.map(file => 
              file.isDirectory() ? `📁 ${file.name}/` : `📄 ${file.name}`
            ).join('\n');
            
            return `Contents of ${dirPath}:\n\n${fileList}`;
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              return `Error: Directory ${dirPath} not found`;
            }
            return `Error listing directory ${dirPath}: ${error.message}`;
          }
        } else {
          return 'Error: Supported operations are: read, write, list';
        }
      } catch (error: any) {
        ctx.logger.error('File operation error:', error);
        return `File operation error: ${error.message}`;
      }
    },
    {
      name: 'file_operations',
      description: 'Perform file system operations like reading files, writing files, and listing directories. Use this for local file management tasks. Only files in data/ and tmp/ directories are accessible for security.',
      schema: z.object({
        operation: z.enum(['read', 'write', 'list']).describe('The file operation to perform'),
        filePath: z.string().describe('Path to the file or directory (relative to workspace root)'),
        content: z.string().optional().describe('Content to write (required for write operation)')
      }),
    },
  );

  // Command execution tool for running shell commands
  const commandExecutionTool = tool(
    async (input) => {
      try {
        const { spawn } = await import('child_process');
        
        return new Promise<string>((resolve) => {
          // Parse the command and arguments
          const commandParts = input.command.trim().split(/\s+/);
          const command = commandParts[0];
          const args = commandParts.slice(1);
          
          let stdout = '';
          let stderr = '';
          
          const childProcess = spawn(command, args, {
            cwd: input.workingDirectory || process.cwd(),
            shell: true
          });
          
          childProcess.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString();
          });
          
          childProcess.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
          
          childProcess.on('close', (code: number | null) => {
            const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
            resolve(`Command executed: ${input.command}\nExit code: ${code}\n\nOutput:\n${output}`);
          });
          
          childProcess.on('error', (error: Error) => {
            resolve(`Command execution failed: ${error.message}`);
          });
          
          // Set a timeout for long-running commands
          setTimeout(() => {
            childProcess.kill();
            resolve(`Command timed out after 30 seconds: ${input.command}`);
          }, 30000);
        });
      } catch (error: any) {
        return `Command execution error: ${error.message}`;
      }
    },
    {
      name: 'execute_command',
      description: 'Execute shell commands and return their output. Use this for running system commands, listing directories with ls, checking system status, etc.',
      schema: z.object({
        command: z.string().describe('The shell command to execute'),
        workingDirectory: z.string().optional().describe('Working directory to run the command in (optional)')
      }),
    },
  );

  // MCP Orchestrator tool for complex multi-step operations
  const mcpOrchestratorTool = tool(
    async (input) => {
      try {
        // Import the MCP orchestrator
        const { MCPOrchestrator } = await import('../helper/mcp-orchestrator');
        
        const orchestrator = new MCPOrchestrator(ctx);
        
        // This is a simplified example - you can expand this based on your needs
        return `MCP Orchestrator tool executed for query: ${input.query}. This tool can coordinate multiple MCP operations in sequence or parallel.`;
      } catch (error: any) {
        return `MCP Orchestrator error: ${error.message}`;
      }
    },
    {
      name: 'mcp_orchestrator',
      description: 'Coordinate complex multi-step operations across multiple MCP servers and tools.',
      schema: z.object({
        query: z.string().describe('Description of the complex operation to orchestrate'),
        servers: z.array(z.string()).optional().describe('List of MCP server IDs to use'),
        parallel: z.boolean().optional().describe('Whether to execute operations in parallel')
      }),
    },
  );

  // STEP 2: Create the LangGraph LLM Agent with Enhanced Tool Support

  const toolnode = new ToolNode<typeof GraphState.State>([
    ragTool, 
    enhancedGithubTool, 
    fileOperationsTool, 
    commandExecutionTool,
    mcpOrchestratorTool
  ]);

  async function shouldRetrieve(
    state: typeof GraphState.State,
  ): Promise<string> {
    const { messages } = state;
    ctx.logger.info('---DECIDE TO RETRIEVE---');
    const lastMessage = messages[messages.length - 1];

    if (
      'tool_calls' in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length
    ) {
      ctx.logger.info('---DECISION: RETRIEVE---');
      return 'tools';
    }
    // If there are no tool calls then we finish.
    ctx.logger.info('---DECISION: FINISH---');
    return END;
  }

  async function agent(
    state: typeof GraphState.State,
  ): Promise<Partial<typeof GraphState.State>> {
    ctx.logger.info('---CALL AGENT---');

    const { messages, systemPrompt } = state;

    // Debug: Check if Google API key is available
    const apiKey = process.env.GOOGLE_API_KEY;
    ctx.logger.info(`Google API Key available: ${apiKey ? 'YES' : 'NO'}, Length: ${apiKey?.length || 0}`);

    // Construct messages with system prompt at the beginning
    const allMessages: BaseMessage[] = systemPrompt ? 
      [new SystemMessage(systemPrompt), ...messages] : 
      messages;

    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY, // Explicitly pass the API key
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      temperature: 0.7,
      streaming: true,
    }).bindTools([ragTool, enhancedGithubTool, fileOperationsTool, commandExecutionTool, mcpOrchestratorTool]);

    const response = await llm.invoke(allMessages);
    
    // Only return the response message, not the system prompt
    return {
      messages: [response],
    };
  }

  const graph = new StateGraph(GraphState)
    .addNode('agent', agent)
    .addNode('tools', toolnode);

  graph.addEdge('__start__', 'agent');
  graph.addConditionalEdges('agent', shouldRetrieve);
  graph.addEdge('tools', 'agent');

  const runnable = graph.compile({
    checkpointer: memorySaver,
  });

  const threadId = clientId;

  // Initialize variables
  let messagesForStream: BaseMessage[] = [];
  let systemPromptForStream: string | undefined;
  let newSystemPromptText: string;
  let existingMessages: any[] = [];
  let existingSystemPrompt: string = '';

  // Get the latest system prompt from database
  try {
    const promptData = await getPrompts();
    newSystemPromptText = `${promptData.core_system_prompt}\n${promptData.tool_knowledge_prompt}`;
    
    console.log(`[${new Date().toISOString()}] Using system prompt: ${promptData.promptName} v${promptData.version} (source: ${promptData.source})`);
  } catch (promptError) {
    console.error('Error loading system prompt, using fallback:', promptError);
    // Fallback to basic prompt
    newSystemPromptText = 'You are a helpful AI assistant with enhanced capabilities.';
  }

  // Get the current state for the thread
  const currentState = await runnable.getState({
    configurable: {
      thread_id: threadId,
    },
  });

  existingMessages = currentState?.values?.messages ?? [];
  existingSystemPrompt = currentState?.values?.systemPrompt ?? '';

  // Check if this is a new conversation or if system prompt needs update
  if (existingMessages.length === 0) {
    // New conversation
    ctx.logger.info(`New conversation for thread ${threadId}. Initializing with system prompt.`);
    messagesForStream = [new HumanMessage(payload.message)];
    systemPromptForStream = newSystemPromptText;
  } else {
    // Existing conversation
    messagesForStream = [new HumanMessage(payload.message)];
    
    // Check if system prompt needs update
    if (existingSystemPrompt !== newSystemPromptText) {
      ctx.logger.info(`System prompt for thread ${threadId} has changed. Updating system prompt.`);
      systemPromptForStream = newSystemPromptText;
    }
    // If system prompt hasn't changed, we don't need to update it
  }

  try {
    let streamStarted = false;
    let aiResponse = ''; // Collect the full AI response
    
    // Get the current system prompt (either updated or existing)
    const currentSystemPrompt = systemPromptForStream ?? existingSystemPrompt;
    
    // Always ensure system prompt is set in the stream
    const streamInput: Partial<typeof GraphState.State> = {
      messages: messagesForStream,
    };
    
    // Always include system prompt to ensure it's current
    if (currentSystemPrompt) {
      streamInput.systemPrompt = currentSystemPrompt;
    }
    
    ctx.logger.info(`Streaming with system prompt: ${currentSystemPrompt ? 'YES' : 'NO'}`);
    
    await runnable.stream(
      streamInput,
      {
        configurable: {
          thread_id: threadId,
        },
        callbacks: [
          {
            handleLLMStart: async () => {
              if (!streamStarted) {
                ws.send(
                  JSON.stringify({
                    eventtype: 'stream.start',
                    payload: { message: '[STREAM_START]' },
                  }),
                );
                streamStarted = true;
              }
            },
            handleToolStart: async (tool, input) => {
              if (!streamStarted) {
                ws.send(
                  JSON.stringify({
                    eventtype: 'stream.start',
                    payload: { message: '[STREAM_START]' },
                  }),
                );
                streamStarted = true;
              }
            },
            handleLLMNewToken: async (token) => {
              if (!streamStarted) {
                ws.send(
                  JSON.stringify({
                    eventtype: 'stream.start',
                    payload: { message: '[STREAM_START]' },
                  }),
                );
                streamStarted = true;
              }
              aiResponse += token; // Collect response
              ws.send(
                JSON.stringify({
                  eventtype: 'stream.chunk',
                  payload: { message: token },
                }),
              );
            },
            handleLLMEnd: async () => {
              ws.send(
                JSON.stringify({
                  eventtype: 'stream.end',
                  payload: { message: '[STREAM_END]' },
                }),
              );
              streamStarted = false;
              
              // Save AI response to database
              try {
                const aiMessage = await prisma.execute(ctx, {
                  meta: {
                    entityType: 'Message',
                    method: 'create'
                  },
                  data: {
                    sessionId,
                    role: 'ASSISTANT',
                    content: aiResponse,
                    metadata: { 
                      timestamp: new Date().toISOString(),
                      model: 'gemini-2.0-flash',
                      threadId: threadId
                    }
                  }
                });
                ctx.logger.info(`Saved AI message: ${aiMessage.data.id}`);
              } catch (error) {
                ctx.logger.error('Failed to save AI message:', error);
                ctx.logger.error('SessionId was:', sessionId);
              }
            },
          },
        ],
      },
    );

    ctx.logger.info(`Completed streaming for ${clientId}`);
    return new GSStatus(true, 200, 'Streaming completed');
  } catch (err: any) {
    ctx.logger.error(`LangGraph streaming error: ${err.message}`);
    ws.send(
      JSON.stringify({ eventtype: 'error', payload: { message: '[ERROR]' } }),
    );
    return new GSStatus(false, 500, 'Streaming failed');
  }
}