import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  try {
    // Generate a new guest ID
    const guestId = uuidv4();
    
    // Insert into guest_sessions table
    const { error: sessionError } = await supabase
      .from('guest_sessions')
      .upsert({
        guest_id: guestId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });

    if (sessionError) {
      console.error('Error creating guest session:', sessionError);
      return NextResponse.json({ error: 'Failed to create guest session' }, { status: 500 });
    }

    // Set cookies
    cookieStore.set('guest_mode', 'true', {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    cookieStore.set('guest_id', guestId, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({ success: true, guestId });
  } catch (error) {
    console.error('Error in guest mode setup:', error);
    return NextResponse.json({ 
      error: 'Failed to set up guest mode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 