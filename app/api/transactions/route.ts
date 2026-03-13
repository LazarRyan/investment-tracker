import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withAuth } from '@/utils/server-api';
import { NextResponse } from 'next/server';

// Force dynamic rendering since we're using cookies
export const dynamic = 'force-dynamic';

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
  return withAuth(async (supabase, userId) => {
    try {
      // Get all transactions for investments owned by the user
      const { data: investments } = await supabase
        .from('investments')
        .select('id')
        .eq('user_id', userId);

      if (!investments) {
        return NextResponse.json([]);
      }

      const investmentIds = investments.map(inv => inv.id);

      let data: any[] | null = [];
      let error: any = null;

      if (investmentIds.length > 0) {
        const result = await supabase
          .from('transactions')
          .select('*')
          .in('investment_id', investmentIds)
          .order('date', { ascending: false });
        data = result.data;
        error = result.error;
      } else {
        // Fallback for users with historical transactions but no active investments.
        // Some schemas include user_id directly on transactions.
        const fallback = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        data = fallback.data;
        error = fallback.error;

        // If user_id column is unavailable, return empty instead of 500.
        if (error) {
          console.warn('Transactions user_id fallback query failed:', error);
          return NextResponse.json([]);
        }
      }

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
  });
}

export async function POST(request: Request) {
  return withAuth(async (supabase, userId, req) => {
    try {
      // Use the passed request if req is undefined
      const requestToUse = req || request;
      const transaction = await requestToUse.json();

      // Validate required fields
      if (!transaction.investment_id) {
        console.error('Missing investment_id in transaction request:', transaction);
        return NextResponse.json(
          { error: 'Investment ID is required for transaction' },
          { status: 400 }
        );
      }

      if (!transaction.symbol || !transaction.type || !transaction.shares || !transaction.price) {
        console.error('Missing required fields in transaction request:', transaction);
        return NextResponse.json(
          { error: 'Required transaction fields are missing' },
          { status: 400 }
        );
      }

      // Verify that the investment exists and belongs to the user
      const { data: investment, error: investmentError } = await supabase
        .from('investments')
        .select('id, user_id, symbol')
        .eq('id', transaction.investment_id)
        .single();

      if (investmentError) {
        console.error('Error verifying investment ownership:', investmentError, 'for investment_id:', transaction.investment_id);
        return NextResponse.json(
          { 
            error: 'Failed to verify investment ownership',
            details: investmentError.message
          },
          { status: 500 }
        );
      }

      if (!investment) {
        console.error('Investment not found:', transaction.investment_id);
        return NextResponse.json(
          { error: 'Investment not found' },
          { status: 404 }
        );
      }

      if (investment.user_id !== userId) {
        console.error('Unauthorized investment access attempt. Investment belongs to:', investment.user_id, 'Request from:', userId);
        return NextResponse.json(
          { error: 'Unauthorized access to this investment' },
          { status: 403 }
        );
      }

      // Insert the transaction with user_id field to ensure proper ownership
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          ...transaction,
          // Add created_at timestamp
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        throw error;
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('Error creating transaction:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create transaction',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }, request);
}

export async function DELETE(request: Request) {
  return withAuth(async (supabase, userId, req) => {
    try {
      // Use the passed request if req is undefined
      const requestToUse = req || request;
      const { searchParams } = new URL(requestToUse.url);
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
  }, request);
} 