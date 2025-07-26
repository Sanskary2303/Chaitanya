import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';

/**
 * Create a new chat session
 */
export default async function create_chat_session(ctx: GSContext): Promise<GSStatus> {
  const { 
    inputs: { data: { body } }, 
    datasources, 
    logger 
  } = ctx;
  
  const prisma: GSDataSource = datasources.chatbot;
  
  try {
    const session = await prisma.execute(ctx, {
      meta: {
        entityType: 'ChatSession',
        method: 'create'
      },
      data: {
        userId: body.userId || null,
        title: body.title || 'New Chat',
        metadata: body.metadata || {}
      }
    });

    logger.info('Chat session created:', session.data.id);
    return new GSStatus(true, 201, 'Chat session created', session.data);
  } catch (error) {
    logger.error('Error creating chat session:', error);
    return new GSStatus(false, 500, 'Failed to create chat session');
  }
}
