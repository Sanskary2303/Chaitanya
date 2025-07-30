import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GSContext, GSStatus, logger } from '@godspeedsystems/core';

// User interface for type safety
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Optional for responses
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
  iss: string;
}

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();

/**
 * Initialize default admin user
 */
export function initializeAuth(config: any) {
  const defaultAdmin = config.auth?.defaultAdminUser;
  if (defaultAdmin && !users.has(defaultAdmin.username)) {
    const hashedPassword = bcrypt.hashSync(defaultAdmin.password, config.auth?.saltRounds || 12);
    const adminUser: User = {
      id: 'admin-001',
      username: defaultAdmin.username,
      email: defaultAdmin.email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(defaultAdmin.username, adminUser);
    logger.info('Default admin user created');
  }
}

/**
 * Generate JWT token
 */
export function generateToken(user: User, config: any): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'> = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn || '24h',
    issuer: config.jwt.issuer || 'rag-node-api',
    algorithm: config.jwt.algorithm || 'HS256',
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string, config: any): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer || 'rag-node-api',
      algorithms: [config.jwt.algorithm || 'HS256'],
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.warn('JWT verification failed:', error);
    return null;
  }
}

/**
 * Hash password
 */
export function hashPassword(password: string, saltRounds: number = 12): string {
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * Compare password with hash
 */
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Authenticate user with username and password
 */
export function authenticateUser(username: string, password: string): User | null {
  const user = users.get(username);
  if (user && user.password && comparePassword(password, user.password)) {
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }
  return null;
}

/**
 * Get user by username
 */
export function getUserByUsername(username: string): User | null {
  const user = users.get(username);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }
  return null;
}

/**
 * Get user by ID
 */
export function getUserById(id: string): User | null {
  for (const user of users.values()) {
    if (user.id === id) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
  }
  return null;
}

/**
 * Create new user
 */
export function createUser(userData: {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}): User | null {
  if (users.has(userData.username)) {
    return null; // User already exists
  }

  const hashedPassword = hashPassword(userData.password);
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    role: userData.role || 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(userData.username, newUser);
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword as User;
}

/**
 * Authentication middleware function
 */
export function requireAuth(ctx: GSContext): GSStatus | null {
  const config = ctx.config;
  
  // If authentication is disabled, allow the request
  if (!config.auth?.enabled) {
    return null;
  }

  const authHeader = ctx.inputs.data.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new GSStatus(false, 401, 'Authorization header missing or invalid', {
      error: 'UNAUTHORIZED',
      message: 'Bearer token required',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token, config);
  
  if (!decoded) {
    return new GSStatus(false, 401, 'Invalid or expired token', {
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }

  // Add user information to context data
  ctx.inputs.data.user = {
    userId: decoded.userId,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role,
  };

  return null; // Authentication successful
}

/**
 * Admin-only middleware function
 */
export function requireAdmin(ctx: GSContext): GSStatus | null {
  const authResult = requireAuth(ctx);
  if (authResult) {
    return authResult;
  }

  if (ctx.inputs.data.user?.role !== 'admin') {
    return new GSStatus(false, 403, 'Admin access required', {
      error: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return null;
}

/**
 * Extract token from WebSocket connection
 */
export function extractTokenFromWebSocket(url: string): string | null {
  try {
    const urlObj = new URL(url, 'ws://localhost');
    return urlObj.searchParams.get('token');
  } catch {
    return null;
  }
}

/**
 * Validate WebSocket authentication
 */
export function validateWebSocketAuth(token: string | null, config: any): JWTPayload | null {
  if (!token) {
    return null;
  }
  return verifyToken(token, config);
}
