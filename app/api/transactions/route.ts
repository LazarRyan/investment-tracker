import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface Transaction {
  id: string;
  investment_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  date: string;
  notes?: string;
}

export async function GET() {
  try {
    const supabase = createClient();
    const cookieStore = cookies();
    const isGuest = cookieStore.get('guest_mode')?.value === 'true';
    
    const { data: { session } } = await supabase.auth.getSession();
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

      // Create or update guest session
      console.log('Upserting guest session for:', userId);
      const { error: sessionError } = await supabase
        .from('guest_sessions')
        .upsert({
          guest_id: userId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        });

      if (sessionError) {
        console.error('Error creating guest session:', sessionError);
        throw sessionError;
      }
    }

    console.log('Fetching transactions for user:', userId);

    // Get all transactions for investments owned by the user
    const { data: investments } = await supabase
      .from('investments')
      .select('id')
      .eq('user_id', userId);

    if (!investments) {
      return NextResponse.json([]);
    }

    const investmentIds = investments.map(inv => inv.id);
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('investment_id', investmentIds)
      .order('date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Found transactions:', data?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const cookieStore = cookies();
    const isGuest = cookieStore.get('guest_mode')?.value === 'true';
    
    const { data: { session } } = await supabase.auth.getSession();
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

      // Create or update guest session
      console.log('Upserting guest session for:', userId);
      const { error: sessionError } = await supabase
        .from('guest_sessions')
        .upsert({
          guest_id: userId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        });

      if (sessionError) {
        console.error('Error creating guest session:', sessionError);
        throw sessionError;
      }
    }

    const transaction = await request.json();

    // Verify that the investment belongs to the user
    const { data: investment, error: investmentError } = await supabase
      .from('investments')
      .select('id')
      .eq('id', transaction.investment_id)
      .eq('user_id', userId)
      .single();

    if (investmentError || !investment) {
      return NextResponse.json(
        { error: 'Investment not found or unauthorized' },
        { status: 403 }
      );
    }

    // Insert the transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 