import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// Local tool for listing directory contents
export default async function listDirectory(ctx: GSContext, args: PlainObject) {
  try {
    const { dirPath = '.', includeHidden = false, recursive = false } = ctx.inputs?.data?.body?.body || {};
    
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
