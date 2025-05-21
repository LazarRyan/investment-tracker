import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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

    // Set cookies with appropriate options for edge runtime
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

    cookieStore.set('guest_mode', 'true', cookieOptions);
    cookieStore.set('guest_id', guestId, cookieOptions);

    return NextResponse.json({ success: true, guestId });
  } catch (error) {
    console.error('Error in guest mode setup:', error);
    return NextResponse.json({ 
      error: 'Failed to set up guest mode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 