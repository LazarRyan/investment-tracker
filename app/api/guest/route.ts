import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Generate a unique guest ID
    const guestId = uuidv4();
    
    // Create a guest session in the database
    const { error } = await supabase
      .from('guest_sessions')
      .insert({
        guest_id: guestId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });

    if (error) {
      console.error('Error creating guest session:', error);
      return NextResponse.json(
        { error: 'Failed to create guest session' },
        { status: 500 }
      );
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