import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';

/**
 * Save document metadata to database
 */
export default async function save_document(ctx: GSContext): Promise<GSStatus> {
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
        method: 'create'
      },
      data: {
        userId: body.userId || null,
        filename: body.filename,
        originalName: body.originalName,
        mimeType: body.mimeType,
        size: body.size,
        content: body.content || null,
        extractedText: body.extractedText || null,
        uploadPath: body.uploadPath || null,
        metadata: body.metadata || {},
        status: 'PROCESSING'
      }
    });

    logger.info('Document metadata saved:', document.data.id);
    return new GSStatus(true, 201, 'Document metadata saved', document.data);
  } catch (error) {
    logger.error('Error saving document metadata:', error);
    return new GSStatus(false, 500, 'Failed to save document metadata');
  }
}
