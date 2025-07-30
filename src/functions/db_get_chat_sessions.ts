import { GSContext, GSStatus, GSDataSource } from "@godspeedsystems/core";

export default async function (ctx: GSContext, args: any) {
  try {
    const { datasources } = ctx;
    const prisma: GSDataSource = datasources.chatbot;

    console.log('Getting all chat sessions');

    // Get all chat sessions ordered by updatedAt (most recent first)
    const sessions = await prisma.execute(ctx, {
      meta: {
        entityType: 'ChatSession',
        method: 'findMany'
      },
      data: {
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
      }
    });

    console.log(`Found ${sessions.data?.length || 0} chat sessions`);

    return new GSStatus(true, 200, 'Chat sessions retrieved successfully', sessions.data);
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return new GSStatus(false, 500, 'Failed to get chat sessions', null, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
