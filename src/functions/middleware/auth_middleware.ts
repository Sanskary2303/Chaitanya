import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { requireAuth } from '../../helper/auth';

/**
 * Authentication middleware that can be used in any function
 * Returns GSStatus if authentication fails, null if successful
 */
export default async function (ctx: GSContext, args: PlainObject): Promise<GSStatus | null> {
  return requireAuth(ctx);
}
