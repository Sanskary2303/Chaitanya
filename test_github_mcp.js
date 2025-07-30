#!/usr/bin/env node

/**
 * Comprehensive GitHub MCP Server Testing Script
 * Tests various aspects of GitHub integration
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class GitHubMCPTester {
  constructor() {
    this.results = [];
    this.githubToken = process.env.GITHUB_TOKEN;
  }

  log(test, status, message, data = null) {
    const result = {
      test,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    
    const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusEmoji} ${test}: ${message}`);
    if (data) {
      console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
    }
  }

  async testEnvironmentSetup() {
    console.log('\n🔧 Testing Environment Setup...\n');
    
    // Test 1: Check GitHub token exists
    if (this.githubToken && this.githubToken !== 'your_github_token_here') {
      this.log('GitHub Token', 'PASS', 'GitHub token is set in environment');
    } else {
      this.log('GitHub Token', 'FAIL', 'GitHub token not set or using placeholder value');
      return false;
    }

    // Test 2: Check GitHub token format
    if (this.githubToken.startsWith('ghp_') || this.githubToken.startsWith('github_pat_')) {
      this.log('Token Format', 'PASS', 'GitHub token has correct format');
    } else {
      this.log('Token Format', 'WARN', 'GitHub token format may be incorrect');
    }

    // Test 3: Test GitHub API connectivity
    try {
      const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer ${this.githubToken}" https://api.github.com/user`);
      const userData = JSON.parse(stdout);
      
      if (userData.login) {
        this.log('GitHub API Auth', 'PASS', `Authenticated as ${userData.login}`, {
          username: userData.login,
          name: userData.name,
          public_repos: userData.public_repos
        });
        return true;
      } else {
        this.log('GitHub API Auth', 'FAIL', 'Authentication failed', userData);
        return false;
      }
    } catch (error) {
      this.log('GitHub API Auth', 'FAIL', `API test failed: ${error.message}`);
      return false;
    }
  }

  async testMCPSDK() {
    console.log('\n🛠️ Testing MCP SDK...\n');
    
    try {
      // Test MCP SDK import
      const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
      this.log('MCP SDK Import', 'PASS', 'MCP SDK imported successfully');
      
      // Test transport import
      const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
      this.log('MCP Transport', 'PASS', 'MCP transport imported successfully');
      
      return true;
    } catch (error) {
      this.log('MCP SDK Import', 'FAIL', `Failed to import MCP SDK: ${error.message}`);
      return false;
    }
  }

  async testGitHubMCPClient() {
    console.log('\n🔗 Testing GitHub MCP Client...\n');
    
    try {
      // Test if GitHub MCP client exists
      const clientPath = path.join(__dirname, 'src/helper/github-mcp-client.ts');
      await fs.access(clientPath);
      this.log('MCP Client File', 'PASS', 'GitHub MCP client file exists');
      
      // Test client import (if compiled)
      try {
        const { GitHubMCPClient } = require('./src/helper/github-mcp-client.js');
        this.log('MCP Client Import', 'PASS', 'GitHub MCP client imported successfully');
      } catch (error) {
        this.log('MCP Client Import', 'WARN', 'GitHub MCP client needs compilation');
      }
      
      return true;
    } catch (error) {
      this.log('MCP Client File', 'FAIL', `GitHub MCP client file not found: ${error.message}`);
      return false;
    }
  }

  async testChatbotIntegration() {
    console.log('\n🤖 Testing Chatbot Integration...\n');
    
    try {
      // Check if server is running
      const { stdout } = await execAsync('curl -s http://localhost:3000/health || echo "NOT_RUNNING"');
      
      if (stdout.includes('NOT_RUNNING')) {
        this.log('Chatbot Server', 'WARN', 'Chatbot server is not running');
        return false;
      } else {
        this.log('Chatbot Server', 'PASS', 'Chatbot server is running');
      }

      // Test GitHub query endpoint
      const testQuery = {
        query: "List my GitHub repositories",
        userId: "test-user",
        config: {
          enableExternalMCP: true,
          enableFileOperations: true
        }
      };

      const curlCommand = `curl -s -X POST http://localhost:3000/chatbot/query \\
        -H "Content-Type: application/json" \\
        -d '${JSON.stringify(testQuery)}'`;

      const { stdout: response } = await execAsync(curlCommand);
      const result = JSON.parse(response);

      if (result.success) {
        this.log('GitHub Query Test', 'PASS', 'Chatbot handled GitHub query successfully', {
          response: result.data?.response?.substring(0, 100) + '...',
          toolsUsed: result.data?.toolResults?.map(t => t.tool)
        });
      } else {
        this.log('GitHub Query Test', 'FAIL', 'Chatbot failed to process GitHub query', result);
      }

      return true;
    } catch (error) {
      this.log('Chatbot Integration', 'FAIL', `Chatbot test failed: ${error.message}`);
      return false;
    }
  }

  async testGitHubOperations() {
    console.log('\n📁 Testing GitHub Operations...\n');
    
    const operations = [
      {
        name: 'List Repositories',
        url: 'https://api.github.com/user/repos?per_page=5',
        description: 'Get user repositories'
      },
      {
        name: 'List Notifications',
        url: 'https://api.github.com/notifications?per_page=5',
        description: 'Get user notifications'
      },
      {
        name: 'Get User Profile',
        url: 'https://api.github.com/user',
        description: 'Get authenticated user profile'
      },
      {
        name: 'List Issues',
        url: 'https://api.github.com/issues?filter=assigned&state=open&per_page=5',
        description: 'Get assigned issues'
      }
    ];

    for (const op of operations) {
      try {
        const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer ${this.githubToken}" "${op.url}"`);
        const data = JSON.parse(stdout);
        
        if (Array.isArray(data)) {
          this.log(op.name, 'PASS', `${op.description} - Found ${data.length} items`, {
            count: data.length,
            sample: data[0] ? { 
              name: data[0].name || data[0].title || data[0].subject?.title,
              id: data[0].id 
            } : null
          });
        } else if (data.login) {
          this.log(op.name, 'PASS', `${op.description} - Got user: ${data.login}`, {
            login: data.login,
            name: data.name,
            public_repos: data.public_repos
          });
        } else if (data.message) {
          this.log(op.name, 'FAIL', `${op.description} failed: ${data.message}`);
        } else {
          this.log(op.name, 'PASS', `${op.description} completed`);
        }
      } catch (error) {
        this.log(op.name, 'FAIL', `${op.description} failed: ${error.message}`);
      }
    }
  }

  async testVSCodeMCPIntegration() {
    console.log('\n💻 Testing VS Code MCP Integration...\n');
    
    try {
      // Check VS Code MCP config
      const mcpConfigPath = path.join(process.env.HOME, '.config/Code/User/mcp.json');
      const mcpConfig = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
      
      if (mcpConfig.servers?.github) {
        this.log('VS Code MCP Config', 'PASS', 'GitHub MCP server configured in VS Code', {
          type: mcpConfig.servers.github.type,
          url: mcpConfig.servers.github.url
        });
      } else {
        this.log('VS Code MCP Config', 'FAIL', 'GitHub MCP server not found in VS Code config');
      }
    } catch (error) {
      this.log('VS Code MCP Config', 'FAIL', `Failed to read VS Code MCP config: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('\n📊 Test Summary Report\n');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   • ${r.test}: ${r.message}`);
      });
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ Warnings:');
      this.results.filter(r => r.status === 'WARN').forEach(r => {
        console.log(`   • ${r.test}: ${r.message}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(__dirname, 'github-mcp-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      summary: { total: this.results.length, passed, failed, warnings },
      timestamp: new Date().toISOString(),
      results: this.results
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  async runAllTests() {
    console.log('🧪 GitHub MCP Server Comprehensive Testing\n');
    console.log('='.repeat(60));
    
    const envOk = await this.testEnvironmentSetup();
    if (!envOk) {
      console.log('\n⚠️ Environment setup failed. Please check your GitHub token.');
      console.log('Generate a new token at: https://github.com/settings/tokens');
      console.log('Required permissions: repo, user, notifications, workflow');
    }
    
    await this.testMCPSDK();
    await this.testGitHubMCPClient();
    await this.testChatbotIntegration();
    
    if (envOk) {
      await this.testGitHubOperations();
    }
    
    await this.testVSCodeMCPIntegration();
    await this.generateReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new GitHubMCPTester();
  tester.runAllTests().catch(console.error);
}

module.exports = GitHubMCPTester;
