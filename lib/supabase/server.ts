import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';
import { createMockClient } from './mock';

export const createClient = () => {
  try {
    // During build time, return a mock client
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return createMockClient();
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not found. Please check your environment variables.');
      return null;
    }

    const cookieStore = cookies();

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
  } catch (error) {
    // Handle any errors during build time
    console.warn('Error creating Supabase client:', error);
    return null;
  }
}; 