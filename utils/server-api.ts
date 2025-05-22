import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthenticatedHandler = (
  supabase: SupabaseClient,
  userId: string,
  req?: Request
) => Promise<NextResponse | Response>;

/**
 * Authentication middleware for API routes
 * This function runs on the server side
 */
export async function withAuth(handler: AuthenticatedHandler, req?: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: any) => {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    
    // Get user id from session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if user is authenticated
    if (session?.user?.id) {
      return handler(supabase, session.user.id, req);
    }
    
    // Check if user is in guest mode
    const isGuest = cookieStore.get('guest_mode')?.value === 'true';
    const guestId = cookieStore.get('guest_id')?.value;
    
    if (isGuest && guestId) {
      return handler(supabase, guestId, req);
    }
    
    // If neither authenticated nor guest, return unauthorized
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 