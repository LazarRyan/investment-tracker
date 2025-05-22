import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // List of paths that require email verification
  const protectedPaths = ['/dashboard', '/portfolio', '/settings', '/transactions'];
  
  // Check if the current path requires verification
  const requiresVerification = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (!requiresVerification) {
    return NextResponse.next();
  }

  // Check if user is in guest mode
  const isGuestMode = request.cookies.get('guest_mode')?.value === 'true';
  const guestId = request.cookies.get('guest_id')?.value;

  // If user is in valid guest mode, allow access to dashboard
  if (isGuestMode && guestId && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    // If there's no session, redirect to sign in
    if (!session) {
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if email is verified
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email_confirmed_at) {
      // Redirect to email verification page if email is not verified
      return NextResponse.redirect(new URL('/auth/verify-email', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portfolio/:path*',
    '/settings/:path*',
    '/transactions/:path*'
  ],
}; 