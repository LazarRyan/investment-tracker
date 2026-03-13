import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Generate a unique guest ID
    const guestId = uuidv4();

    // Optionally persist to DB — not required for guest mode to function
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const { createServerSupabaseClient } = await import('@/lib/supabase/server');
        const supabase = await createServerSupabaseClient();
        await supabase.from('guest_sessions').insert({
          guest_id: guestId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    } catch (dbError) {
      // Non-fatal: guest mode works without DB persistence
      console.warn('Guest session DB insert skipped:', dbError);
    }

    // Create response with redirect
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Guest session created successfully',
        redirect: '/dashboard',
        guestId: guestId // Include guestId as fallback
      },
      { status: 200 }
    );

    // Set cookies with proper options
    const cookieOptions = {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/'
    };

    response.cookies.set('guest_mode', 'true', cookieOptions);
    response.cookies.set('guest_id', guestId, cookieOptions);

    return response;
  } catch (error) {
    console.error('Guest session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 