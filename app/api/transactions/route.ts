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
  });
}

export async function POST(request: Request) {
  return withAuth(async (supabase, userId, req) => {
    try {
      const transaction = await req.json();

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
  }, request);
}

export async function DELETE(request: Request) {
  return withAuth(async (supabase, userId, req) => {
    try {
      const { searchParams } = new URL(req.url);
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
        .eq('id', id)
        .eq('user_id', userId); // Add user check for security

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