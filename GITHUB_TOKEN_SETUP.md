# GitHub Token Generation Instructions

## 🔑 Generate a New GitHub Personal Access Token

### Step 1: Go to GitHub Token Settings
Visit: https://github.com/settings/tokens

### Step 2: Click "Generate new token" → "Generate new token (classic)"

### Step 3: Configure the Token
**Token Name:** `Chaitanya-MCP-Chatbot`
**Expiration:** 90 days (or No expiration if preferred)

### Step 4: Select Required Scopes
✅ **repo** - Full control of private repositories
✅ **user** - Access to user profile information  
✅ **notifications** - Access to notifications
✅ **workflow** - Update GitHub Action workflows
✅ **read:org** - Read org and team membership, read org projects
✅ **gist** - Create gists

### Step 5: Generate and Copy Token
1. Click "Generate token"
2. **IMPORTANT:** Copy the token immediately (it won't be shown again)
3. The token will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 6: Update Environment File
Replace the current token in `/home/sanskar/Chaitanya/.env`:

```bash

# Replace with new token:
GITHUB_TOKEN=ghp_your_new_token_here
```

### Step 7: Restart Server
After updating the token, restart the development server:
```bash
# The server should auto-restart due to nodemon watching .env changes
# Or manually restart if needed
```

### Step 8: Test Token
Once updated, test the token:
```bash
curl -H "Authorization: token YOUR_NEW_TOKEN" https://api.github.com/user
```

## 🔍 Alternative: Use Existing Valid Token
If you have another valid GitHub token, you can use that instead of generating a new one.

---
**Next:** Once you have a valid token, I'll help configure and test the GitHub MCP integration.
