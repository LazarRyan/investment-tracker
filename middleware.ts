import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    // During build time, just proceed
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.next();
    }

    const res = NextResponse.next();
    let session = null;

    // Only attempt to create Supabase client if we have credentials
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              get(name: string) {
                return request.cookies.get(name)?.value;
              },
              set(name: string, value: string, options: any) {
                res.cookies.set({
                  name,
                  value,
                  ...options,
                });
              },
              remove(name: string, options: any) {
                res.cookies.set({
                  name,
                  value: '',
                  ...options,
                });
              },
            },
          }
        );

        if (supabase) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }
      } catch (error) {
        console.warn('Error getting session:', error);
      }
    }

    const isGuestMode = request.cookies.get('guest_mode')?.value === 'true';
    const guestId = request.cookies.get('guest_id')?.value;

    // Check auth condition
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/transactions')) {
      // Allow access if user is authenticated or in guest mode with valid guest ID
      if (!session && (!isGuestMode || !guestId)) {
        // Neither authenticated nor valid guest mode, redirect to login
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
    } else if (
      session && // Only redirect if user is authenticated (not in guest mode)
      (request.nextUrl.pathname.startsWith('/auth/signin') ||
        request.nextUrl.pathname.startsWith('/auth/signup'))
    ) {
      // If logged in and trying to access auth pages, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/transactions/:path*'],
}; 