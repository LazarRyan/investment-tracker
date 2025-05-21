import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Types
interface InvestmentAnalysis {
  id: string;
  investment_id: string;
  analysis_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

async function generateAnalysis(params: {
  symbol: string;
  shares: number;
  purchase_price: number;
  current_price: number;
  gain_loss_percentage: number;
}) {
  console.log(`Calling analysis service at: ${process.env.ANALYSIS_SERVICE_URL}/api/analysis`);
  try {
    const response = await fetch(`${process.env.ANALYSIS_SERVICE_URL}/api/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANALYSIS_SERVICE_API_KEY!
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Analysis service error (${response.status}): ${errorText}`);
      throw new Error(`Analysis service request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error calling analysis service:', error);
    throw error;
  }
}

// GET analysis for a specific investment
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const investmentId = searchParams.get('investment_id');

    if (!investmentId) {
      return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: analysis, error } = await supabase
      .from('investment_analysis')
      .select('*')
      .eq('investment_id', investmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}

// POST a new analysis
export async function POST(request: Request) {
  try {
    const { investment_id, symbol, shares, purchase_price, current_price, gain_loss_percentage } = await request.json();

    const analysis = await generateAnalysis({
      symbol,
      shares,
      purchase_price,
      current_price,
      gain_loss_percentage
    });

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('investment_analysis')
      .insert([
        {
          investment_id,
          analysis_type: 'comprehensive',
          content: analysis,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating analysis:', error);
    return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 });
  }
} 