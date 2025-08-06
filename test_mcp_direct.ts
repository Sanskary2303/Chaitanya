import { GSContext } from '@godspeedsystems/core';
import { readFile, writeFile, executeCommand, listDirectory, getFileInfo, switchMode } from './src/functions/mcp_tools';

// Mock GSContext for testing
const mockContext: Partial<GSContext> = {
  inputs: {
    data: {
      body: {}
    }
  }
};

async function testMCPTools() {
  console.log('🧪 Testing MCP Local Tools...\n');

  // Test 1: Read File
  console.log('1. Testing readFile...');
  try {
    const readResult = await readFile(mockContext as GSContext, { filePath: 'package.json' });
    console.log('✅ Read file result:', readResult.success ? 'SUCCESS' : 'FAILED');
    if (readResult.success && readResult.data) {
      const packageData = JSON.parse(readResult.data.content);
      console.log(`   📦 Package name: ${packageData.name}`);
      console.log(`   📋 Description: ${packageData.description || 'No description'}`);
    } else {
      console.log('❌ Error:', readResult.message);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  console.log('\n2. Testing listDirectory...');
  try {
    const listResult = await listDirectory(mockContext as GSContext, { dirPath: '.', includeHidden: false });
    console.log('✅ List directory result:', listResult.success ? 'SUCCESS' : 'FAILED');
    if (listResult.success && listResult.data) {
      console.log(`   📁 Found ${listResult.data.totalItems} items`);
      const files = listResult.data.contents.filter((item: any) => item.type === 'file').slice(0, 5);
      const dirs = listResult.data.contents.filter((item: any) => item.type === 'directory').slice(0, 5);
      console.log(`   📄 Sample files: ${files.map((f: any) => f.name).join(', ')}`);
      console.log(`   📂 Sample directories: ${dirs.map((d: any) => d.name).join(', ')}`);
    } else {
      console.log('❌ Error:', listResult.message);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  console.log('\n3. Testing executeCommand...');
  try {
    const execResult = await executeCommand(mockContext as GSContext, { command: 'pwd' });
    console.log('✅ Execute command result:', execResult.success ? 'SUCCESS' : 'FAILED');
    if (execResult.success && execResult.data) {
      console.log(`   🖥️  Output: ${execResult.data.stdout.trim()}`);
    } else {
      console.log('❌ Error:', execResult.message);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  console.log('\n4. Testing getFileInfo...');
  try {
    const infoResult = await getFileInfo(mockContext as GSContext, { filePath: 'package.json' });
    console.log('✅ Get file info result:', infoResult.success ? 'SUCCESS' : 'FAILED');
    if (infoResult.success && infoResult.data) {
      console.log(`   📏 Size: ${infoResult.data.size} bytes`);
      console.log(`   📅 Modified: ${infoResult.data.modified}`);
      console.log(`   🗂️  Type: ${infoResult.data.isFile ? 'File' : 'Directory'}`);
    } else {
      console.log('❌ Error:', infoResult.message);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  console.log('\n5. Testing switchMode...');
  try {
    const modeResult = await switchMode(mockContext as GSContext, { mode: 'development' });
    console.log('✅ Switch mode result:', modeResult.success ? 'SUCCESS' : 'FAILED');
    if (modeResult.success && modeResult.data) {
      console.log(`   🔄 Current mode: ${modeResult.data.currentMode}`);
      console.log(`   📝 Description: ${modeResult.data.config.description}`);
    } else {
      console.log('❌ Error:', modeResult.message);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  console.log('\n6. Testing writeFile (create test file)...');
  try {
    const testContent = `# MCP Test File\nCreated at: ${new Date().toISOString()}\nThis is a test file created by MCP tools.`;
    const writeResult = await writeFile(mockContext as GSContext, { 
      filePath: 'tmp/mcp_test.md', 
      content: testContent,
      createDirs: true 
    });
    console.log('✅ Write file result:', writeResult.success ? 'SUCCESS' : 'FAILED');
    if (writeResult.success && writeResult.data) {
      console.log(`   📝 Written ${writeResult.data.size} bytes to ${writeResult.data.filePath}`);
    } else {
      console.log('❌ Error:', writeResult.message);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  console.log('\n🎉 MCP Tools testing completed!');
}

if (require.main === module) {
  testMCPTools().catch(console.error);
}

export { testMCPTools };
