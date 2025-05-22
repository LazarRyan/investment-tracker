import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/utils/server-api';
import type { SupabaseClient } from '@supabase/supabase-js';

// Force dynamic rendering since we're using cookies through withAuth
export const dynamic = 'force-dynamic';

// Types
export interface Investment {
  id: string;
  user_id: string;
  portfolio_id: string;
  symbol: string;
  name?: string;
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
  return withAuth(async (supabase: SupabaseClient, userId: string) => {
    try {
      const { data: investments, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (investmentsError) {
        console.error('Error fetching investments:', investmentsError);
        throw investmentsError;
      }

      return NextResponse.json(investments);
    } catch (error) {
      console.error('Error in investments API:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch investments',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// POST a new investment
export async function POST(request: Request) {
  return withAuth(async (supabase: SupabaseClient, userId: string, req: Request) => {
    try {
      const investment = await req.json();

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

      // Create the investment
      const { data: newInvestment, error: investmentError } = await supabase
        .from('investments')
        .insert([{
          id: uuidv4(),
          user_id: userId,
          portfolio_id: portfolioId,
          ...investment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (investmentError) throw investmentError;

      return NextResponse.json(newInvestment);
    } catch (error) {
      console.error('Error creating investment:', error);
      return NextResponse.json({ 
        error: 'Failed to create investment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }, request);
}

// PATCH update an investment (for partial share sales)
export async function PATCH(request: Request) {
  return withAuth(async (supabase: SupabaseClient, userId: string, req: Request) => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      const updates = await req.json();

      if (!id) {
        return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });
      }

      // Verify the investment belongs to the user
      const { data: existingInvestment, error: getError } = await supabase
        .from('investments')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (getError || !existingInvestment) {
        return NextResponse.json({ 
          error: 'Investment not found or unauthorized' 
        }, { status: 404 });
      }

      // Update the investment with new values
      const { data: updatedInvestment, error: updateError } = await supabase
        .from('investments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json(updatedInvestment);
    } catch (error) {
      console.error('Error updating investment:', error);
      return NextResponse.json({ 
        error: 'Failed to update investment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }, request);
}

// DELETE an investment
export async function DELETE(request: Request) {
  return withAuth(async (supabase: SupabaseClient, userId: string, req: Request) => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });
      }

      const { error: deleteError } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting investment:', error);
      return NextResponse.json({ 
        error: 'Failed to delete investment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }, request);
} 