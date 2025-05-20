import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';

export const createClient = () => {
  try {
    // During build time, return a mock client
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
        },
        from: () => ({
          select: () => ({
            data: [], 
            error: null,
            eq: () => ({
              data: [], 
              error: null,
              single: () => ({ data: null, error: null }),
              order: () => ({
                data: [], 
                error: null,
                limit: () => ({ data: [], error: null })
              })
            }),
            order: () => ({
              data: [], 
              error: null,
              limit: () => ({ data: [], error: null })
            }),
            single: () => ({ data: null, error: null })
          }),
          insert: () => ({
            data: null, 
            error: null,
            select: () => ({
              data: null,
              error: null,
              single: () => ({ data: null, error: null })
            })
          }),
          delete: () => ({
            data: null, 
            error: null,
            eq: () => ({ data: null, error: null })
          }),
          upsert: () => ({
            data: null, 
            error: null,
            select: () => ({
              data: null,
              error: null,
              single: () => ({ data: null, error: null })
            })
          }),
        }),
      };
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