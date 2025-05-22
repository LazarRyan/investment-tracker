import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
  ok: boolean;
  status?: number;
  json: () => Promise<T>;
}

/**
 * Wrapper around fetch that adds the internal request token
 * and handles common response patterns
 */
export async function internalFetch(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse> {
  try {
    // Ensure headers object exists
    const headers = {
      ...options.headers,
      'X-Internal-Request-Token': process.env.NEXT_PUBLIC_INTERNAL_REQUEST_TOKEN || '',
    };

    // Make the fetch request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Check if response is ok
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    // Return standardized response
    return {
      data: data,
      ok: response.ok,
      status: response.status,
      success: response.ok,
      error: !response.ok ? data?.error || response.statusText : undefined,
      json: async () => data,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Request failed',
      success: false,
      json: async () => ({ error: 'Request failed' }),
    };
  }
}

export type AuthenticatedHandler = (
  supabase: SupabaseClient,
  userId: string,
  req?: Request
) => Promise<NextResponse | Response>;

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