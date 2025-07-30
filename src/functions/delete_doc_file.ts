import {
  GSContext,
  GSStatus,
  PlainObject,
  logger,
} from '@godspeedsystems/core';
import { HybridVectorStore } from '../helper/hybridVectorStore';
import { deleteFileMetadata } from './upload_docs_fn';
import { requireAuth } from '../helper/auth';

export default async function del_repo_files(ctx: GSContext) {
  // Check authentication first
  const authResult = requireAuth(ctx);
  if (authResult) {
    return authResult;
  }
  const { id } = ctx.inputs.data.params;
  const vs = new HybridVectorStore(ctx);
  logger.info('Unique id : ', id);
  try {
    await vs.removeDocument(id);
    await deleteFileMetadata(id);
    return new GSStatus(
      true,
      200,
      `Successfully deleted file with uniqueId ${id}`,
    );
  } catch (err) {
    return new GSStatus(false, 400, undefined, { error: err });
  }
}
