import { GSContext, GSStatus } from '@godspeedsystems/core';
import { PrismaClient } from '../../datasources/prisma-clients/chatbot';

const prisma = new PrismaClient();

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const {
      inputs: {
        data: {
          params: { id },
        },
      },
    } = ctx;

    // Check if prompt exists
    const existingPrompt = await prisma.systemPrompt.findUnique({
      where: { id }
    });

    if (!existingPrompt) {
      return new GSStatus(false, 404, undefined, {
        error: 'System prompt not found'
      });
    }

    // Don't allow deletion of default prompt
    if (existingPrompt.isDefault) {
      return new GSStatus(false, 400, undefined, {
        error: 'Cannot delete the default system prompt. Set another prompt as default first.'
      });
    }

    // Delete the system prompt
    await prisma.systemPrompt.delete({
      where: { id }
    });

    return new GSStatus(true, 200, undefined, {
      message: 'System prompt deleted successfully',
      deletedId: id
    });

  } catch (error: any) {
    console.error('Error deleting system prompt:', error);
    return new GSStatus(false, 500, undefined, {
      error: 'Failed to delete system prompt',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
