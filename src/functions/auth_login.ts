import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { authenticateUser, generateToken, initializeAuth } from '../helper/auth';

export default async function (ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    // Try both data access patterns with type assertion
    const bodyData = ctx.inputs.data?.body || (ctx.inputs as any).body;
    
    const { username, password } = bodyData || {};

    if (!username || !password) {
      return new GSStatus(false, 400, 'Username and password are required', {
        error: 'VALIDATION_ERROR',
        message: 'Username and password are required',
      });
    }

    // Initialize auth if not already done
    initializeAuth(ctx.config);

    // Authenticate user
    const user = authenticateUser(username, password);
    if (!user) {
      return new GSStatus(false, 401, 'Invalid credentials', {
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user, ctx.config);

    return new GSStatus(true, 200, 'Login successful', {
      message: 'Login successful',
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
      message: error.message || 'Something went wrong',
    });
  }
}
