import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  // During build time or server-side rendering, return a mock client
  if (typeof window === 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ data: {}, error: null }),
        updateUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
          error: null
        })
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

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}; 