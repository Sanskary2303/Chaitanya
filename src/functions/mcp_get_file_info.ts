import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// Local tool for getting file/directory information
export default async function getFileInfo(ctx: GSContext, args: PlainObject) {
  try {
    const { filePath } = ctx.inputs?.data?.body?.body || {};
    
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
