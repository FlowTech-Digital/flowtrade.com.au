import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, TEST_CREDENTIALS } from '../fixtures/test-data';

describe('Supabase Integration', () => {
  let supabase: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(() => {
    // Anonymous client (mimics frontend)
    supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );

    // Service role client (admin access for testing)
    if (SUPABASE_CONFIG.serviceRoleKey) {
      serviceClient = createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.serviceRoleKey
      );
    }
  });

  describe('Connection', () => {
    it('should connect to Supabase', async () => {
      const { data, error } = await supabase.auth.getSession();
      // Should not throw, even if no session
      expect(error).toBeNull();
    });

    it('should have valid Supabase URL', () => {
      expect(SUPABASE_CONFIG.url).toMatch(/^https:\/\/.*\.supabase\.co$/);
      expect(SUPABASE_CONFIG.url).not.toContain('placeholder');
    });
  });

  describe('Authentication', () => {
    it('should sign in with test credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(TEST_CREDENTIALS.email);
      expect(data.session).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
    });
  });

  describe('Database Queries (Authenticated)', () => {
    beforeAll(async () => {
      // Sign in before running these tests
      await supabase.auth.signInWithPassword({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
      });
    });

    it('should query organizations table', async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query quotes table', async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, status, total')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query jobs table', async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_number, status')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query invoices table', async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query customers table', async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('RLS Policies', () => {
    it('should enforce RLS - anon cannot access data directly', async () => {
      // Create fresh anon client (no auth)
      const anonClient = createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
      );

      const { data, error } = await anonClient
        .from('quotes')
        .select('*');

      // Should either return empty array or error (RLS blocking)
      if (!error) {
        expect(data?.length || 0).toBe(0);
      }
    });
  });
});
