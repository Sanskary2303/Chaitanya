import { GSContext, GSStatus } from "@godspeedsystems/core";

export default async function (ctx: GSContext, args: any) {
  try {
    const { 
      inputs: { data: { params } }, 
      datasources 
    } = ctx;
    const chatbot = datasources.chatbot;
    const { sessionId } = params;

    console.log('Deleting chat session:', sessionId);

    // First check if session exists
    const existingSession = await chatbot.chatSession.findUnique({
      where: { id: sessionId }
    });

    if (!existingSession) {
      return new GSStatus(false, 404, 'Chat session not found', null);
    }

    // Delete all messages in the session first (due to foreign key constraints)
    await chatbot.message.deleteMany({
      where: { sessionId: sessionId }
    });

    // Then delete the session
    const deletedSession = await chatbot.chatSession.delete({
      where: { id: sessionId }
    });

    console.log(`Chat session ${sessionId} deleted successfully`);

    return new GSStatus(true, 200, 'Chat session deleted successfully', deletedSession);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return new GSStatus(false, 500, 'Failed to delete chat session', null, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
