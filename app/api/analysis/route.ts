import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Set this API route to use Edge Runtime
export const runtime = 'edge';

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
  const { symbol, shares, purchase_price, current_price, gain_loss_percentage } = params;
  
  const prompt = `Analyze investment: ${symbol}, ${shares} shares, entry $${purchase_price}, current $${current_price}, performance ${gain_loss_percentage}%. Include: grade (A+ to D), risk (Low/Medium/High), technical analysis, fundamental assessment, portfolio impact, recommendations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a Wall Street analyst. Be concise and specific."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
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