import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';

/**
 * Update document status after processing
 */
export default async function update_document_status(ctx: GSContext): Promise<GSStatus> {
  const { 
    inputs: { data: { body } }, 
    datasources, 
    logger 
  } = ctx;
  
  const prisma: GSDataSource = datasources.chatbot;
  
  try {
    const document = await prisma.execute(ctx, {
      meta: {
        entityType: 'Document',
        method: 'update'
      },
      where: {
        id: body.documentId
      },
      data: {
        status: body.status, // 'COMPLETED', 'FAILED', etc.
        extractedText: body.extractedText || undefined,
        metadata: body.metadata || undefined
      }
    });

    logger.info('Document status updated:', document.data.id, body.status);
    return new GSStatus(true, 200, 'Document status updated', document.data);
  } catch (error) {
    logger.error('Error updating document status:', error);
    return new GSStatus(false, 500, 'Failed to update document status');
  }
}
