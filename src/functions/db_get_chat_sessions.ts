import { GSContext, GSStatus } from "@godspeedsystems/core";

export default async function (ctx: GSContext, args: any) {
  try {
    const { datasources } = ctx;
    const chatbot = datasources.chatbot;

    console.log('Getting all chat sessions');

    // Get all chat sessions ordered by updatedAt (most recent first)
    const sessions = await chatbot.chatSession.findMany({
      select: {
        id: true,
        title: true,
        isActive: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    console.log(`Found ${sessions.length} chat sessions`);

    return new GSStatus(true, 200, 'Chat sessions retrieved successfully', sessions);
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return new GSStatus(false, 500, 'Failed to get chat sessions', null, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
