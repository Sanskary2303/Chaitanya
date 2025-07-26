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

    logger.info(`Retrieved ${messages.data?.length || 0} messages for session ${params.sessionId}`);
    
    // Return the complete response object directly to match schema
    const response = {
      success: true,
      code: 200,
      message: 'Chat history retrieved',
      data: messages.data || []
    };
    
    logger.debug('Returning response:', JSON.stringify(response));
    return response;
  } catch (error) {
    logger.error('Error getting chat history:', error);
    return {
      success: false,
      code: 500,
      message: 'Failed to get chat history',
      data: []
    };
  }
}
