import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '../datasources/prisma-clients/chatbot';

const filePath = path.join(process.cwd(), 'data/system_prompt.json');

// Initialize Prisma client
const prisma = new PrismaClient();

export async function getPrompts() {
  try {
    // First try to get from database
    const prompt = await prisma.systemPrompt.findFirst({
      where: { 
        isDefault: true,
        isActive: true 
      },
      select: {
        coreSystemPrompt: true,
        toolKnowledgePrompt: true,
        name: true,
        version: true
      }
    });

    if (prompt) {
      return { 
        core_system_prompt: prompt.coreSystemPrompt,
        tool_knowledge_prompt: prompt.toolKnowledgePrompt,
        source: 'database',
        promptName: prompt.name,
        version: prompt.version
      };
    }

    // Fallback to file system if no database prompt found
    console.log('No default prompt in database, falling back to file system');
    const fileContent = readFileSync(filePath, 'utf-8');
    const { core_system_prompt, tool_knowledge_prompt } = JSON.parse(fileContent);
    
    return { 
      core_system_prompt, 
      tool_knowledge_prompt,
      source: 'file',
      promptName: 'legacy',
      version: '1.0.0'
    };
    
  } catch (error) {
    console.error('Error getting prompts from database, falling back to file:', error);
    
    try {
      // Final fallback to file system
      const fileContent = readFileSync(filePath, 'utf-8');
      const { core_system_prompt, tool_knowledge_prompt } = JSON.parse(fileContent);
      
      return { 
        core_system_prompt, 
        tool_knowledge_prompt,
        source: 'file_fallback',
        promptName: 'legacy',
        version: '1.0.0'
      };
    } catch (fileError) {
      console.error('Failed to read prompts from file as well:', fileError);
      throw new Error('Could not load system prompts from database or file');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Synchronous version for backward compatibility
export function getPromptsSync() {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const { core_system_prompt, tool_knowledge_prompt } = JSON.parse(fileContent);
    return { tool_knowledge_prompt, core_system_prompt };
  } catch (error) {
    console.error('Error reading prompts file:', error);
    return {
      core_system_prompt: 'You are a helpful AI assistant.',
      tool_knowledge_prompt: 'Use available tools to help the user.'
    };
  }
}
