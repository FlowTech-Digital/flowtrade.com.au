// Simple in-memory rate limiter for API routes
// Note: This resets on each deployment - for production, use Redis/KV

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  limit: number;    // Max requests per interval
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.interval,
    });
    return {
      success: true,
      remaining: config.limit - 1,
      reset: now + config.interval,
    };
  }

  if (entry.count >= config.limit) {
    // Rate limited
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

function cleanupExpiredEntries(now: number): void {
  // Use forEach instead of for...of to avoid MapIterator downlevelIteration issue
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Use optional chaining - split()[0] returns string | undefined in strict mode
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}
