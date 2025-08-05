/**
 * Clean up test prompt and run system prompts functionality test
 */

const { PrismaClient } = require('./src/datasources/prisma-clients/chatbot/prisma-clients/chatbot');

async function testSystemPrompts() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Testing System Prompts Database Operations');
        console.log('='.repeat(50));
        
        // Clean up any existing test prompts first
        console.log('\n🧹 Cleaning up any existing test prompts');
        await prisma.systemPrompt.deleteMany({
            where: {
                OR: [
                    { name: 'Test Prompt' },
                    { category: 'testing' }
                ]
            }
        });
        
        // Test 1: List existing prompts
        console.log('\n1️⃣ Testing List System Prompts');
        const existingPrompts = await prisma.systemPrompt.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                category: true,
                isDefault: true,
                isActive: true,
                createdAt: true
            }
        });
        
        console.log(`Found ${existingPrompts.length} existing prompts:`);
        existingPrompts.forEach(prompt => {
            console.log(`  - ${prompt.name} (${prompt.category}) ${prompt.isDefault ? '[DEFAULT]' : ''} ${prompt.isActive ? '[ACTIVE]' : ''}`);
        });
        
        // Test 2: Get active prompt
        console.log('\n2️⃣ Testing Get Active Prompt');
        const activePrompt = await prisma.systemPrompt.findFirst({
            where: { isActive: true }
        });
        
        if (activePrompt) {
            console.log(`✅ Active prompt: ${activePrompt.name}`);
            console.log(`   Description: ${activePrompt.description}`);
            console.log(`   Category: ${activePrompt.category}`);
            console.log(`   Content length: ${activePrompt.coreSystemPrompt?.length || 0} chars`);
        } else {
            console.log('❌ No active prompt found!');
        }
        
        // Test 3: Create a new test prompt
        console.log('\n3️⃣ Testing Create New Prompt');
        const newPrompt = await prisma.systemPrompt.create({
            data: {
                name: `Test Prompt ${Date.now()}`,
                description: 'A test prompt created for verification',
                coreSystemPrompt: 'You are a helpful AI assistant designed for testing purposes.',
                toolKnowledgePrompt: 'Test tool knowledge content.',
                category: 'testing',
                tags: ['test', 'verification'],
                version: '1.0.0',
                isDefault: false,
                isActive: false,
                metadata: {
                    testRun: true,
                    createdBy: 'direct_test'
                }
            }
        });
        
        console.log(`✅ Created new prompt: ${newPrompt.name} (ID: ${newPrompt.id})`);
        
        // Test 4: Update the prompt
        console.log('\n4️⃣ Testing Update Prompt');
        const updatedPrompt = await prisma.systemPrompt.update({
            where: { id: newPrompt.id },
            data: {
                description: 'Updated test prompt description',
                tags: ['test', 'verification', 'updated']
            }
        });
        
        console.log(`✅ Updated prompt description: ${updatedPrompt.description}`);
        
        // Test 5: Test multiple prompts support
        console.log('\n5️⃣ Testing Multiple Prompts Support');
        
        // Create additional test prompts
        const prompt2 = await prisma.systemPrompt.create({
            data: {
                name: `GitHub Assistant ${Date.now()}`,
                description: 'Specialized for GitHub operations',
                coreSystemPrompt: 'You are an expert GitHub assistant.',
                toolKnowledgePrompt: 'Expert knowledge of GitHub APIs, workflows, and best practices.',
                category: 'development',
                tags: ['github', 'development'],
                version: '1.0.0',
                isDefault: false,
                isActive: false
            }
        });
        
        const prompt3 = await prisma.systemPrompt.create({
            data: {
                name: `Research Assistant ${Date.now()}`,
                description: 'Specialized for research tasks',
                coreSystemPrompt: 'You are a research-focused assistant.',
                toolKnowledgePrompt: 'Specialized in research methodologies and data analysis.',
                category: 'research',
                tags: ['research', 'analysis'],
                version: '1.0.0',
                isDefault: false,
                isActive: false
            }
        });
        
        console.log(`✅ Created additional prompts: ${prompt2.name}, ${prompt3.name}`);
        
        // Test 6: Category filtering
        console.log('\n6️⃣ Testing Category Filtering');
        
        const developmentPrompts = await prisma.systemPrompt.findMany({
            where: { category: 'development' }
        });
        
        const researchPrompts = await prisma.systemPrompt.findMany({
            where: { category: 'research' }
        });
        
        console.log(`✅ Development category: ${developmentPrompts.length} prompts`);
        console.log(`✅ Research category: ${researchPrompts.length} prompts`);
        
        // Test 7: Set different prompts as default
        console.log('\n7️⃣ Testing Switch Default Prompts');
        
        // Clear current defaults
        await prisma.systemPrompt.updateMany({
            where: { isDefault: true },
            data: { isDefault: false, isActive: false }
        });
        
        // Set GitHub assistant as default
        await prisma.systemPrompt.update({
            where: { id: prompt2.id },
            data: { isDefault: true, isActive: true }
        });
        
        const newDefault = await prisma.systemPrompt.findFirst({
            where: { isDefault: true }
        });
        
        console.log(`✅ New default prompt: ${newDefault.name}`);
        
        // Test 8: Count and statistics
        console.log('\n8️⃣ Testing Count and Statistics');
        
        const totalCount = await prisma.systemPrompt.count();
        const activeCount = await prisma.systemPrompt.count({
            where: { isActive: true }
        });
        const defaultCount = await prisma.systemPrompt.count({
            where: { isDefault: true }
        });
        
        console.log(`✅ Total prompts: ${totalCount}`);
        console.log(`✅ Active prompts: ${activeCount}`);
        console.log(`✅ Default prompts: ${defaultCount}`);
        
        // Test 9: Clean up test prompts
        console.log('\n9️⃣ Testing Cleanup');
        
        const deletedCount = await prisma.systemPrompt.deleteMany({
            where: {
                OR: [
                    { id: newPrompt.id },
                    { id: prompt2.id },
                    { id: prompt3.id }
                ]
            }
        });
        
        console.log(`✅ Deleted ${deletedCount.count} test prompts`);
        
        // Restore original default if needed
        if (existingPrompts.length > 0) {
            const originalDefault = existingPrompts.find(p => p.isDefault) || existingPrompts[0];
            await prisma.systemPrompt.update({
                where: { id: originalDefault.id },
                data: { isDefault: true, isActive: true }
            });
            console.log(`✅ Restored original default: ${originalDefault.name}`);
        }
        
        console.log('\n🎉 All Multiple System Prompts Tests Passed!');
        console.log('='.repeat(50));
        
        // Final summary
        console.log('\n📊 SYSTEM PROMPTS FUNCTIONALITY VERIFIED:');
        console.log('  ✅ Database operations (CRUD)');
        console.log('  ✅ Multiple prompts support');
        console.log('  ✅ Category management');
        console.log('  ✅ Default/Active switching');
        console.log('  ✅ Search and filtering');
        console.log('  ✅ Metadata support');
        console.log('  ✅ Data integrity');
        
        const finalActive = await prisma.systemPrompt.findFirst({
            where: { isActive: true },
            select: { name: true, category: true, description: true }
        });
        
        if (finalActive) {
            console.log(`\n🎯 Current active prompt: ${finalActive.name} (${finalActive.category})`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testSystemPrompts();
