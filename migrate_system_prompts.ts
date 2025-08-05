import { PrismaClient } from './src/datasources/prisma-clients/chatbot';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function migrateSystemPrompts() {
  try {
    console.log('🔄 Starting system prompt migration...');

    // Check if there are any existing prompts in database
    const existingPrompts = await prisma.systemPrompt.count();
    
    if (existingPrompts > 0) {
      console.log(`📋 Found ${existingPrompts} existing prompts in database.`);
      console.log('ℹ️  Migration skipped - database already has prompts.');
      return;
    }

    // Read from the legacy file
    const filePath = path.join(process.cwd(), 'data/system_prompt.json');
    
    if (!existsSync(filePath)) {
      console.log('⚠️  No legacy system_prompt.json file found.');
      console.log('🎯 Creating default system prompt...');
      
      // Create a default prompt
      const defaultPrompt = await prisma.systemPrompt.create({
        data: {
          name: 'Default Assistant',
          description: 'Default system prompt for the AI assistant',
          coreSystemPrompt: 'You are Chaitanya, an AI assistant with enhanced capabilities including GitHub integration and document search.\n\nYour capabilities include:\n- Accessing GitHub repositories, issues, commits, and user information\n- Searching and retrieving information from uploaded documents\n- General conversation and assistance\n\nWhen responding to the user:\n- Be conversational, clear, and helpful\n- For GitHub-related queries (repositories, issues, commits, user info), use the GitHub MCP tools\n- For document-related questions, use the get_relevant_docs tool\n- Think before answering and choose the most appropriate tool',
          toolKnowledgePrompt: 'You are an enhanced AI assistant with GitHub MCP integration and document search capabilities.\n\nYour available tools:\n\n1. \'get_relevant_docs\' - Retrieves information from uploaded documents\n   - Use for technical documentation questions\n   - Returns \'context\' and \'source_files\'\n\n2. GitHub MCP tools - Access GitHub API functionality\n   - get_user: Get GitHub profile information\n   - list_repositories: List user\'s repositories\n   - list_issues: Get issues from specific repository (requires owner/repo)\n   - list_commits: Get commit history (requires owner/repo)\n   - list_branches: Get repository branches (requires owner/repo)\n\nAlways use the appropriate tool based on the user\'s query. For GitHub operations, be sure to include repository owner and name when needed (format: owner/repo).\n\nProvide clear, helpful responses and reference source information when available.',
          category: 'general',
          tags: ['default', 'assistant', 'github'],
          version: '1.0.0',
          createdBy: 'migration',
          isDefault: true,
          isActive: true,
          metadata: {
            migratedAt: new Date().toISOString(),
            source: 'default_creation'
          }
        }
      });

      console.log('✅ Created default system prompt:', defaultPrompt.name);
      return;
    }

    // Read and migrate from file
    const fileContent = readFileSync(filePath, 'utf-8');
    const { core_system_prompt, tool_knowledge_prompt } = JSON.parse(fileContent);

    // Create the migrated prompt
    const migratedPrompt = await prisma.systemPrompt.create({
      data: {
        name: 'Legacy Default',
        description: 'Migrated from legacy system_prompt.json file',
        coreSystemPrompt: core_system_prompt,
        toolKnowledgePrompt: tool_knowledge_prompt,
        category: 'general',
        tags: ['legacy', 'migrated'],
        version: '1.0.0',
        createdBy: 'migration',
        isDefault: true,
        isActive: true,
        metadata: {
          migratedAt: new Date().toISOString(),
          source: 'file_migration',
          originalFile: filePath
        }
      }
    });

    console.log('✅ Successfully migrated system prompt to database:');
    console.log(`   - ID: ${migratedPrompt.id}`);
    console.log(`   - Name: ${migratedPrompt.name}`);
    console.log(`   - Version: ${migratedPrompt.version}`);
    console.log(`   - Is Default: ${migratedPrompt.isDefault}`);

    // Also create some example prompts for different use cases
    const githubFocused = await prisma.systemPrompt.create({
      data: {
        name: 'GitHub Specialist',
        description: 'Specialized prompt for GitHub operations and development workflows',
        coreSystemPrompt: 'You are a GitHub-focused AI assistant specialized in repository management, code review, and development workflows.\n\nYour primary expertise includes:\n- Repository analysis and management\n- Issue tracking and project planning\n- Code review and pull request assistance\n- CI/CD workflow optimization\n- GitHub API operations\n\nApproach every query with a focus on GitHub best practices and development efficiency.',
        toolKnowledgePrompt: 'You are a GitHub specialist with access to comprehensive GitHub MCP tools.\n\nPriority tools for GitHub operations:\n- Repository management (create, fork, clone)\n- Issue and PR workflows\n- Branch and commit operations\n- Code scanning and security alerts\n- Actions and workflow management\n\nAlways suggest GitHub best practices and efficient workflows in your responses.',
        category: 'development',
        tags: ['github', 'development', 'specialist'],
        version: '1.0.0',
        createdBy: 'migration',
        isDefault: false,
        isActive: true,
        metadata: {
          migratedAt: new Date().toISOString(),
          source: 'example_creation'
        }
      }
    });

    const documentAnalyst = await prisma.systemPrompt.create({
      data: {
        name: 'Document Analyst',
        description: 'Specialized for document analysis and research tasks',
        coreSystemPrompt: 'You are a document analysis specialist focused on extracting insights from uploaded documents and performing research tasks.\n\nYour core capabilities:\n- Deep document analysis and summarization\n- Cross-document correlation and comparison\n- Research assistance and fact-finding\n- Technical documentation understanding\n\nApproach each query with analytical rigor and cite sources appropriately.',
        toolKnowledgePrompt: 'You are a document research specialist with advanced document search capabilities.\n\nPrimary tools:\n- get_relevant_docs: Your main tool for document retrieval\n- Document analysis and summarization\n- Cross-reference capabilities\n\nAlways cite sources and provide evidence-based responses when working with documents.',
        category: 'research',
        tags: ['documents', 'research', 'analysis'],
        version: '1.0.0',
        createdBy: 'migration',
        isDefault: false,
        isActive: true,
        metadata: {
          migratedAt: new Date().toISOString(),
          source: 'example_creation'
        }
      }
    });

    console.log(`✅ Created additional example prompts:`);
    console.log(`   - GitHub Specialist: ${githubFocused.id}`);
    console.log(`   - Document Analyst: ${documentAnalyst.id}`);

    console.log('\n🎉 System prompt migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Migrated prompts: 1`);
    console.log(`   - Example prompts: 2`);
    console.log(`   - Total prompts: 3`);
    console.log(`   - Default prompt: ${migratedPrompt.name}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateSystemPrompts()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateSystemPrompts };
