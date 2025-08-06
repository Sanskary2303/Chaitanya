import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';

/**
 * Get chat history for a session
 */
export default async function get_chat_history(ctx: GSContext): Promise<any> {
  const { 
    inputs: { data: { params } }, 
    datasources, 
    logger 
  } = ctx;
  
  const prisma: GSDataSource = datasources.chatbot;
  
  try {
    const messages = await prisma.execute(ctx, {
      meta: {
        entityType: 'Message',
        method: 'findMany'
      },
      where: {
        sessionId: params.sessionId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    logger.info(`Retrieved ${messages?.length || 0} messages for session ${params.sessionId}`);
    
    return new GSStatus(true, 200, 'Chat history retrieved', messages);
  } catch (error) {
    logger.error('Error getting chat history:', error);
    return new GSStatus(false, 500, 'Failed to get chat history', null, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
