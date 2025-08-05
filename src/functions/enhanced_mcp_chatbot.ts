import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { RAGPipeline } from '../helper/mcpRag';
import * as mcpTools from './mcp_tools';
import { githubMCPManager } from '../helper/github-mcp-client';
import { enhancedMCPTools } from './enhanced_mcp_tools';

interface ChatBotConfig {
  mode: 'rag' | 'chat' | 'analysis' | 'development' | 'debug';
  enableFileOperations: boolean;
  enableCommandExecution: boolean;
  enableExternalMCP: boolean;
  maxOutputLength: number;
  workingDirectory?: string;
}

export default async function enhancedMCPChatBot(ctx: GSContext, args: PlainObject) {
  // Handle both HTTP requests and WebSocket events
  let query: string;
  let config: ChatBotConfig;
  
  if (ctx.inputs?.data?.body) {
    // HTTP request format
    query = ctx.inputs.data.body.query;
    config = {
      mode: ctx.inputs.data.body.mode || 'rag',
      enableFileOperations: ctx.inputs.data.body.enableFileOperations ?? true,
      enableCommandExecution: ctx.inputs.data.body.enableCommandExecution ?? false,
      enableExternalMCP: ctx.inputs.data.body.enableExternalMCP ?? true,
      maxOutputLength: ctx.inputs.data.body.maxOutputLength || 10000,
      workingDirectory: ctx.inputs.data.body.workingDirectory
    };
  } else if (ctx.inputs?.data?.payload) {
    // WebSocket event format
    query = ctx.inputs.data.payload.message;
    config = {
      mode: 'rag',
      enableFileOperations: true,
      enableCommandExecution: false,
      enableExternalMCP: true,
      maxOutputLength: 10000,
      workingDirectory: undefined
    };
  } else {
    return new GSStatus(false, 400, 'Invalid input format', {
      error: 'INVALID_INPUT',
      message: 'Expected either body.query (HTTP) or payload.message (WebSocket)'
    });
  }

  if (!query || typeof query !== 'string') {
    return new GSStatus(false, 400, 'Invalid query', {
      error: 'INVALID_QUERY',
      message: 'Query must be a non-empty string'
    });
  }

  try {
    // Analyze the query to determine if it requires tool usage
    const toolIntent = await analyzeQueryIntent(query);
    
    let response: any;
    
    if (toolIntent.requiresTools) {
      response = await handleToolBasedQuery(ctx, query, toolIntent, config);
    } else {
      // Standard RAG processing
      const rag = new RAGPipeline(ctx);
      response = await rag.run(query);
    }

    // Handle WebSocket streaming response
    if (ctx.inputs?.data?.ws) {
      const ws = ctx.inputs.data.ws;
      const sessionId = ctx.inputs.data.payload?.sessionId;
      const clientId = ctx.inputs.data.clientId;
      
      try {
        // Stream the response back via WebSocket in chunks like the original
        if (ws && ws.readyState === ws.OPEN) {
          const responseText = response.response || response.context || 'Response processed successfully';
          
          // Add tool results to the response if available
          let fullResponse = responseText;
          if (response.tool_results && response.tool_results.length > 0) {
            fullResponse += '\n\n## Tool Results:\n';
            response.tool_results.forEach((result: any) => {
              fullResponse += `- **${result.tool}**: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
              if (result.result && typeof result.result === 'object') {
                fullResponse += `  - ${JSON.stringify(result.result, null, 2)}\n`;
              }
            });
          }
          
          // Send the complete response as chunks without delay to avoid blocking
          const words = fullResponse.split(' ');
          
          // Stream all words quickly
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                eventtype: 'stream.chunk',
                payload: { message: word }
              }));
            }
          }
          
          // Send end event immediately
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              eventtype: 'stream.end',
              payload: { 
                message: '[STREAM_END]',
                sessionId,
                toolsUsed: toolIntent.suggestedTools || [],
                mode: config.mode
              }
            }));
          }
          
          // Save the complete response to database (async, don't wait)
          if (sessionId) {
            setImmediate(async () => {
              try {
                const prisma = ctx.datasources.chatbot;
                await prisma.execute(ctx, {
                  meta: {
                    entityType: 'Message',
                    method: 'create'
                  },
                  data: {
                    sessionId,
                    role: 'ASSISTANT',
                    content: fullResponse,
                    metadata: { 
                      timestamp: new Date().toISOString(),
                      mode: config.mode,
                      toolsUsed: toolIntent.suggestedTools || [],
                      clientId
                    }
                  }
                });
                ctx.logger.info(`Saved AI message for session: ${sessionId}`);
              } catch (error) {
                ctx.logger.error('Failed to save AI message:', error);
              }
            });
          }
        }
        
        return new GSStatus(true, 200, 'WebSocket streaming completed', {
          sessionId,
          mode: config.mode,
          streamed: true
        });
      } catch (error) {
        ctx.logger.error('WebSocket streaming error:', error);
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            eventtype: 'error',
            payload: { message: 'Error processing request' }
          }));
        }
        return new GSStatus(false, 500, 'WebSocket streaming failed', { error: String(error) });
      }
    }

    // Standard HTTP response
    return new GSStatus(true, 200, 'Query processed successfully', {
      ...response,
      mode: config.mode,
      toolsUsed: toolIntent.suggestedTools || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Enhanced MCP ChatBot error:', error);
    return new GSStatus(false, 500, 'Internal server error', {
      error: 'PROCESSING_ERROR',
      message: error.message || 'Failed to process query'
    });
  }
}

async function analyzeQueryIntent(query: string): Promise<{
  requiresTools: boolean;
  suggestedTools: string[];
  intent: string;
}> {
  const lowerQuery = query.toLowerCase();
  const suggestedTools: string[] = [];
  
  // NOTE: The system implements a SINGLE MCP TOOL RESTRICTION
  // Only ONE MCP tool will be executed per query, even if multiple are suggested
  // This ensures focused, controlled MCP operations and prevents conflicts
  
  // Command execution - check this FIRST to avoid conflicts with other patterns
  if (lowerQuery.includes('run command') || lowerQuery.includes('execute command') || 
      lowerQuery.includes('shell') || lowerQuery.includes('terminal') ||
      (lowerQuery.includes('execute') && (lowerQuery.includes('"') || lowerQuery.includes("'")))) {
    suggestedTools.push('execute-command');
  }
  
  // File operations
  if (lowerQuery.includes('read file') || lowerQuery.includes('show file') || 
      lowerQuery.includes('file content') || lowerQuery.includes('display file')) {
    suggestedTools.push('read-file');
  }
  
  if (lowerQuery.includes('write file') || lowerQuery.includes('save file') || 
      lowerQuery.includes('create file') || lowerQuery.includes('update file')) {
    suggestedTools.push('write-file');
  }
  
  // Directory listing - moved after command execution
  if (!lowerQuery.includes('execute command') && // Avoid conflict with commands
      (lowerQuery.includes('list files') || lowerQuery.includes('show directory') || 
       lowerQuery.includes('directory contents') || lowerQuery.includes('list contents') ||
       lowerQuery.includes('contents of') || lowerQuery.includes('files in') ||
       lowerQuery.includes('ls '))) {
    suggestedTools.push('list-directory');
  }
  
  if (lowerQuery.includes('file info') || lowerQuery.includes('file details') || 
      lowerQuery.includes('file metadata') || lowerQuery.includes('stat ')) {
    suggestedTools.push('get-file-info');
  }
  
  // Mode switching
  if (lowerQuery.includes('switch mode') || lowerQuery.includes('change mode') || 
      lowerQuery.includes('set mode')) {
    suggestedTools.push('switch-mode');
  }
  
  // MCP orchestration specific - check FIRST for specific structured commands
  if (lowerQuery.includes('register-mcp-server') || 
      lowerQuery.match(/register.*server.*id:/i) ||
      lowerQuery.includes('register server') || lowerQuery.includes('add server') ||
      lowerQuery.includes('setup server') || lowerQuery.includes('ip server') ||
      lowerQuery.includes('swagger server') || lowerQuery.includes('api server')) {
    suggestedTools.push('register-mcp-server');
  }
  
  if (lowerQuery.includes('register-mcp-task') ||
      lowerQuery.match(/register.*task.*id:/i) ||
      lowerQuery.includes('register task') || lowerQuery.includes('create task') ||
      lowerQuery.includes('define task')) {
    suggestedTools.push('register-mcp-task');
  }
  
  if (lowerQuery.includes('execute-mcp-task') ||
      lowerQuery.match(/execute.*task.*id:/i) ||
      lowerQuery.includes('execute task') || lowerQuery.includes('run task') ||
      lowerQuery.includes('start task')) {
    suggestedTools.push('execute-mcp-task');
  }
  
  if (lowerQuery.includes('list-mcp-servers') ||
      (lowerQuery.includes('list servers') && !lowerQuery.includes('register')) || 
      (lowerQuery.includes('show servers') && !lowerQuery.includes('register')) ||
      lowerQuery.includes('registered mcp servers') || lowerQuery.includes('all mcp servers')) {
    suggestedTools.push('list-mcp-servers');
  }
  
  if (lowerQuery.includes('list-mcp-tasks') ||
      (lowerQuery.includes('list tasks') && !lowerQuery.includes('register')) || 
      (lowerQuery.includes('show tasks') && !lowerQuery.includes('register')) ||
      lowerQuery.includes('registered mcp tasks') || lowerQuery.includes('all mcp tasks')) {
    suggestedTools.push('list-mcp-tasks');
  }
  
  // GitHub operations
  if (lowerQuery.includes('github') || lowerQuery.includes('git') || 
      lowerQuery.includes('repository') || lowerQuery.includes('repo') ||
      lowerQuery.includes('commit') || lowerQuery.includes('pull request') ||
      lowerQuery.includes('issue') || lowerQuery.includes('branch')) {
    suggestedTools.push('github-mcp');
  }
  
  // External MCP and orchestration - ONLY if no specific MCP commands were matched
  if (suggestedTools.filter(tool => 
        ['register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp'].includes(tool)
      ).length === 0 && 
      (lowerQuery.includes('call mcp') || lowerQuery.includes('external service') || 
       lowerQuery.includes('remote tool') || lowerQuery.includes('orchestrate') || 
       lowerQuery.includes('multi mcp'))) {
    suggestedTools.push('call-mcp');
  }

  // FINAL CLEANUP: If multiple MCP tools were suggested, keep only the highest priority one
  const mcpToolsInSuggested = suggestedTools.filter(tool => 
    ['register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp', 'call-mcp'].includes(tool)
  );
  
  if (mcpToolsInSuggested.length > 1) {
    // Remove all MCP tools first
    const nonMCPTools = suggestedTools.filter(tool => 
      !['register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp', 'call-mcp'].includes(tool)
    );
    
    // Priority order for MCP tools (most specific first)
    const mcpPriority = ['register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp', 'call-mcp'];
    
    // Find the highest priority MCP tool
    let primaryMCPTool = mcpToolsInSuggested[0];
    for (const priorityTool of mcpPriority) {
      if (mcpToolsInSuggested.includes(priorityTool)) {
        primaryMCPTool = priorityTool;
        break;
      }
    }
    
    // Rebuild the suggested tools array with only one MCP tool
    suggestedTools.splice(0, suggestedTools.length, ...nonMCPTools, primaryMCPTool);
  }

  return {
    requiresTools: suggestedTools.length > 0,
    suggestedTools,
    intent: determineIntent(lowerQuery, suggestedTools)
  };
}

function determineIntent(query: string, tools: string[]): string {
  if (tools.includes('read-file')) return 'file_read';
  if (tools.includes('write-file')) return 'file_write';
  if (tools.includes('list-directory')) return 'directory_listing';
  if (tools.includes('execute-command')) return 'command_execution';
  if (tools.includes('github-mcp')) return 'github_operation';
  if (tools.includes('switch-mode')) return 'mode_switch';
  if (tools.includes('call-mcp')) return 'external_mcp_call';
  if (tools.includes('register-mcp-server')) return 'mcp_server_registration';
  if (tools.includes('register-mcp-task')) return 'mcp_task_registration';
  if (tools.includes('execute-mcp-task')) return 'mcp_task_execution';
  if (tools.includes('list-mcp-servers')) return 'mcp_servers_list';
  if (tools.includes('list-mcp-tasks')) return 'mcp_tasks_list';
  return 'general_query';
}

async function handleToolBasedQuery(
  ctx: GSContext, 
  query: string, 
  toolIntent: any, 
  config: ChatBotConfig
): Promise<any> {
  const results: any[] = [];
  
  // Identify MCP tools vs local tools
  const mcpToolTypes = ['call-mcp', 'register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp'];
  const localToolTypes = ['read-file', 'write-file', 'list-directory', 'get-file-info', 'execute-command', 'switch-mode'];
  
  const suggestedMCPTools = toolIntent.suggestedTools.filter((tool: string) => mcpToolTypes.includes(tool));
  const suggestedLocalTools = toolIntent.suggestedTools.filter((tool: string) => localToolTypes.includes(tool));
  
  // RESTRICTION: Only allow ONE MCP tool at a time
  let toolsToProcess = [...suggestedLocalTools]; // Include all local tools
  
  if (suggestedMCPTools.length > 0) {
    // Priority order for MCP tools (most specific first)
    const mcpPriority = ['register-mcp-server', 'register-mcp-task', 'execute-mcp-task', 'list-mcp-servers', 'list-mcp-tasks', 'github-mcp', 'call-mcp'];
    
    // Find the highest priority MCP tool
    let primaryMCPTool = suggestedMCPTools[0];
    for (const priorityTool of mcpPriority) {
      if (suggestedMCPTools.includes(priorityTool)) {
        primaryMCPTool = priorityTool;
        break;
      }
    }
    
    toolsToProcess.push(primaryMCPTool);
    
    // Log the restriction for debugging
    if (suggestedMCPTools.length > 1) {
      ctx.logger.info(`MCP Tool Restriction: Only processing '${primaryMCPTool}' (highest priority), ignoring ${suggestedMCPTools.filter((t: string) => t !== primaryMCPTool).join(', ')}`);
    }
  }
  
  for (const tool of toolsToProcess) {
    try {
      let toolResult;
      
      switch (tool) {
        case 'read-file':
          if (config.enableFileOperations) {
            const filePath = extractFilePathFromQuery(query);
            if (filePath) {
              toolResult = await mcpTools.readFile(ctx, { 
                filePath, 
                encoding: 'utf8' 
              });
              results.push({
                tool: 'read-file',
                filePath,
                success: toolResult.success,
                content: toolResult.data?.content || toolResult.message
              });
            }
          }
          break;
          
        case 'write-file':
          if (config.enableFileOperations) {
            const { filePath, content } = extractFileWriteFromQuery(query);
            if (filePath && content) {
              toolResult = await mcpTools.writeFile(ctx, {
                filePath,
                content,
                encoding: 'utf8',
                createDirs: true
              });
              results.push({
                tool: 'write-file',
                filePath,
                success: toolResult.success,
                message: toolResult.message
              });
            }
          }
          break;
          
        case 'list-directory':
          if (config.enableFileOperations) {
            const dirPath = extractDirectoryFromQuery(query) || config.workingDirectory || '.';
            toolResult = await mcpTools.listDirectory(ctx, { dirPath });
            
            // Process the contents array and separate files from directories
            const contents = toolResult.data?.contents || [];
            const files = contents.filter((item: any) => item.type === 'file');
            const directories = contents.filter((item: any) => item.type === 'directory');
            
            results.push({
              tool: 'list-directory',
              dirPath,
              success: toolResult.success,
              files: files.map((f: any) => f.name),
              directories: directories.map((d: any) => d.name),
              totalItems: contents.length
            });
          }
          break;
          
        case 'get-file-info':
          if (config.enableFileOperations) {
            const filePath = extractFilePathFromQuery(query);
            if (filePath) {
              toolResult = await mcpTools.getFileInfo(ctx, { filePath });
              results.push({
                tool: 'get-file-info',
                filePath,
                success: toolResult.success,
                info: toolResult.data || {}
              });
            }
          }
          break;
          
        case 'execute-command':
          if (config.enableCommandExecution) {
            const command = extractCommandFromQuery(query);
            if (command) {
              toolResult = await mcpTools.executeCommand(ctx, {
                command,
                timeout: 30000,
                workingDirectory: config.workingDirectory
              });
              
              // Extract actual command output from the data
              const commandOutput = toolResult.data?.stdout || '';
              const commandError = toolResult.data?.stderr || '';
              const fullOutput = commandOutput + (commandError ? `\nSTDERR: ${commandError}` : '');
              
              results.push({
                tool: 'execute-command',
                command,
                success: toolResult.success,
                output: fullOutput || toolResult.message,
                stdout: commandOutput,
                stderr: commandError,
                exitCode: toolResult.data?.exitCode
              });
            }
          }
          break;
          
        case 'switch-mode':
          const newMode = extractModeFromQuery(query);
          if (newMode) {
            toolResult = await mcpTools.switchMode(ctx, { mode: newMode });
            results.push({
              tool: 'switch-mode',
              newMode,
              success: toolResult.success,
              message: toolResult.message
            });
          }
          break;
          
        case 'github-mcp':
          if (config.enableExternalMCP) {
            const githubOperation = extractGitHubOperationFromQuery(query);
            if (githubOperation.action) {
              // Try external GitHub MCP server first
              const externalClient = githubMCPManager.getClient();
              let toolResult: any;
              
              if (externalClient && externalClient.isConnected()) {
                try {
                  console.log(`Using external GitHub MCP server for: ${githubOperation.action}`);
                  const externalResult = await externalClient.callTool(githubOperation.action, githubOperation.parameters);
                  toolResult = new GSStatus(true, 200, 'External GitHub MCP operation completed', externalResult);
                } catch (error) {
                  console.log(`External GitHub MCP failed, falling back to internal: ${error}`);
                  // Fall back to internal GitHub API via callMCP
                  toolResult = await mcpTools.callMCP(ctx, {
                    server: 'github',
                    tool: githubOperation.action,
                    parameters: githubOperation.parameters,
                    timeout: 30000
                  });
                }
              } else {
                console.log('No external GitHub MCP client, using internal GitHub API');
                // Use internal GitHub API implementation via callMCP
                toolResult = await mcpTools.callMCP(ctx, {
                  server: 'github',
                  tool: githubOperation.action,
                  parameters: githubOperation.parameters,
                  timeout: 30000
                });
              }
              
              results.push({
                tool: 'github-mcp',
                action: githubOperation.action,
                parameters: githubOperation.parameters,
                success: toolResult.success,
                result: toolResult.data || toolResult.message,
                source: externalClient?.isConnected() ? 'external-mcp' : 'internal-api'
              });
            }
          }
          break;
          
        case 'call-mcp':
          if (config.enableExternalMCP) {
            const { serverName, tool: mcpTool, args } = extractMCPCallFromQuery(query);
            if (serverName && mcpTool) {
              // Try enhanced orchestrated call first
              toolResult = await enhancedMCPTools.callMCPOrchestrated(ctx, {
                serverId: serverName,
                tool: mcpTool,
                parameters: args || {},
                autoInit: true
              });
              
              if (!toolResult.success) {
                // Fallback to original MCP call
                toolResult = await mcpTools.callMCP(ctx, {
                  serverName,
                  tool: mcpTool,
                  args: args || {},
                  timeout: 30000
                });
              }
              
              results.push({
                tool: 'call-mcp',
                serverName,
                mcpTool,
                success: toolResult.success,
                result: toolResult.data || toolResult.message
              });
            }
          }
          break;
          
        case 'register-mcp-server':
          if (config.enableExternalMCP) {
            const serverConfig = extractMCPServerConfigFromQuery(query);
            if (serverConfig) {
              toolResult = await enhancedMCPTools.registerMCPServer(ctx, serverConfig);
              results.push({
                tool: 'register-mcp-server',
                serverConfig,
                success: toolResult.success,
                result: toolResult.data || toolResult.message
              });
            } else {
              // If extraction failed, provide a helpful error message
              results.push({
                tool: 'register-mcp-server',
                success: false,
                error: 'Failed to extract server configuration from query. Expected format: "register-mcp-server id:server-id name:"Server Name" type:npx command:package-name"'
              });
            }
          }
          break;
          
        case 'register-mcp-task':
          if (config.enableExternalMCP) {
            const taskConfig = extractMCPTaskConfigFromQuery(query);
            if (taskConfig) {
              toolResult = await enhancedMCPTools.registerMCPTask(ctx, taskConfig);
              results.push({
                tool: 'register-mcp-task',
                taskConfig,
                success: toolResult.success,
                result: toolResult.data || toolResult.message
              });
            }
          }
          break;
          
        case 'execute-mcp-task':
          if (config.enableExternalMCP) {
            const { taskId, parameters } = extractMCPTaskExecutionFromQuery(query);
            if (taskId) {
              toolResult = await enhancedMCPTools.executeMCPTask(ctx, { taskId, parameters });
              results.push({
                tool: 'execute-mcp-task',
                taskId,
                parameters,
                success: toolResult.success,
                result: toolResult.data || toolResult.message
              });
            }
          }
          break;
          
        case 'list-mcp-servers':
          if (config.enableExternalMCP) {
            toolResult = await enhancedMCPTools.listMCPServers(ctx);
            results.push({
              tool: 'list-mcp-servers',
              success: toolResult.success,
              result: toolResult.data || toolResult.message
            });
          }
          break;
          
        case 'list-mcp-tasks':
          if (config.enableExternalMCP) {
            toolResult = await enhancedMCPTools.listMCPTasks(ctx);
            results.push({
              tool: 'list-mcp-tasks',
              success: toolResult.success,
              result: toolResult.data || toolResult.message
            });
          }
          break;
      }
    } catch (error: any) {
      results.push({
        tool,
        success: false,
        error: error.message
      });
    }
  }
  
  // If we have tool results, format them nicely
  if (results.length > 0) {
    return {
      context: formatToolResults(results),
      source_files: 'mcp_local_tools',
      tool_results: results,
      processed_with_tools: true
    };
  }
  
  // Fallback to standard RAG if no tools were successfully used
  const rag = new RAGPipeline(ctx);
  return await rag.run(query);
}

// Helper functions to extract information from natural language queries
function extractFilePathFromQuery(query: string): string | null {
  // Look for file paths in quotes or after keywords
  const patterns = [
    /"([^"]+\.[a-zA-Z0-9]+)"/,                    // "file.ext"
    /'([^']+\.[a-zA-Z0-9]+)'/,                    // 'file.ext'
    /file[:\s]+([^\s]+\.[a-zA-Z0-9]+)/i,          // file: path or file path
    /read[:\s]+([^\s]+\.[a-zA-Z0-9]+)/i,          // read package.json
    /show[:\s]+([^\s]+\.[a-zA-Z0-9]+)/i,          // show package.json
    /(?:file|read|show|open)\s+([^\s]+\.[a-zA-Z0-9]+)/i,  // more flexible matching
    /path[:\s]+([^\s]+)/i,                        // path: or path
    /([^\s]+\.[a-zA-Z0-9]+)$/                     // file.ext at end
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractFileWriteFromQuery(query: string): { filePath: string | null; content: string | null } {
  const filePath = extractFilePathFromQuery(query);
  
  // Extract content between quotes or after "content:" keyword
  const contentPatterns = [
    /content[:\s]+"([^"]+)"/i,
    /content[:\s]+'([^']+)'/i,
    /"([^"]*)".*(?:to|into).*file/i,
    /'([^']*)'.*(?:to|into).*file/i
  ];
  
  let content = null;
  for (const pattern of contentPatterns) {
    const match = query.match(pattern);
    if (match) {
      content = match[1];
      break;
    }
  }
  
  return { filePath, content };
}

function extractDirectoryFromQuery(query: string): string | null {
  const patterns = [
    /(?:list|show).*(?:files|directory|contents).*(?:in|of|from)\s+([^\s]+)/i,  // "list files in src"
    /(?:list|show).*(?:contents?)\s+(?:of|from|in)\s+([^\s]+)/i,              // "list contents of src"
    /(?:list|show).*(?:in|of|from)\s+([^\s]+)(?:\s+directory|\s+dir|\s+folder)?/i, // "list in src"
    /(?:directory|folder|dir)\s+contents?\s+(?:of|from|in)\s+([^\s]+)/i,       // "directory contents of src"
    /(?:contents?|files)\s+(?:of|from|in)\s+([^\s]+)(?:\s+directory|\s+dir|\s+folder)?/i, // "contents of src directory"
    /(?:current|this)\s+directory/i,                                          // "current directory" -> "."
    /^\.$/,                                                                   // Just "."
    /(?:in|from)\s+([^\s]+)\s+(?:directory|dir|folder)/i,                     // "in src directory"
    /(?:directory|folder|dir)[:\s]+([^\s]+)/i,                                // "directory: src"
    /"([^"]+\/?)"/,                                                           // "src/" or "src"
    /'([^']+\/?)''/,                                                          // 'src/' or 'src'
  ];
  
  const lowerQuery = query.toLowerCase();
  
  // Special case for current directory requests
  if (lowerQuery.includes('current directory') || lowerQuery.includes('this directory') || query.trim() === '.') {
    return '.';
  }
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1];
  }
  
  // Default to current directory if it's clearly a directory listing request
  if (lowerQuery.includes('list') && (lowerQuery.includes('files') || lowerQuery.includes('directory') || lowerQuery.includes('contents'))) {
    return '.';
  }
  
  return null;
}

function extractCommandFromQuery(query: string): string | null {
  const patterns = [
    /command[:\s]+"([^"]+)"/i,          // command: "echo test"
    /command[:\s]+'([^']+)'/i,          // command: 'echo test'
    /execute[:\s]*command[:\s]*"([^"]+)"/i,  // execute command "echo test"
    /execute[:\s]*command[:\s]*'([^']+)'/i,  // execute command 'echo test'
    /execute[:\s]*command[:\s]*([^"'][^\n]+)/i,  // execute command echo test
    /run[:\s]+"([^"]+)"/i,              // run: "echo test"
    /execute[:\s]+"([^"]+)"/i,          // execute: "echo test"
    /`([^`]+)`/                         // `command`
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractModeFromQuery(query: string): string | null {
  const modes = ['rag', 'chat', 'analysis', 'development', 'debug'];
  const lowerQuery = query.toLowerCase();
  
  for (const mode of modes) {
    if (lowerQuery.includes(mode)) return mode;
  }
  return null;
}

function extractMCPCallFromQuery(query: string): { serverName: string | null; tool: string | null; args: any } {
  // This is a simplified extraction - in practice, you'd want more sophisticated parsing
  const serverMatch = query.match(/server[:\s]+([^\s]+)/i);
  const toolMatch = query.match(/tool[:\s]+([^\s]+)/i);
  
  return {
    serverName: serverMatch ? serverMatch[1] : null,
    tool: toolMatch ? toolMatch[1] : null,
    args: {}
  };
}

function extractGitHubOperationFromQuery(query: string): { action: string | null; parameters: any } {
  const lowerQuery = query.toLowerCase();
  let action = null;
  const parameters: any = {};
  
  // User/Profile operations (check these first)
  if (lowerQuery.includes('my profile') || lowerQuery.includes('github profile') || 
      lowerQuery.includes('my github') || lowerQuery.includes('profile information') ||
      (lowerQuery.includes('get user') && (lowerQuery.includes('my') || lowerQuery.includes('me'))) ||
      lowerQuery.includes('user info')) {
    action = 'get_user';  // Use the correct internal tool name
    // No username parameter means current user
  }
  
  // List repositories
  else if (lowerQuery.includes('list repositories') || lowerQuery.includes('list repos') ||
           lowerQuery.includes('my repositories') || lowerQuery.includes('my repos') ||
           lowerQuery.includes('github repositories') || lowerQuery.includes('repositories')) {
    action = 'list_repositories';
    // No username parameter means current user's repos
  }
  
  // Repository operations
  else if (lowerQuery.includes('create repository') || lowerQuery.includes('create repo')) {
    action = 'create_repository';
    const nameMatch = query.match(/repository[:\s]+([^\s]+)/i) || query.match(/repo[:\s]+([^\s]+)/i);
    if (nameMatch) parameters.name = nameMatch[1];
    
    if (lowerQuery.includes('private')) parameters.private = true;
    if (lowerQuery.includes('public')) parameters.private = false;
  }
  
  // Get repository info
  else if (lowerQuery.includes('get repository') || lowerQuery.includes('show repo') || 
           lowerQuery.includes('repository info') || lowerQuery.includes('repo details')) {
    action = 'get_repository';
    const repoMatch = query.match(/(?:repository|repo)[:\s]*([^\s]+\/[^\s]+)/i);
    if (repoMatch) {
      const [owner, repo] = repoMatch[1].split('/');
      parameters.owner = owner;
      parameters.repo = repo;
    }
  }
  
  // Issues operations
  else if (lowerQuery.includes('create issue')) {
    action = 'create_issue';
    const titleMatch = query.match(/title[:\s]+"([^"]+)"/i) || query.match(/issue[:\s]+"([^"]+)"/i);
    if (titleMatch) parameters.title = titleMatch[1];
    
    const bodyMatch = query.match(/body[:\s]+"([^"]+)"/i) || query.match(/description[:\s]+"([^"]+)"/i);
    if (bodyMatch) parameters.body = bodyMatch[1];
  }
  
  else if (lowerQuery.includes('list issues') || lowerQuery.includes('get issues')) {
    action = 'list_issues';
    if (lowerQuery.includes('open')) parameters.state = 'open';
    if (lowerQuery.includes('closed')) parameters.state = 'closed';
    
    // Extract repository from query
    const repoMatch = query.match(/(?:from|in)\s+([^\s]+)\s+(?:repository|repo)/i) || 
                     query.match(/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?)\s+(?:repository|repo)/i);
    if (repoMatch) {
      const repoStr = repoMatch[1];
      if (repoStr.includes('/')) {
        const [owner, repo] = repoStr.split('/');
        parameters.owner = owner;
        parameters.repo = repo;
      } else {
        // Assume current user's repository
        parameters.owner = 'Sanskary2303';
        parameters.repo = repoStr;
      }
    }
  }
  
  // Pull request operations
  else if (lowerQuery.includes('create pull request') || lowerQuery.includes('create pr')) {
    action = 'create_pull_request';
    const titleMatch = query.match(/title[:\s]+"([^"]+)"/i);
    if (titleMatch) parameters.title = titleMatch[1];
    
    const headMatch = query.match(/from[:\s]+([^\s]+)/i) || query.match(/head[:\s]+([^\s]+)/i);
    if (headMatch) parameters.head = headMatch[1];
    
    const baseMatch = query.match(/to[:\s]+([^\s]+)/i) || query.match(/base[:\s]+([^\s]+)/i);
    if (baseMatch) parameters.base = baseMatch[1];
  }
  
  else if (lowerQuery.includes('list pull requests') || lowerQuery.includes('list prs')) {
    action = 'list_pull_requests';
    if (lowerQuery.includes('open')) parameters.state = 'open';
    if (lowerQuery.includes('closed')) parameters.state = 'closed';
  }
  
  // File operations
  else if (lowerQuery.includes('get file') || lowerQuery.includes('read file from github')) {
    action = 'get_file_contents';
    const pathMatch = query.match(/path[:\s]+([^\s]+)/i) || query.match(/file[:\s]+([^\s]+)/i);
    if (pathMatch) parameters.path = pathMatch[1];
  }
  
  // Commit operations
  else if (lowerQuery.includes('list commits') || lowerQuery.includes('get commits')) {
    action = 'list_commits';
    const branchMatch = query.match(/branch[:\s]+([^\s]+)/i);
    if (branchMatch) parameters.sha = branchMatch[1];
    
    // Extract repository from query
    const repoMatch = query.match(/(?:from|in)\s+([^\s]+)\s+(?:repository|repo)/i) || 
                     query.match(/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?)\s+(?:repository|repo)/i);
    if (repoMatch) {
      const repoStr = repoMatch[1];
      if (repoStr.includes('/')) {
        const [owner, repo] = repoStr.split('/');
        parameters.owner = owner;
        parameters.repo = repo;
      } else {
        // Assume current user's repository
        parameters.owner = 'Sanskary2303';
        parameters.repo = repoStr;
      }
    }
  }
  
  // Branch operations
  else if (lowerQuery.includes('list branches') || lowerQuery.includes('get branches')) {
    action = 'list_branches';
  }
  
  else if (lowerQuery.includes('create branch')) {
    action = 'create_branch';
    const branchMatch = query.match(/branch[:\s]+([^\s]+)/i);
    if (branchMatch) parameters.ref = `refs/heads/${branchMatch[1]}`;
    
    const fromMatch = query.match(/from[:\s]+([^\s]+)/i);
    if (fromMatch) parameters.sha = fromMatch[1];
  }
  
  // Search operations
  else if (lowerQuery.includes('search repositories') || lowerQuery.includes('search repos')) {
    action = 'search_repositories';
    const queryMatch = query.match(/(?:for|query)[:\s]+"([^"]+)"/i);
    if (queryMatch) parameters.q = queryMatch[1];
  }
  
  // Extract common repository context if not already set
  if (action && action.includes('list_') && !parameters.owner && !parameters.repo) {
    const repoMatch = query.match(/(?:in|from|for)[:\s]+([^\s]+\/[^\s]+)/i);
    if (repoMatch) {
      const [owner, repo] = repoMatch[1].split('/');
      parameters.owner = owner;
      parameters.repo = repo;
    }
  }
  
  return { action, parameters };
}

function extractMCPServerConfigFromQuery(query: string): any {
  // Handle structured command format like: "register-mcp-server id:calendar-server name:"Calendar MCP Server" type:npx command:@modelcontextprotocol/server-calendar"
  const structuredMatch = query.match(/register-mcp-server\s+(.+)/i);
  if (structuredMatch) {
    const params = structuredMatch[1];
    const config: any = {
      type: 'npx',  // default
      config: {}
    };
    
    // Extract id
    const idMatch = params.match(/id:\s*([^\s]+)/i);
    if (idMatch) {
      config.id = idMatch[1];
      config.name = idMatch[1];  // default name to id
    }
    
    // Extract name (handle quoted strings)
    const nameMatch = params.match(/name:\s*"([^"]+)"|name:\s*'([^']+)'|name:\s*([^\s]+)/i);
    if (nameMatch) {
      config.name = nameMatch[1] || nameMatch[2] || nameMatch[3];
    }
    
    // Extract type
    const typeMatch = params.match(/type:\s*(remote|npx|local|ip|swagger-npx)/i);
    if (typeMatch) {
      config.type = typeMatch[1].toLowerCase();
    }
    
    // Extract parameters based on type
    const commandMatch = params.match(/command:\s*([^\s]+)/i);
    const packageMatch = params.match(/package:\s*([^\s]+)/i);
    const urlMatch = params.match(/url:\s*([^\s]+)/i);
    const hostMatch = params.match(/host:\s*([^\s]+)/i);
    const portMatch = params.match(/port:\s*(\d+)/i);
    const protocolMatch = params.match(/protocol:\s*(http|https|ws|wss)/i);
    const tokenMatch = params.match(/token:\s*([^\s]+)/i);
    const authTypeMatch = params.match(/auth:\s*(jwt|bearer|basic|api-key)/i);
    const swaggerMatch = params.match(/swagger:\s*([^\s]+)/i);
    
    if (config.type === 'remote' && urlMatch) {
      config.config.url = urlMatch[1];
    } else if (config.type === 'npx') {
      config.config.package = commandMatch ? commandMatch[1] : (packageMatch ? packageMatch[1] : null);
    } else if (config.type === 'local') {
      config.config.command = commandMatch ? commandMatch[1] : null;
    } else if (config.type === 'ip') {
      if (hostMatch) config.config.host = hostMatch[1];
      if (portMatch) config.config.port = parseInt(portMatch[1]);
      if (protocolMatch) config.config.protocol = protocolMatch[1];
      
      // Handle authentication
      if (tokenMatch || authTypeMatch) {
        config.config.auth = {
          type: authTypeMatch ? authTypeMatch[1] : 'jwt',
          token: tokenMatch ? tokenMatch[1] : undefined
        };
      }
    } else if (config.type === 'swagger-npx') {
      if (swaggerMatch) {
        config.config.swaggerSpec = swaggerMatch[1];
        config.config.swaggerOptions = {
          generateClient: true,
          clientName: 'typescript-node'
        };
      }
      if (packageMatch) config.config.package = packageMatch[1];
    }
    
    // Extract args if present
    const argsMatch = params.match(/args:\s*\[([^\]]+)\]/i);
    if (argsMatch) {
      config.config.args = argsMatch[1].split(',').map(arg => arg.trim().replace(/['"]/g, ''));
    }
    
    // Validate that we have minimum required fields
    if (config.id && (config.config.package || config.config.url || config.config.command || 
                      (config.config.host && config.config.port) || config.config.swaggerSpec)) {
      return config;
    }
  }
  
  // Fallback to original simple extraction
  const serverMatch = query.match(/server[:\s]+([^\s]+)/i);
  const typeMatch = query.match(/type[:\s]+(remote|npx|local|ip|swagger-npx)/i);
  const urlMatch = query.match(/url[:\s]+([^\s]+)/i);
  const packageMatch = query.match(/package[:\s]+([^\s]+)/i);
  const commandMatch = query.match(/command[:\s]+"([^"]+)"/i);
  const hostMatch = query.match(/host[:\s]+([^\s]+)/i);
  const portMatch = query.match(/port[:\s]+(\d+)/i);
  
  if (!serverMatch) return null;
  
  const config: any = {
    id: serverMatch[1],
    name: serverMatch[1],
    type: typeMatch ? typeMatch[1] : 'npx',
    config: {}
  };
  
  if (config.type === 'remote' && urlMatch) {
    config.config.url = urlMatch[1];
  } else if (config.type === 'ip' && hostMatch) {
    config.config.host = hostMatch[1];
    if (portMatch) config.config.port = parseInt(portMatch[1]);
  } else if (config.type === 'swagger-npx') {
    const swaggerMatch = query.match(/swagger[:\s]+([^\s]+)/i);
    if (swaggerMatch) {
      config.config.swaggerSpec = swaggerMatch[1];
    }
  } else if (config.type === 'npx' && packageMatch) {
    config.config.package = packageMatch[1];
  } else if (config.type === 'local' && commandMatch) {
    config.config.command = commandMatch[1];
  }
  
  return config;
}

function extractMCPTaskConfigFromQuery(query: string): any {
  // Handle structured command format like: "register-mcp-task id:analyze-project name:"Project Analysis" servers:[github,filesystem] parallel:true"
  const structuredMatch = query.match(/register-mcp-task\s+(.+)/i);
  if (structuredMatch) {
    const params = structuredMatch[1];
    const config: any = {
      steps: [],
      parallel: false
    };
    
    // Extract id
    const idMatch = params.match(/id:\s*([^\s]+)/i);
    if (idMatch) {
      config.id = idMatch[1];
      config.name = idMatch[1];  // default name to id
    }
    
    // Extract name (handle quoted strings)
    const nameMatch = params.match(/name:\s*"([^"]+)"|name:\s*'([^']+)'|name:\s*([^\s]+)/i);
    if (nameMatch) {
      config.name = nameMatch[1] || nameMatch[2] || nameMatch[3];
    }
    
    // Extract description
    const descMatch = params.match(/description:\s*"([^"]+)"|description:\s*'([^']+)'/i);
    if (descMatch) {
      config.description = descMatch[1] || descMatch[2];
    }
    
    // Extract servers
    const serversMatch = params.match(/servers:\s*\[([^\]]+)\]/i);
    if (serversMatch) {
      config.servers = serversMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    }
    
    // Extract parallel flag
    const parallelMatch = params.match(/parallel:\s*(true|false)/i);
    if (parallelMatch) {
      config.parallel = parallelMatch[1].toLowerCase() === 'true';
    }
    
    // Validate that we have minimum required fields
    if (config.id) {
      return config;
    }
  }
  
  // Fallback to original simple extraction
  const taskMatch = query.match(/task[:\s]+([^\s]+)/i);
  const serversMatch = query.match(/servers[:\s]+\[([^\]]+)\]/i);
  
  if (!taskMatch) return null;
  
  const config: any = {
    id: taskMatch[1],
    name: taskMatch[1],
    servers: serversMatch ? serversMatch[1].split(',').map(s => s.trim()) : [],
    steps: [],
    parallel: query.toLowerCase().includes('parallel')
  };
  
  return config;
}

function extractMCPTaskExecutionFromQuery(query: string): { taskId: string | null; parameters: any } {
  // Handle structured command format like: "execute-mcp-task id:analyze-project parameters:{repo:"myrepo"}"
  const structuredMatch = query.match(/execute-mcp-task\s+(.+)/i);
  if (structuredMatch) {
    const params = structuredMatch[1];
    
    // Extract task id
    const idMatch = params.match(/id:\s*([^\s]+)/i);
    const taskId = idMatch ? idMatch[1] : null;
    
    // Extract parameters
    const parametersMatch = params.match(/parameters:\s*({[^}]+})/i);
    let parameters: any = {};
    if (parametersMatch) {
      try {
        parameters = JSON.parse(parametersMatch[1]);
      } catch (e) {
        // Try to parse simple key:value pairs
        const simpleParamsMatch = params.match(/parameters:\s*{([^}]+)}/i);
        if (simpleParamsMatch) {
          const paramPairs = simpleParamsMatch[1].split(',');
          paramPairs.forEach(pair => {
            const [key, value] = pair.split(':').map(s => s.trim().replace(/['"]/g, ''));
            if (key && value) {
              parameters[key] = value;
            }
          });
        }
      }
    }
    
    return { taskId, parameters };
  }
  
  // Fallback to original simple extraction
  const taskMatch = query.match(/task[:\s]+([^\s]+)/i);
  const parametersMatch = query.match(/parameters[:\s]+({[^}]+})/i);
  
  let parameters = {};
  if (parametersMatch) {
    try {
      parameters = JSON.parse(parametersMatch[1]);
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  
  return {
    taskId: taskMatch ? taskMatch[1] : null,
    parameters
  };
}

function formatToolResults(results: any[]): string {
  let formatted = "## Tool Execution Results\n\n";
  
  for (const result of results) {
    formatted += `### ${result.tool}\n`;
    if (result.success) {
      formatted += "✅ **Status**: Success\n";
      
      // File operations
      if (result.content) {
        formatted += `**Content**: ${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}\n`;
      }
      if (result.filePath) {
        formatted += `**File**: ${result.filePath}\n`;
      }
      
      // Directory operations
      if (result.files && result.files.length > 0) {
        formatted += `**Files**: ${result.files.slice(0, 10).join(', ')}${result.files.length > 10 ? '...' : ''}\n`;
      }
      if (result.directories && result.directories.length > 0) {
        formatted += `**Directories**: ${result.directories.slice(0, 10).join(', ')}${result.directories.length > 10 ? '...' : ''}\n`;
      }
      if (result.totalItems) {
        formatted += `**Total Items**: ${result.totalItems}\n`;
      }
      
      // Command execution
      if (result.command) {
        formatted += `**Command**: \`${result.command}\`\n`;
        if (result.stdout) {
          formatted += `**Output**:\n\`\`\`\n${result.stdout.substring(0, 1000)}${result.stdout.length > 1000 ? '...' : ''}\n\`\`\`\n`;
        }
        if (result.stderr) {
          formatted += `**Errors**:\n\`\`\`\n${result.stderr.substring(0, 500)}${result.stderr.length > 500 ? '...' : ''}\n\`\`\`\n`;
        }
        if (result.exitCode !== undefined) {
          formatted += `**Exit Code**: ${result.exitCode}\n`;
        }
      }
      
      // File info
      if (result.info) {
        const info = result.info;
        formatted += `**Size**: ${info.size} bytes\n`;
        formatted += `**Type**: ${info.isFile ? 'File' : 'Directory'}\n`;
        if (info.modified) {
          formatted += `**Modified**: ${new Date(info.modified).toLocaleString()}\n`;
        }
      }
      
      // Mode switching
      if (result.newMode) {
        formatted += `**New Mode**: ${result.newMode}\n`;
      }
      
      // MCP Orchestration specific formatting
      if (result.action) {
        formatted += `**MCP Action**: ${result.action}\n`;
      }
      if (result.serverConfig) {
        formatted += `**Server Config**: ${result.serverConfig.id} (${result.serverConfig.type})\n`;
      }
      if (result.taskConfig) {
        formatted += `**Task Config**: ${result.taskConfig.id} with ${result.taskConfig.steps?.length || 0} steps\n`;
      }
      if (result.taskId) {
        formatted += `**Task ID**: ${result.taskId}\n`;
      }
      if (result.serverId) {
        formatted += `**Server ID**: ${result.serverId}\n`;
      }
      if (result.mcpTool) {
        formatted += `**MCP Tool**: ${result.mcpTool}\n`;
      }
      
      // Generic output/message
      if (result.output && !result.stdout) {
        formatted += `**Output**: ${result.output.substring(0, 300)}${result.output.length > 300 ? '...' : ''}\n`;
      }
      if (result.message) {
        formatted += `**Message**: ${result.message}\n`;
      }
      
      // GitHub-specific formatting
      if (result.action) {
        formatted += `**GitHub Action**: ${result.action}\n`;
      }
      if (result.result) {
        // Format GitHub API results nicely
        if (result.action === 'list_repositories' && Array.isArray(result.result)) {
          formatted += `**Repositories**: ${result.result.slice(0, 5).map((r: any) => r.name).join(', ')}${result.result.length > 5 ? '...' : ''}\n`;
        } else if (result.action === 'get_repository') {
          formatted += `**Repository**: ${result.result.full_name} (${result.result.visibility || result.result.private ? 'private' : 'public'})\n`;
          formatted += `**Description**: ${result.result.description || 'No description'}\n`;
        } else if (result.action === 'list_issues' && Array.isArray(result.result)) {
          formatted += `**Issues**: ${result.result.slice(0, 3).map((i: any) => `#${i.number} ${i.title}`).join(', ')}${result.result.length > 3 ? '...' : ''}\n`;
        } else if (result.result.name || result.result.title || result.result.login) {
          // Generic formatting for objects with name, title, or login
          const identifier = result.result.name || result.result.title || result.result.login;
          formatted += `**Result**: ${identifier}\n`;
        }
      }
    } else {
      formatted += "❌ **Status**: Failed\n";
      formatted += `**Error**: ${result.error || 'Unknown error'}\n`;
    }
    formatted += "\n";
  }
  
  return formatted;
}
