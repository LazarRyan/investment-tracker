import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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
  
  const prompt = `As a senior Wall Street investment analyst, provide a comprehensive analysis of this investment:

INVESTMENT OVERVIEW
Symbol: ${symbol}
Position Size: ${shares} shares
Entry Price: $${purchase_price}
Current Price: $${current_price}
Performance: ${gain_loss_percentage}%

Provide a detailed analysis including:
1. Investment Grade (A+ to D) with explanation
2. Risk Rating (Low/Medium/High) with justification
3. Technical Analysis
4. Fundamental Assessment
5. Portfolio Impact
6. Clear Recommendations`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a senior Wall Street investment analyst. Provide detailed analysis with specific numbers and clear recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
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
    const { searchParams } = new URL(request.url);
    const investmentId = searchParams.get('investment_id');

    if (!investmentId) {
      return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });
    }

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
    const { investment_id, symbol, shares, purchase_price, current_price, gain_loss_percentage } = await request.json();

    const analysis = await generateAnalysis({
      symbol,
      shares,
      purchase_price,
      current_price,
      gain_loss_percentage
    });

    // Store the analysis in the database
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