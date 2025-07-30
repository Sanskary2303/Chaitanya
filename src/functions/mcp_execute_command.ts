import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Local tool for executing commands with output capture
export default async function executeCommand(ctx: GSContext, args: PlainObject) {
  try {
    const { command, timeout = 30000, cwd, env } = ctx.inputs?.data?.body?.body || {};
    
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
      command: ctx.inputs?.data?.body?.body?.command,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      success: false
    });
  }
}
