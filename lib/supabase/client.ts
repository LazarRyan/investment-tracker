import { createBrowserClient } from '@supabase/ssr';
import { createMockClient } from './mock';

export const createClient = () => {
  // During build time or server-side rendering, return a mock client
  if (typeof window === 'undefined') {
    return createMockClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Please check your environment variables.');
    return createMockClient();
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}; 