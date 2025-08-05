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

    // If this prompt is already default, nothing to do
    if (existingPrompt.isDefault) {
      return new GSStatus(true, 200, undefined, {
        message: 'This prompt is already the default',
        prompt: existingPrompt
      });
    }

    // Unset all other defaults
    await prisma.systemPrompt.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });

    // Set this as default and ensure it's active
    const updatedPrompt = await prisma.systemPrompt.update({
      where: { id },
      data: { 
        isDefault: true,
        isActive: true
      }
    });

    return new GSStatus(true, 200, undefined, {
      message: 'Default system prompt updated successfully',
      prompt: updatedPrompt
    });

  } catch (error: any) {
    console.error('Error setting default system prompt:', error);
    return new GSStatus(false, 500, undefined, {
      error: 'Failed to set default system prompt',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
