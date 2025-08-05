import { GSContext, GSStatus } from '@godspeedsystems/core';
import { PrismaClient } from '../../datasources/prisma-clients/chatbot';

const prisma = new PrismaClient();

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const {
      inputs: {
        data: {
          params: { id },
          query: { 
            category,
            isActive,
            search,
            limit = 50,
            offset = 0
          },
        },
      },
    } = ctx;

    let whereClause: any = {};

    // If specific ID is requested
    if (id) {
      const systemPrompt = await prisma.systemPrompt.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          coreSystemPrompt: true,
          toolKnowledgePrompt: true,
          category: true,
          tags: true,
          version: true,
          createdBy: true,
          isActive: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
          metadata: true
        }
      });

      if (!systemPrompt) {
        return new GSStatus(false, 404, undefined, {
          error: 'System prompt not found'
        });
      }

      return new GSStatus(true, 200, undefined, {
        prompt: systemPrompt
      });
    }

    // Build where clause for filtering
    if (category) {
      whereClause.category = category;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { coreSystemPrompt: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.systemPrompt.count({
      where: whereClause
    });

    // Get prompts with pagination
    const systemPrompts = await prisma.systemPrompt.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        version: true,
        createdBy: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
        // Only include prompt content if explicitly requested
        ...(ctx.inputs.data.query?.includeContent === 'true' && {
          coreSystemPrompt: true,
          toolKnowledgePrompt: true
        })
      },
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: parseInt(limit.toString()),
      skip: parseInt(offset.toString())
    });

    return new GSStatus(true, 200, undefined, {
      prompts: systemPrompts,
      pagination: {
        total: totalCount,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: parseInt(offset.toString()) + parseInt(limit.toString()) < totalCount
      }
    });

  } catch (error: any) {
    console.error('Error listing system prompts:', error);
    return new GSStatus(false, 500, undefined, {
      error: 'Failed to list system prompts',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
