import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { requireAuth, getUserById } from '../helper/auth';

export default async function (ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  try {
    // Check authentication
    const authResult = requireAuth(ctx);
    if (authResult) {
      return authResult;
    }

    // Get user from token data
    const userFromToken = ctx.inputs.data.user;
    const user = getUserById(userFromToken.userId);

    if (!user) {
      return new GSStatus(false, 404, 'User not found', {
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return new GSStatus(true, 200, 'Profile retrieved successfully', {
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error: any) {
    return new GSStatus(false, 500, 'Internal server error', {
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}
