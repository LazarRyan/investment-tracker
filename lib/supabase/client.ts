import { createBrowserClient } from '@supabase/ssr';
import { createMockClient } from './mock';

export const createClient = () => {
  // During build time or server-side rendering, return a mock client
  if (typeof window === 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
    return createMockClient();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not found. Please check your environment variables.');
    return null;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}; 