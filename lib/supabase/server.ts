import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import type { CookieOptions } from '@supabase/ssr';

export interface AuthStatus {
  isGuest: boolean;
  hasSession: boolean;
  userId: string | null;
}

export async function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: CookieOptions) => {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const cookieStore = cookies();
  const supabase = await createServerSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Error getting session:', sessionError);
    throw sessionError;
  }

  const isGuest = cookieStore.get('guest_mode')?.value === 'true';
  let userId = session?.user?.id;

  if (!userId && isGuest) {
    let guestId = cookieStore.get('guest_id')?.value;
    
    if (!guestId) {
      guestId = uuidv4();
      cookieStore.set('guest_id', guestId, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    userId = guestId;

    // Create or update guest session
    await supabase
      .from('guest_sessions')
      .upsert({
        guest_id: guestId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
  }

  return {
    isGuest,
    hasSession: !!session,
    userId
  };
} 