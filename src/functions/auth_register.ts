import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { createUser, generateToken, initializeAuth } from '../helper/auth';

export default async function (ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    // Try both data access patterns with type assertion
    const bodyData = ctx.inputs.data?.body || (ctx.inputs as any).body;
    
    const { username, email, password, role } = bodyData || {};

    if (!username || !email || !password) {
      return new GSStatus(false, 400, 'Username, email, and password are required', {
        error: 'VALIDATION_ERROR',
        message: 'Username, email, and password are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new GSStatus(false, 400, 'Invalid email format', {
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return new GSStatus(false, 400, 'Password must be at least 6 characters long', {
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 6 characters long',
      });
    }

    // Initialize auth if not already done
    initializeAuth(ctx.config);

    // Create user
    const user = createUser({
      username,
      email,
      password,
      role: role || 'user', // Default to 'user' role
    });

    if (!user) {
      return new GSStatus(false, 409, 'User already exists', {
        error: 'USER_EXISTS',
        message: 'Username already exists',
      });
    }

    // Generate JWT token
    const token = generateToken(user, ctx.config);

    return new GSStatus(true, 201, 'User registered successfully', {
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
        expiresIn: ctx.config.jwt.expiresIn || '24h',
      },
    });
  } catch (error: any) {
    return new GSStatus(false, 500, 'Internal server error', {
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}
