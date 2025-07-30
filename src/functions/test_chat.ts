import { GSContext, GSStatus, GSDataSource } from '@godspeedsystems/core';

export default async function test_chat(ctx: GSContext): Promise<GSStatus> {
  const { ws, clientId, payload } = ctx.inputs.data;
  const prisma: GSDataSource = ctx.datasources.chatbot;

  // Add debug logging to see what we're receiving
  if (!ws || ws.readyState !== ws.OPEN) {
    ctx.logger.error(`WebSocket not connected: ${clientId}`);
    return new GSStatus(false, 400, 'WebSocket disconnected');
  }

  // Create or get chat session
  let sessionId = payload.sessionId;
  
  if (!sessionId) {
    // Create new session when sessionId is null
    try {
      const session = await prisma.execute(ctx, {
        meta: {
          entityType: 'ChatSession',
          method: 'create'
        },
        data: {
          title: 'New Chat Session',
          metadata: { clientId }
        }
      });
      sessionId = session.data.id;
      ctx.logger.info(`Created new session: ${sessionId}`);
      
      // Send session created event
      ws.send(JSON.stringify({
        eventtype: 'session_created',
        payload: { 
          sessionId: sessionId,
          title: 'New Chat Session'
        }
      }));
    } catch (error) {
      ctx.logger.error('Failed to create session:', error);
      ws.send(JSON.stringify({
        eventtype: 'error',
        payload: { message: 'Failed to create chat session' }
      }));
      return new GSStatus(false, 500, 'Failed to create chat session');
    }
  }

  const userMessage = payload.message;
  
  try {
    // Save user message to database
    await prisma.execute(ctx, {
      meta: {
        entityType: 'Message',
        method: 'create'
      },
      data: {
        sessionId: sessionId,
        content: userMessage,
        role: 'user',
        metadata: { timestamp: new Date().toISOString() }
      }
    });

    // Send user message acknowledgment
    ws.send(JSON.stringify({
      eventtype: 'user_message',
      payload: {
        sessionId: sessionId,
        message: userMessage,
        sender: 'user',
        timestamp: new Date().toISOString()
      }
    }));

    // Simple test response (since we don't have Google API key set up)
    const testResponse = `Thank you for your message: "${userMessage}". This is a test response. To enable full AI chat functionality, please set up your Google API key in the .env file.`;
    
    // Save AI response to database
    await prisma.execute(ctx, {
      meta: {
        entityType: 'Message',
        method: 'create'
      },
      data: {
        sessionId: sessionId,
        content: testResponse,
        role: 'assistant',
        metadata: { timestamp: new Date().toISOString() }
      }
    });

    // Send AI response
    ws.send(JSON.stringify({
      eventtype: 'ai_response',
      payload: {
        sessionId: sessionId,
        message: testResponse,
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }
    }));

    // Send completion event
    ws.send(JSON.stringify({
      eventtype: 'stream_complete',
      payload: {
        sessionId: sessionId
      }
    }));

    ctx.logger.info(`Test chat completed for session: ${sessionId}`);
    return new GSStatus(true, 200, 'Test chat completed');

  } catch (error) {
    ctx.logger.error('Test chat error:', error);
    ws.send(JSON.stringify({
      eventtype: 'error',
      payload: { 
        message: 'Test chat failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }));
    return new GSStatus(false, 500, 'Test chat failed');
  }
}
