import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { RAGPipeline } from '../helper/mcpRag';
import * as mcpTools from './mcp_tools';
import { githubMCPManager } from '../helper/github-mcp-client';

interface ChatBotConfig {
  mode: 'rag' | 'chat' | 'analysis' | 'development' | 'debug';
  enableFileOperations: boolean;
  enableCommandExecution: boolean;
  enableExternalMCP: boolean;
  maxOutputLength: number;
  workingDirectory?: string;
}

export default async function enhancedMCPChatBot(ctx: GSContext, args: PlainObject) {
  const query = ctx.inputs?.data?.body?.query;
  const config: ChatBotConfig = {
    mode: ctx.inputs?.data?.body?.mode || 'rag',
    enableFileOperations: ctx.inputs?.data?.body?.enableFileOperations ?? true,
    enableCommandExecution: ctx.inputs?.data?.body?.enableCommandExecution ?? false,
    enableExternalMCP: ctx.inputs?.data?.body?.enableExternalMCP ?? true,
    maxOutputLength: ctx.inputs?.data?.body?.maxOutputLength || 10000,
    workingDirectory: ctx.inputs?.data?.body?.workingDirectory
  };

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
  
  // File operations
  if (lowerQuery.includes('read file') || lowerQuery.includes('show file') || 
      lowerQuery.includes('file content') || lowerQuery.includes('display file')) {
    suggestedTools.push('read-file');
  }
  
  if (lowerQuery.includes('write file') || lowerQuery.includes('save file') || 
      lowerQuery.includes('create file') || lowerQuery.includes('update file')) {
    suggestedTools.push('write-file');
  }
  
  if (lowerQuery.includes('list files') || lowerQuery.includes('show directory') || 
      lowerQuery.includes('directory contents') || lowerQuery.includes('ls ')) {
    suggestedTools.push('list-directory');
  }
  
  if (lowerQuery.includes('file info') || lowerQuery.includes('file details') || 
      lowerQuery.includes('file metadata') || lowerQuery.includes('stat ')) {
    suggestedTools.push('get-file-info');
  }
  
  // Command execution
  if (lowerQuery.includes('run command') || lowerQuery.includes('execute') || 
      lowerQuery.includes('shell') || lowerQuery.includes('terminal')) {
    suggestedTools.push('execute-command');
  }
  
  // Mode switching
  if (lowerQuery.includes('switch mode') || lowerQuery.includes('change mode') || 
      lowerQuery.includes('set mode')) {
    suggestedTools.push('switch-mode');
  }
  
  // External MCP
  if (lowerQuery.includes('call mcp') || lowerQuery.includes('external service') || 
      lowerQuery.includes('remote tool')) {
    suggestedTools.push('call-mcp');
  }
  
  // GitHub operations
  if (lowerQuery.includes('github') || lowerQuery.includes('git') || 
      lowerQuery.includes('repository') || lowerQuery.includes('repo') ||
      lowerQuery.includes('commit') || lowerQuery.includes('pull request') ||
      lowerQuery.includes('issue') || lowerQuery.includes('branch')) {
    suggestedTools.push('github-mcp');
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
  return 'general_query';
}

async function handleToolBasedQuery(
  ctx: GSContext, 
  query: string, 
  toolIntent: any, 
  config: ChatBotConfig
): Promise<any> {
  const results: any[] = [];
  
  for (const tool of toolIntent.suggestedTools) {
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
              results.push({
                tool: 'execute-command',
                command,
                success: toolResult.success,
                output: toolResult.data?.output || toolResult.message,
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
              toolResult = await mcpTools.callMCP(ctx, {
                serverName,
                tool: mcpTool,
                args: args || {},
                timeout: 30000
              });
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
    /(?:in|from)\s+([^\s]+)\s+directory/i,    // "in src directory"
    /(?:in|from)\s+([^\s]+)\s+dir/i,          // "in src dir"
    /(?:in|from)\s+([^\s]+)\s+folder/i,       // "in src folder"
    /directory[:\s]+([^\s]+)/i,               // "directory: src"
    /folder[:\s]+([^\s]+)/i,                  // "folder: src"
    /dir[:\s]+([^\s]+)/i,                     // "dir: src"
    /"([^"]+\/?)"/,                           // "src/" or "src"
    /'([^']+\/?)''/,                          // 'src/' or 'src'
    /(?:list|show).*(?:in|from)\s+(\S+)/i     // "list files in src"
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractCommandFromQuery(query: string): string | null {
  const patterns = [
    /command[:\s]+"([^"]+)"/i,
    /command[:\s]+'([^']+)'/i,
    /run[:\s]+"([^"]+)"/i,
    /execute[:\s]+"([^"]+)"/i,
    /`([^`]+)`/  // `command`
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

function formatToolResults(results: any[]): string {
  let formatted = "## Tool Execution Results\n\n";
  
  for (const result of results) {
    formatted += `### ${result.tool}\n`;
    if (result.success) {
      formatted += "✅ **Status**: Success\n";
      if (result.content) {
        formatted += `**Content**: ${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}\n`;
      }
      if (result.files && result.files.length > 0) {
        formatted += `**Files**: ${result.files.slice(0, 10).join(', ')}${result.files.length > 10 ? '...' : ''}\n`;
      }
      if (result.directories && result.directories.length > 0) {
        formatted += `**Directories**: ${result.directories.slice(0, 10).join(', ')}${result.directories.length > 10 ? '...' : ''}\n`;
      }
      if (result.output) {
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
