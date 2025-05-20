import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Investment {
  id: string;
  user_id: string;
  portfolio_id: string;
  symbol: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
  sector?: string;
  created_at: string;
  updated_at: string;
}

// GET all investments for the current user
export async function GET() {
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
    console.log('Checking auth session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw sessionError;
    }

    const isGuest = cookieStore.get('guest_mode')?.value === 'true';
    console.log('Auth status:', { isGuest, hasSession: !!session });

    if (!session && !isGuest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For guest users, get or create a session ID
    let userId = session?.user?.id;
    if (!userId && isGuest) {
      let guestId = cookieStore.get('guest_id')?.value;
      console.log('Guest ID from cookie:', guestId);
      
      if (!guestId) {
        guestId = uuidv4();
        console.log('Created new guest ID:', guestId);
        cookieStore.set('guest_id', guestId, {
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      }
      userId = guestId;

      // Create or update guest session
      console.log('Upserting guest session for:', guestId);
      const { error: sessionError } = await supabase
        .from('guest_sessions')
        .upsert({
          guest_id: guestId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        });

      if (sessionError) {
        console.error('Error creating guest session:', sessionError);
        throw sessionError;
      }
    }

    console.log('Fetching investments for user:', userId);
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError);
      throw investmentsError;
    }

    console.log('Successfully fetched investments:', investments?.length || 0);
    return NextResponse.json(investments);
  } catch (error) {
    console.error('Error in investments API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch investments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST a new investment
export async function POST(request: Request) {
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
    const { data: { session } } = await supabase.auth.getSession();
    const isGuest = cookieStore.get('guest_mode')?.value === 'true';

    if (!session && !isGuest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For guest users, get or create a session ID
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
      console.log('Upserting guest session for:', guestId);
      const { error: sessionError } = await supabase
        .from('guest_sessions')
        .upsert({
          guest_id: guestId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (sessionError) {
        console.error('Error creating guest session:', sessionError);
        throw sessionError;
      }
    }

    const investment = await request.json();

    // Get or create a portfolio for the user
    const { data: existingPortfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .single();

    let portfolioId;
    if (!existingPortfolio) {
      const { data: newPortfolio, error: createPortfolioError } = await supabase
        .from('portfolios')
        .insert([{
          id: uuidv4(),
          user_id: userId,
          name: 'Default Portfolio',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createPortfolioError) throw createPortfolioError;
      portfolioId = newPortfolio.id;
    } else {
      portfolioId = existingPortfolio.id;
    }

    const { data, error } = await supabase
      .from('investments')
      .insert([
        {
          id: uuidv4(),
          symbol: investment.symbol,
          shares: investment.shares,
          purchase_price: investment.purchase_price,
          purchase_date: investment.purchase_date,
          notes: investment.notes,
          user_id: userId,
          portfolio_id: portfolioId,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json({ 
      error: 'Failed to create investment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE an investment
export async function DELETE(request: Request) {
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
    const { data: { session } } = await supabase.auth.getSession();
    const isGuest = cookieStore.get('guest_mode')?.value === 'true';

    if (!session && !isGuest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For guest users, get or create a session ID
    let userId = session?.user?.id;
    if (!userId && isGuest) {
      userId = cookieStore.get('guest_id')?.value;
      if (!userId) {
        return NextResponse.json({ error: 'Guest ID not found' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting investment:', error);
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 });
  }
} 