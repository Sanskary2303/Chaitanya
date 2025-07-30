import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// Local tool for reading files
export default async function readFile(ctx: GSContext, args: PlainObject) {
  try {
    const { filePath, encoding = 'utf8' } = ctx.inputs?.data?.body?.body || {};
    
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
