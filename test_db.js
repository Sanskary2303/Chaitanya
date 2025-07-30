// Simple database connection test
import { PrismaClient } from './src/datasources/prisma-clients/chatbot';

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test simple query
    const userCount = await prisma.user.count();
    console.log(`✅ User count: ${userCount}`);
    
    // Test creating a chat session
    const session = await prisma.chatSession.create({
      data: {
        title: 'Test Session',
        userId: null, // No user required for test
        metadata: { test: true }
      }
    });
    console.log(`✅ Created test session: ${session.id}`);
    
    // Test querying the session
    const sessions = await prisma.chatSession.findMany();
    console.log(`✅ Total sessions: ${sessions.length}`);
    
    // Clean up test session
    await prisma.chatSession.delete({
      where: { id: session.id }
    });
    console.log('✅ Cleaned up test session');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
