import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Integration Tests
 * Verifies database connectivity and basic operations
 */

let supabase: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabase = createClient(url, key);
});

describe('Supabase Integration', () => {
  it('should connect to database', async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('should query quotes table', async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('id, quote_number, status')
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

  it('should verify RLS policies work (anon key blocked)', async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.warn('Skipping RLS test - no anon key');
      return;
    }
    
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey
    );
    
    const { data, error } = await anonClient
      .from('quotes')
      .select('*');
    
    // Should return empty array (RLS blocking) or specific error
    expect(data?.length || 0).toBe(0);
  });
});
