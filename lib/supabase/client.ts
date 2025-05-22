import { createBrowserClient } from '@supabase/ssr';
import { createMockClient } from './mock';
import type { Database } from '../../types/supabase';

export const createClient = () => {
  // During build time or server-side rendering, return a mock client
  if (typeof window === 'undefined') {
    return createMockClient();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Please check your environment variables.');
    return createMockClient();
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1]
        },
        set(name: string, value: string, options: { path: string }) {
          document.cookie = `${name}=${value}; path=${options.path}`
        },
        remove(name: string, options: { path: string }) {
          document.cookie = `${name}=; path=${options.path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      },
    }
  );
}; 