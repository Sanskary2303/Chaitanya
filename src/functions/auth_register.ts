import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { createUser, generateToken, initializeAuth, validateEmail, validatePassword } from '../helper/auth';

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
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new GSStatus(false, 400, emailValidation.message!, {
        error: 'VALIDATION_ERROR',
        message: emailValidation.message!,
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new GSStatus(false, 400, passwordValidation.message!, {
        error: 'VALIDATION_ERROR',
        message: passwordValidation.message!,
      });
    }

    // Initialize auth if not already done
    initializeAuth(ctx.config);

    try {
      // Create new user
      const user = createUser({
        username,
        email,
        password,
        role: role === 'admin' ? 'admin' : 'user', // Only allow admin if specifically requested
      });

      // Generate JWT token for immediate login
      const token = generateToken(user, ctx.config);

      return new GSStatus(true, 201, 'User registered successfully', {
        message: 'User registered and logged in successfully',
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
      if (error.message === 'User already exists') {
        return new GSStatus(false, 409, 'User already exists', {
          error: 'USER_EXISTS',
          message: 'A user with this username or email already exists',
        });
      }
      throw error;
    }
  } catch (error: any) {
    return new GSStatus(false, 500, 'Internal server error', {
      error: 'INTERNAL_ERROR',
      message: error.message || 'Something went wrong',
    });
  }
}
