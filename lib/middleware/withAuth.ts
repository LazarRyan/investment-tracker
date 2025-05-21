import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthStatus } from '../supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthenticatedHandler = (
  supabase: SupabaseClient,
  userId: string,
  request?: Request
) => Promise<NextResponse | Response>;

export async function withAuth(handler: AuthenticatedHandler, request?: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { userId, hasSession, isGuest } = await getAuthStatus();

    if (!userId || (!hasSession && !isGuest)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(supabase, userId, request);
  } catch (error) {
    console.error('Error in auth middleware:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 