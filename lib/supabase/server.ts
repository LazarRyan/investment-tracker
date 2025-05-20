import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
          select: () => ({ data: [], error: null }),
          insert: () => ({ data: null, error: null }),
          delete: () => ({ data: null, error: null }),
          upsert: () => ({ data: null, error: null }),
          eq: () => ({ data: null, error: null }),
          in: () => ({ data: null, error: null }),
          order: () => ({ data: null, error: null }),
          single: () => ({ data: null, error: null }),
        }),
      };
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not found. Please check your environment variables.');
      return null;
    }

    const cookieStore = cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            try {
              return cookieStore.get(name)?.value;
            } catch (error) {
              // Handle cookie errors silently during build
              return undefined;
            }
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Handle cookie errors silently during build
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Handle cookie errors silently during build
            }
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