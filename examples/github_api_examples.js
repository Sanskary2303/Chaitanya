/**
 * Example API calls to your GitHub-enabled chatbot
 */

// 1. Basic GitHub query
const basicQuery = {
  method: 'POST',
  url: 'http://localhost:3000/chatbot/query',
  data: {
    query: "Show me my GitHub repositories",
    userId: "user123",
    config: {
      enableExternalMCP: true,
      enableFileOperations: true,
      maxTokens: 1500
    }
  }
};

// 2. Repository management
const repoQuery = {
  method: 'POST', 
  url: 'http://localhost:3000/chatbot/query',
  data: {
    query: "Create a new repository called 'ai-assistant' with description 'My AI assistant project'",
    userId: "user123",
    config: {
      enableExternalMCP: true
    }
  }
};

// 3. Issue management
const issueQuery = {
  method: 'POST',
  url: 'http://localhost:3000/chatbot/query', 
  data: {
    query: "Create an issue in my Chaitanya repository with title 'Add GitHub integration' and description 'Integrate GitHub MCP for better repository management'",
    userId: "user123"
  }
};

// 4. Pull request operations
const prQuery = {
  method: 'POST',
  url: 'http://localhost:3000/chatbot/query',
  data: {
    query: "Show me all open pull requests in my OOSC3.0-UbuCon-India repository",
    userId: "user123"
  }
};

// 5. File operations
const fileQuery = {
  method: 'POST',
  url: 'http://localhost:3000/chatbot/query',
  data: {
    query: "Show me the contents of package.json in my Chaitanya repository",
    userId: "user123",
    config: {
      enableExternalMCP: true,
      enableFileOperations: true
    }
  }
};

// Example using fetch API
async function queryGitHubChatbot(query) {
  try {
    const response = await fetch('http://localhost:3000/chatbot/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        userId: 'api-user',
        config: {
          enableExternalMCP: true,
          enableFileOperations: true,
          maxTokens: 2000
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Bot Response:', result.data.response);
      if (result.data.toolResults) {
        console.log('GitHub Operations:', result.data.toolResults);
      }
    } else {
      console.error('Error:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Usage examples
queryGitHubChatbot("What are my recent GitHub notifications?");
queryGitHubChatbot("Show me the branches in my Chaitanya repository");
queryGitHubChatbot("Create a new issue: Improve documentation");

module.exports = {
  queryGitHubChatbot,
  basicQuery,
  repoQuery, 
  issueQuery,
  prQuery,
  fileQuery
};
