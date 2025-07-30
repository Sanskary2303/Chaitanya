import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// Local tool for writing files
export default async function writeFile(ctx: GSContext, args: PlainObject) {
  try {
    const { filePath, content, encoding = 'utf8', createDirs = false } = ctx.inputs?.data?.body?.body || {};
    
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
