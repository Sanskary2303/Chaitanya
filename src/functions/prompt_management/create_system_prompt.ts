import { GSContext, GSStatus } from '@godspeedsystems/core';
import { PrismaClient } from '../../datasources/prisma-clients/chatbot';

const prisma = new PrismaClient();

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const {
      inputs: {
        data: {
          body: { 
            name, 
            description, 
            coreSystemPrompt, 
            toolKnowledgePrompt, 
            category = 'general',
            tags = [],
            version = '1.0.0',
            createdBy,
            isDefault = false,
            isActive = true
          },
        },
      },
    } = ctx;

    // Validate required fields
    if (!name || !coreSystemPrompt || !toolKnowledgePrompt) {
      return new GSStatus(false, 400, undefined, {
        error: 'Missing required fields: name, coreSystemPrompt, toolKnowledgePrompt'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.systemPrompt.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create the new system prompt
    const systemPrompt = await prisma.systemPrompt.create({
      data: {
        name,
        description,
        coreSystemPrompt,
        toolKnowledgePrompt,
        category,
        tags,
        version,
        createdBy,
        isDefault,
        isActive,
        metadata: {
          createdVia: 'api',
          promptLength: coreSystemPrompt.length + toolKnowledgePrompt.length
        }
      }
    });

    return new GSStatus(true, 201, undefined, {
      message: 'System prompt created successfully',
      prompt: systemPrompt
    });

  } catch (error: any) {
    console.error('Error creating system prompt:', error);
    
    if (error.code === 'P2002') {
      return new GSStatus(false, 409, undefined, {
        error: 'A system prompt with this name already exists'
      });
    }

    return new GSStatus(false, 500, undefined, {
      error: 'Failed to create system prompt',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
