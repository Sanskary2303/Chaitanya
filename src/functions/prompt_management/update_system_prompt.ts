import { GSContext, GSStatus } from '@godspeedsystems/core';
import { PrismaClient } from '../../datasources/prisma-clients/chatbot';

const prisma = new PrismaClient();

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const {
      inputs: {
        data: {
          params: { id },
          body: { 
            name, 
            description, 
            coreSystemPrompt, 
            toolKnowledgePrompt, 
            category,
            tags,
            version,
            isDefault,
            isActive
          },
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

    // If setting as default, unset other defaults
    if (isDefault === true) {
      await prisma.systemPrompt.updateMany({
        where: { 
          id: { not: id },
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (coreSystemPrompt !== undefined) updateData.coreSystemPrompt = coreSystemPrompt;
    if (toolKnowledgePrompt !== undefined) updateData.toolKnowledgePrompt = toolKnowledgePrompt;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (version !== undefined) updateData.version = version;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update metadata
    updateData.metadata = {
      ...existingPrompt.metadata as any,
      lastUpdatedVia: 'api',
      lastUpdate: new Date().toISOString()
    };

    if (coreSystemPrompt || toolKnowledgePrompt) {
      updateData.metadata.promptLength = 
        (coreSystemPrompt || existingPrompt.coreSystemPrompt).length +
        (toolKnowledgePrompt || existingPrompt.toolKnowledgePrompt).length;
    }

    // Update the system prompt
    const updatedPrompt = await prisma.systemPrompt.update({
      where: { id },
      data: updateData
    });

    return new GSStatus(true, 200, undefined, {
      message: 'System prompt updated successfully',
      prompt: updatedPrompt
    });

  } catch (error: any) {
    console.error('Error updating system prompt:', error);
    
    if (error.code === 'P2002') {
      return new GSStatus(false, 409, undefined, {
        error: 'A system prompt with this name already exists'
      });
    }

    return new GSStatus(false, 500, undefined, {
      error: 'Failed to update system prompt',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
