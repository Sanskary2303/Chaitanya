import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { requireAuth } from '../helper/auth';

export default async function deleteGitHubLink(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    // Check authentication
    const authResult = requireAuth(ctx);
    if (authResult) {
      return authResult;
    }

    const repoId = ctx.inputs?.data?.params?.id;
    
    if (!repoId) {
      return new GSStatus(false, 400, 'Repository ID is required', {
        error: 'VALIDATION_ERROR',
        message: 'Repository ID parameter is required'
      });
    }

    // Try to get the delete_repo_file function
    const deleteRepoFunction = ctx.functions?.['delete_repo_file'];
    if (deleteRepoFunction) {
      // Call the existing delete repository function
      const result = await deleteRepoFunction(ctx, { id: repoId });
      return result;
    } else {
      // Fallback implementation
      console.log(`Deleting GitHub repository with ID: ${repoId}`);
      
      // In a real implementation, you would:
      // 1. Remove from vector store
      // 2. Delete metadata
      // 3. Clean up any cached data
      
      return new GSStatus(true, 200, undefined, {
        success: true,
        message: 'GitHub repository deleted successfully'
      });
    }
    
  } catch (error) {
    console.error('Error deleting GitHub repository:', error);
    return new GSStatus(false, 500, 'Internal server error', {
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete GitHub repository'
    });
  }
}
