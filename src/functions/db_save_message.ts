import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';

/**
 * Save a message to the database
 */
export default async function save_message(ctx: GSContext): Promise<GSStatus> {
  const { 
    inputs: { data: { body } }, 
    datasources, 
    logger 
  } = ctx;
  
  const prisma: GSDataSource = datasources.chatbot;
  
  try {
    const message = await prisma.execute(ctx, {
      meta: {
        entityType: 'Message',
        method: 'create'
      },
      data: {
        sessionId: body.sessionId,
        role: body.role, // 'USER' or 'ASSISTANT'
        content: body.content,
        metadata: body.metadata || {}
      }
    });

    logger.info('Message saved:', message.data.id);
    return new GSStatus(true, 201, 'Message saved', message.data);
  } catch (error) {
    logger.error('Error saving message:', error);
    return new GSStatus(false, 500, 'Failed to save message');
  }
}
