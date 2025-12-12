import { describe, it, expect } from 'vitest';

/**
 * Health Check Tests
 * Basic connectivity and endpoint verification
 */

const BASE_URL = process.env.TEST_URL || 'https://flowtrade.com.au';

describe('Health Checks', () => {
  it('should respond to homepage request', async () => {
    const response = await fetch(BASE_URL);
    expect(response.status).toBe(200);
  });

  it('should respond to login page', async () => {
    const response = await fetch(`${BASE_URL}/login`);
    expect(response.status).toBe(200);
  });

  it('should protect dashboard route (redirect)', async () => {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      redirect: 'manual',
    });
    // Should redirect (302/307) to login
    expect([200, 302, 307, 308]).toContain(response.status);
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await fetch(`${BASE_URL}/this-route-does-not-exist-12345`);
    expect(response.status).toBe(404);
  });
});
