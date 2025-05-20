import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface InvestmentAnalysis {
  id: string;
  investment_id: string;
  analysis_type: string;
  content: string;
  created_at: string;
  updated_at: string;
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

    // Generate AI analysis using OpenAI
    const prompt = `As a senior Wall Street investment analyst, provide a comprehensive analysis of this investment. Do not use any Markdown formatting or special characters - use plain text only:

INVESTMENT OVERVIEW
Symbol: ${symbol}
Position Size: ${shares} shares
Entry Price: $${purchase_price}
Current Price: $${current_price}
Performance: ${gain_loss_percentage}%

### INVESTMENT GRADE

#### Overall Grade
• Investment Health Grade: [A+/A/B+/B/C+/C/D] with detailed explanation
• Risk Rating: [Low/Medium/High] with justification

#### Component Grades
• Technical Position: [A-F] - Based on price action, momentum, and technical indicators
• Fundamental Strength: [A-F] - Based on company financials and market position
• Risk Management: [A-F] - Based on position sizing and portfolio fit
• Value Assessment: [A-F] - Based on current valuation and growth potential
• Market Timing: [A-F] - Based on current market conditions and entry/exit timing

### QUANTITATIVE ANALYSIS

#### Current Position Valuation and Performance Metrics
• Initial Investment: $${(purchase_price * shares).toFixed(2)} (${shares} shares at $${purchase_price} each)
• Current Value: $${(current_price * shares).toFixed(2)} (${shares} shares at $${current_price})
• Performance: ${gain_loss_percentage > 0 ? '+' : ''}${gain_loss_percentage}%

#### Key Technical Indicators and Price Action Analysis
• Moving Averages: Analyze price relative to 50-day and 200-day moving averages
• Relative Strength Index: Current RSI level and trend analysis
• Volume Analysis: Recent volume trends and their implications
• Support/Resistance Levels: Key price levels and their significance

#### Volatility Assessment and Risk Metrics
• Beta Coefficient: Compare volatility to market benchmark
• Standard Deviation: 12-month price volatility analysis
• Sharpe Ratio: Risk-adjusted return assessment
• Maximum Drawdown: Largest peak-to-trough decline

### FUNDAMENTAL ASSESSMENT

#### Company's Market Position and Competitive Advantages
• Market Share Analysis: Current market position and trends
• Competitive Landscape: Key competitors and relative strengths
• Brand Value and Moat: Competitive advantages assessment

#### Industry Trends and Market Dynamics
• Sector Performance: Industry growth trends and outlook
• Growth Catalysts: Key drivers of future growth
• Regulatory Environment: Current and potential regulatory impacts

#### Risk Factors and Mitigation Strategies
• Market Risk: Broader market and economic factors
• Company-Specific Risk: Internal challenges and risks
• Sector Risk: Industry-specific challenges
• Mitigation Recommendations: Risk management strategies

### PORTFOLIO IMPACT

#### Position Sizing and Portfolio Weight
• Current Portfolio Weight: ${((current_price * shares) / 100).toFixed(2)}% of portfolio
• Recommended Weight Range: Target allocation range
• Diversification Impact: Effect on portfolio diversification

#### Risk-Adjusted Return Analysis
• Contribution to Portfolio Risk: Impact on overall portfolio risk
• Risk-Adjusted Performance Metrics: Key performance indicators
• Correlation with Other Holdings: Diversification effectiveness

### ACTIONABLE RECOMMENDATIONS

#### Clear Position Management Strategy
• Hold/Buy/Sell Recommendation: Clear action recommendation with rationale
• Target Price Range: Specific price targets with timeframe
• Stop Loss Levels: Risk management price levels

#### Strategic Alternatives and Hedging
• Alternative Positions: Suggested portfolio adjustments
• Hedging Strategies: Risk mitigation approaches
• Risk Management Guidelines: Ongoing monitoring recommendations

Please provide specific numbers, detailed analysis, and clear recommendations based on current market conditions and technical/fundamental factors. Do not use any special formatting characters like **, -, or #. Use only plain text with section headers and bullet points (•).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a senior Wall Street investment analyst. Provide detailed analysis with specific numbers and clear recommendations. Include a comprehensive grading system with letter grades (A+ to D) and detailed justifications. Use section headers (### for main sections, #### for subsections) and bullet points (•) for detailed items. Do not use any Markdown formatting or special characters (**, -, #) within the content - use plain text only. Make all recommendations specific and actionable. Be critical and realistic in your grading - not every investment deserves an A grade."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysis = completion.choices[0].message.content;

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