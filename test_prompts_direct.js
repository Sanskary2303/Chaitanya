/**
 * Direct test of system prompts functionality
 * This bypasses the HTTP server and tests database operations directly
 */

const { PrismaClient } = require('./src/datasources/prisma-clients/chatbot/prisma-clients/chatbot');

async function testSystemPrompts() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Testing System Prompts Database Operations');
        console.log('='.repeat(50));
        
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
                name: 'Test Prompt',
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
        
        // Test 5: Set as default (temporarily)
        console.log('\n5️⃣ Testing Set Default Prompt');
        
        // First, unset current default
        await prisma.systemPrompt.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });
        
        // Set new prompt as default
        const defaultPrompt = await prisma.systemPrompt.update({
            where: { id: newPrompt.id },
            data: { isDefault: true, isActive: true }
        });
        
        console.log(`✅ Set prompt as default: ${defaultPrompt.name}`);
        
        // Test 6: Search and filter
        console.log('\n6️⃣ Testing Search and Filter');
        
        const searchResults = await prisma.systemPrompt.findMany({
            where: {
                OR: [
                    { name: { contains: 'test' } },
                    { description: { contains: 'test' } }
                ]
            }
        });
        
        console.log(`✅ Search for 'test' found ${searchResults.length} results`);
        
        const categoryResults = await prisma.systemPrompt.findMany({
            where: { category: 'testing' }
        });
        
        console.log(`✅ Category filter for 'testing' found ${categoryResults.length} results`);
        
        // Test 7: Restore original default
        console.log('\n7️⃣ Testing Restore Original Default');
        
        // Set our test prompt as non-default
        await prisma.systemPrompt.update({
            where: { id: newPrompt.id },
            data: { isDefault: false, isActive: false }
        });
        
        // Restore original default (first existing prompt if any)
        if (existingPrompts.length > 0) {
            const originalDefault = existingPrompts.find(p => p.isDefault) || existingPrompts[0];
            await prisma.systemPrompt.update({
                where: { id: originalDefault.id },
                data: { isDefault: true, isActive: true }
            });
            console.log(`✅ Restored original default: ${originalDefault.name}`);
        }
        
        // Test 8: Delete test prompt
        console.log('\n8️⃣ Testing Delete Prompt');
        await prisma.systemPrompt.delete({
            where: { id: newPrompt.id }
        });
        
        console.log(`✅ Deleted test prompt: ${newPrompt.name}`);
        
        console.log('\n🎉 All System Prompts Tests Passed!');
        console.log('='.repeat(50));
        
        // Final verification
        const finalCount = await prisma.systemPrompt.count();
        console.log(`📊 Final prompt count: ${finalCount}`);
        
        const finalActive = await prisma.systemPrompt.findFirst({
            where: { isActive: true },
            select: { name: true, category: true }
        });
        
        if (finalActive) {
            console.log(`✅ Active prompt: ${finalActive.name} (${finalActive.category})`);
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
