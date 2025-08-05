import { GSContext, GSStatus } from '@godspeedsystems/core';
import { PrismaClient } from '../../datasources/prisma-clients/chatbot';

const prisma = new PrismaClient();

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const {
      inputs: {
        data: {
          query: { 
            promptId,
            promptName 
          },
        },
      },
    } = ctx;

    let prompt;

    if (promptId) {
      // Get specific prompt by ID
      prompt = await prisma.systemPrompt.findUnique({
        where: { 
          id: promptId,
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          coreSystemPrompt: true,
          toolKnowledgePrompt: true,
          category: true,
          version: true,
          isDefault: true
        }
      });
    } else if (promptName) {
      // Get prompt by name
      prompt = await prisma.systemPrompt.findFirst({
        where: { 
          name: promptName,
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          coreSystemPrompt: true,
          toolKnowledgePrompt: true,
          category: true,
          version: true,
          isDefault: true
        }
      });
    } else {
      // Get default prompt
      prompt = await prisma.systemPrompt.findFirst({
        where: { 
          isDefault: true,
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          coreSystemPrompt: true,
          toolKnowledgePrompt: true,
          category: true,
          version: true,
          isDefault: true
        }
      });

      // If no default found, get the most recently updated active prompt
      if (!prompt) {
        prompt = await prisma.systemPrompt.findFirst({
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            coreSystemPrompt: true,
            toolKnowledgePrompt: true,
            category: true,
            version: true,
            isDefault: true
          }
        });
      }
    }

    if (!prompt) {
      return new GSStatus(false, 404, undefined, {
        error: 'No active system prompt found',
        suggestion: 'Create a system prompt first'
      });
    }

    // Return both the formatted legacy format and the new format
    return new GSStatus(true, 200, undefined, {
      // Legacy format for backward compatibility
      core_system_prompt: prompt.coreSystemPrompt,
      tool_knowledge_prompt: prompt.toolKnowledgePrompt,
      
      // New detailed format
      prompt: {
        id: prompt.id,
        name: prompt.name,
        coreSystemPrompt: prompt.coreSystemPrompt,
        toolKnowledgePrompt: prompt.toolKnowledgePrompt,
        category: prompt.category,
        version: prompt.version,
        isDefault: prompt.isDefault
      }
    });

  } catch (error: any) {
    console.error('Error getting active system prompt:', error);
    return new GSStatus(false, 500, undefined, {
      error: 'Failed to get active system prompt',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
