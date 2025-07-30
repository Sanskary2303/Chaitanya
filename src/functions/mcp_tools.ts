import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { RAGPipeline } from '../helper/mcpRag';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handleQuery(ctx: GSContext, args: PlainObject) {
  const query = ctx.inputs?.data?.body?.body?.query;

  if (!query || typeof query !== 'string') {
    return new GSStatus(false, 400, 'Invalid query');
  }

  const rag = new RAGPipeline(ctx);
  const result = await rag.run(query);

  return new GSStatus(true, 200, undefined, result);
}

// Local tool for reading files
export async function readFile(ctx: GSContext, args: PlainObject) {
  try {
    const { filePath, encoding = 'utf8' } = args;
    
    if (!filePath || typeof filePath !== 'string') {
      return new GSStatus(false, 400, 'File path is required');
    }

    // Security check: prevent reading outside of project directory
    const projectRoot = process.cwd();
    const absolutePath = path.resolve(projectRoot, filePath);
    
    if (!absolutePath.startsWith(projectRoot)) {
      return new GSStatus(false, 403, 'Access denied: Cannot read files outside project directory');
    }

    const content = await fs.readFile(absolutePath, encoding as BufferEncoding);
    
    return new GSStatus(true, 200, 'File read successfully', {
      filePath: absolutePath,
      content,
      size: content.length,
      encoding
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to read file: ${error.message}`);
  }
}

// Local tool for writing files
export async function writeFile(ctx: GSContext, args: PlainObject) {
  try {
    const { filePath, content, encoding = 'utf8', createDirs = false } = args;
    
    if (!filePath || typeof filePath !== 'string') {
      return new GSStatus(false, 400, 'File path is required');
    }
    
    if (content === undefined || content === null) {
      return new GSStatus(false, 400, 'Content is required');
    }

    // Security check: prevent writing outside of project directory
    const projectRoot = process.cwd();
    const absolutePath = path.resolve(projectRoot, filePath);
    
    if (!absolutePath.startsWith(projectRoot)) {
      return new GSStatus(false, 403, 'Access denied: Cannot write files outside project directory');
    }

    // Create directories if requested
    if (createDirs) {
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(absolutePath, content, encoding as BufferEncoding);
    
    return new GSStatus(true, 200, 'File written successfully', {
      filePath: absolutePath,
      size: content.length,
      encoding
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to write file: ${error.message}`);
  }
}

// Local tool for executing commands with output capture
export async function executeCommand(ctx: GSContext, args: PlainObject) {
  try {
    const { command, timeout = 30000, cwd, env } = args;
    
    if (!command || typeof command !== 'string') {
      return new GSStatus(false, 400, 'Command is required');
    }

    // Security check: prevent dangerous commands
    const dangerousCommands = ['rm -rf', 'del /s', 'format', 'mkfs', 'dd if=', 'sudo'];
    const isDangerous = dangerousCommands.some(dangerous => 
      command.toLowerCase().includes(dangerous.toLowerCase())
    );
    
    if (isDangerous) {
      return new GSStatus(false, 403, 'Command contains potentially dangerous operations');
    }

    const options: any = {
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    };
    
    if (cwd) options.cwd = cwd;
    if (env) options.env = { ...process.env, ...env };

    const { stdout, stderr } = await execAsync(command, options);
    
    return new GSStatus(true, 200, 'Command executed successfully', {
      command,
      stdout,
      stderr,
      success: true
    });
  } catch (error: any) {
    return new GSStatus(false, 500, 'Command execution failed', {
      command: args.command,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      success: false
    });
  }
}

// Local tool for listing directory contents
export async function listDirectory(ctx: GSContext, args: PlainObject) {
  try {
    const { dirPath = '.', includeHidden = false, recursive = false } = args;
    
    if (!dirPath || typeof dirPath !== 'string') {
      return new GSStatus(false, 400, 'Directory path is required');
    }

    // Security check: prevent listing outside of project directory
    const projectRoot = process.cwd();
    const absolutePath = path.resolve(projectRoot, dirPath);
    
    if (!absolutePath.startsWith(projectRoot)) {
      return new GSStatus(false, 403, 'Access denied: Cannot list directories outside project directory');
    }

    async function getDirectoryContents(currentPath: string, depth = 0): Promise<any[]> {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      const results = [];

      for (const item of items) {
        if (!includeHidden && item.name.startsWith('.')) continue;
        
        const itemPath = path.join(currentPath, item.name);
        const relativePath = path.relative(projectRoot, itemPath);
        const stat = await fs.stat(itemPath);
        
        const itemInfo = {
          name: item.name,
          path: relativePath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modified: stat.mtime,
          created: stat.birthtime
        };

        results.push(itemInfo);

        if (recursive && item.isDirectory() && depth < 10) { // Limit recursion depth
          const subItems = await getDirectoryContents(itemPath, depth + 1);
          results.push(...subItems);
        }
      }

      return results;
    }

    const contents = await getDirectoryContents(absolutePath);
    
    return new GSStatus(true, 200, 'Directory listed successfully', {
      path: absolutePath,
      relativePath: path.relative(projectRoot, absolutePath),
      contents,
      totalItems: contents.length
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to list directory: ${error.message}`);
  }
}

// Local tool for getting file/directory information
export async function getFileInfo(ctx: GSContext, args: PlainObject) {
  try {
    const { filePath } = args;
    
    if (!filePath || typeof filePath !== 'string') {
      return new GSStatus(false, 400, 'File path is required');
    }

    // Security check: prevent accessing outside of project directory
    const projectRoot = process.cwd();
    const absolutePath = path.resolve(projectRoot, filePath);
    
    if (!absolutePath.startsWith(projectRoot)) {
      return new GSStatus(false, 403, 'Access denied: Cannot access files outside project directory');
    }

    const stat = await fs.stat(absolutePath);
    const parsed = path.parse(absolutePath);
    
    return new GSStatus(true, 200, 'File info retrieved successfully', {
      path: absolutePath,
      relativePath: path.relative(projectRoot, absolutePath),
      name: parsed.name,
      extension: parsed.ext,
      directory: parsed.dir,
      size: stat.size,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      modified: stat.mtime,
      created: stat.birthtime,
      accessed: stat.atime,
      permissions: stat.mode
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to get file info: ${error.message}`);
  }
}

// Local tool for switching operation modes
export async function switchMode(ctx: GSContext, args: PlainObject) {
  try {
    const { mode, config = {} } = args;
    
    if (!mode || typeof mode !== 'string') {
      return new GSStatus(false, 400, 'Mode is required');
    }

    const validModes = ['rag', 'chat', 'analysis', 'development', 'debug'];
    
    if (!validModes.includes(mode)) {
      return new GSStatus(false, 400, `Invalid mode. Valid modes: ${validModes.join(', ')}`);
    }

    // Store mode in context or session
    // This could be extended to actually change system behavior
    const modeConfig = {
      mode,
      timestamp: new Date().toISOString(),
      config,
      description: getModeDescription(mode)
    };
    
    return new GSStatus(true, 200, `Switched to ${mode} mode`, {
      previousMode: (ctx as any).state?.currentMode || 'default',
      currentMode: mode,
      config: modeConfig
    });
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to switch mode: ${error.message}`);
  }
}

function getModeDescription(mode: string): string {
  const descriptions = {
    rag: 'Retrieval-Augmented Generation mode for knowledge-based queries',
    chat: 'Interactive chat mode for conversational AI',
    analysis: 'Code and data analysis mode',
    development: 'Development assistance mode',
    debug: 'Debug and troubleshooting mode'
  };
  return descriptions[mode as keyof typeof descriptions] || 'Unknown mode';
}

// Local tool for making MCP calls to other servers
export async function callMCP(ctx: GSContext, args: PlainObject) {
  try {
    const { server, tool, parameters = {}, timeout = 30000 } = args;
    
    if (!server || typeof server !== 'string') {
      return new GSStatus(false, 400, 'MCP server identifier is required');
    }
    
    if (!tool || typeof tool !== 'string') {
      return new GSStatus(false, 400, 'Tool name is required');
    }

    // Handle GitHub MCP server specifically
    if (server === 'github') {
      return await callGitHubMCP(tool, parameters);
    }
    
    // For other MCP servers, implement generic MCP client
    // This would connect to actual MCP servers via stdio or HTTP
    const mockResult = {
      server,
      tool,
      parameters,
      timestamp: new Date().toISOString(),
      status: 'simulated',
      message: `MCP call to ${server}/${tool} - Implement actual MCP client for this server type.`
    };
    
    return new GSStatus(true, 200, 'MCP call completed (simulated)', mockResult);
  } catch (error: any) {
    return new GSStatus(false, 500, `Failed to call MCP: ${error.message}`);
  }
}

async function callGitHubMCP(tool: string, parameters: any): Promise<GSStatus> {
  try {
    // GitHub token should be set in environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return new GSStatus(false, 401, 'GitHub token not configured. Set GITHUB_TOKEN environment variable.');
    }
    
    const baseUrl = 'https://api.github.com';
    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Enhanced-MCP-ChatBot/1.0'
    };
    
    let url: string;
    let method = 'GET';
    let body: any = null;
    
    switch (tool) {
      case 'get_repository':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}`;
        break;
        
      case 'list_repositories':
        if (parameters.username) {
          url = `${baseUrl}/users/${parameters.username}/repos`;
        } else {
          url = `${baseUrl}/user/repos`;
        }
        break;
        
      case 'create_repository':
        url = `${baseUrl}/user/repos`;
        method = 'POST';
        body = {
          name: parameters.name,
          private: parameters.private || false,
          description: parameters.description || '',
          auto_init: true
        };
        break;
        
      case 'list_issues':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/issues`;
        if (parameters.state) {
          url += `?state=${parameters.state}`;
        }
        break;
        
      case 'create_issue':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/issues`;
        method = 'POST';
        body = {
          title: parameters.title,
          body: parameters.body || '',
          labels: parameters.labels || []
        };
        break;
        
      case 'list_pull_requests':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/pulls`;
        if (parameters.state) {
          url += `?state=${parameters.state}`;
        }
        break;
        
      case 'create_pull_request':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/pulls`;
        method = 'POST';
        body = {
          title: parameters.title,
          head: parameters.head,
          base: parameters.base || 'main',
          body: parameters.body || ''
        };
        break;
        
      case 'get_file_contents':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/contents/${parameters.path}`;
        break;
        
      case 'list_commits':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/commits`;
        if (parameters.sha) {
          url += `?sha=${parameters.sha}`;
        }
        break;
        
      case 'list_branches':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/branches`;
        break;
        
      case 'create_branch':
        url = `${baseUrl}/repos/${parameters.owner}/${parameters.repo}/git/refs`;
        method = 'POST';
        body = {
          ref: parameters.ref,
          sha: parameters.sha
        };
        break;
        
      case 'get_user':
        if (parameters.username) {
          url = `${baseUrl}/users/${parameters.username}`;
        } else {
          url = `${baseUrl}/user`;
        }
        break;
        
      case 'search_repositories':
        url = `${baseUrl}/search/repositories?q=${encodeURIComponent(parameters.q)}`;
        break;
        
      default:
        return new GSStatus(false, 400, `Unknown GitHub tool: ${tool}`);
    }
    
    // Make the API request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      return new GSStatus(false, response.status, `GitHub API error: ${response.statusText}`, {
        error: errorData.message || 'Unknown error',
        documentation_url: errorData.documentation_url
      });
    }
    
    const data = await response.json();
    
    return new GSStatus(true, 200, `GitHub ${tool} completed successfully`, {
      tool,
      parameters,
      result: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return new GSStatus(false, 500, `GitHub MCP error: ${error.message}`);
  }
}

// Export all tools for easy access
export const mcpTools = {
  handleQuery,
  readFile,
  writeFile,
  executeCommand,
  listDirectory,
  getFileInfo,
  switchMode,
  callMCP
};
