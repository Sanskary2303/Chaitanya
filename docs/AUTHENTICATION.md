# JWT Authentication Implementation

This document describes the JWT-based authentication system implemented in the RAG Node application.

## Overview

The authentication system provides:
- JWT-based stateless authentication
- User registration and login
- Role-based access control (Admin/User)
- Protected API endpoints
- WebSocket authentication
- Frontend authentication integration

## Configuration

### Environment Variables

Set the following environment variables in your `.env` file:

```bash
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_ISSUER=rag-node-api

# Authentication Settings
AUTH_ENABLED=true
AUTH_SALT_ROUNDS=12

# Default Admin User
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@ragnode.com
```

### Configuration Files

The authentication settings are defined in:
- `config/default.yaml` - Default JWT and auth configuration
- `config/custom-environment-variables.yaml` - Environment variable mappings

## API Endpoints

### Authentication Endpoints

#### POST /auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "admin-001",
      "username": "admin",
      "email": "admin@ragnode.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-123456",
      "username": "newuser",
      "email": "user@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### GET /auth/profile
Get user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "admin-001",
      "username": "admin",
      "email": "admin@ragnode.com",
      "role": "admin",
      "createdAt": "2025-07-29T10:00:00.000Z",
      "updatedAt": "2025-07-29T10:00:00.000Z"
    }
  }
}
```

### Protected Endpoints

The following endpoints now require authentication:

- `POST /upload_docs` - Upload documents
- `DELETE /doc/:id` - Delete documents
- `DELETE /github_links/:id` - Delete GitHub repositories
- All other existing endpoints

**Authentication Header:**
```
Authorization: Bearer <jwt_token>
```

## WebSocket Authentication

WebSocket connections require a JWT token as a query parameter:

```javascript
const token = "your_jwt_token";
const ws = new WebSocket(`ws://localhost:8000?token=${token}&clientId=web-client-123`);
```

## Frontend Integration

### Authentication Service

The frontend includes an `AuthService` class that handles:
- Login/logout
- Token storage
- Automatic header injection
- WebSocket URL generation

```typescript
import authService from '@/services/authService';

// Login
const response = await authService.login({ username, password });

// Get authenticated WebSocket URL
const wsUrl = authService.getWebSocketURL('ws://localhost:8000');
```

### Components

- `AuthWrapper` - Handles authentication state and login/register flow
- `LoginForm` - User login interface
- `RegisterForm` - User registration interface

## User Roles

### Admin Role
- Full access to all endpoints
- Can delete documents and repositories
- Can access admin-only features

### User Role
- Limited access to endpoints
- Can upload and manage their own documents
- Cannot access admin-only features

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with configurable salt rounds
2. **JWT Signing**: Tokens are signed with a secret key and include expiration
3. **Token Validation**: All protected endpoints validate JWT tokens
4. **Role-based Access**: Admin-only endpoints check user roles
5. **WebSocket Security**: WebSocket connections validate JWT tokens

## Default Credentials

For development and testing, a default admin user is created:

- **Username**: admin
- **Password**: admin123
- **Email**: admin@ragnode.com
- **Role**: admin

**⚠️ Important**: Change these credentials in production!

## Development

### Adding Authentication to New Endpoints

1. Import the auth helper:
```typescript
import { requireAuth } from '../helper/auth';
```

2. Add authentication check to your function:
```typescript
export default async function (ctx: GSContext): Promise<GSStatus> {
  // Check authentication
  const authResult = requireAuth(ctx);
  if (authResult) {
    return authResult;
  }
  
  // Your function logic here
}
```

3. Update the event YAML file:
```yaml
http.post./your-endpoint:
  fn: your_function
  parameters:
    - name: authorization
      in: header
      required: true
      schema:
        type: string
        pattern: '^Bearer .+'
      description: JWT token in Bearer format
```

### Admin-only Endpoints

For admin-only endpoints, use `requireAdmin` instead:

```typescript
import { requireAdmin } from '../helper/auth';

export default async function (ctx: GSContext): Promise<GSStatus> {
  // Check admin authentication
  const authResult = requireAdmin(ctx);
  if (authResult) {
    return authResult;
  }
  
  // Admin-only logic here
}
```

## Testing

### Using curl

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use the returned token for authenticated requests
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Frontend Testing

1. Start the application
2. Navigate to the frontend
3. Use the login form with default credentials
4. All API calls will automatically include authentication headers

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that the Authorization header is included and the token is valid
2. **403 Forbidden**: User doesn't have the required role for the endpoint
3. **Token Expired**: Login again to get a new token
4. **WebSocket Connection Failed**: Ensure the token is included in the WebSocket URL

### Debugging

Enable debug logging to see authentication details:

```yaml
log:
  level: debug
```

This will log authentication attempts and failures for debugging purposes.
