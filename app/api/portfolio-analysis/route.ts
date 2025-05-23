import { NextResponse } from 'next/server';
import { withAuth } from '@/utils/server-api';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface PortfolioAnalysisRequest {
  investments: Array<{
    symbol: string;
    shares: number;
    purchase_price: number;
    current_price: number;
    total_value: number;
    gain_loss: number;
    gain_loss_percentage: number;
    sector?: string;
  }>;
  portfolio_metrics: {
    total_value: number;
    total_invested: number;
    total_gain_loss: number;
    total_gain_loss_percentage: number;
    positions_count: number;
    sectors_count: number;
  };
}

async function generatePortfolioAnalysis(data: PortfolioAnalysisRequest) {
  const analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002';
  const analysisApiKey = process.env.ANALYSIS_SERVICE_API_KEY;

  if (!analysisApiKey) {
    throw new Error('Analysis service API key not configured');
  }

  // Create a comprehensive prompt for portfolio analysis
  const portfolioSummary = `
Portfolio Overview:
- Total Value: $${data.portfolio_metrics.total_value.toFixed(2)}
- Total Invested: $${data.portfolio_metrics.total_invested.toFixed(2)}
- Total Gain/Loss: $${data.portfolio_metrics.total_gain_loss.toFixed(2)} (${data.portfolio_metrics.total_gain_loss_percentage.toFixed(2)}%)
- Number of Positions: ${data.portfolio_metrics.positions_count}
- Sectors: ${data.portfolio_metrics.sectors_count}

Individual Holdings:
${data.investments.map(inv => 
  `- ${inv.symbol}: ${inv.shares} shares, Entry: $${inv.purchase_price}, Current: $${inv.current_price}, P&L: ${inv.gain_loss_percentage.toFixed(2)}%`
).join('\n')}
`;

  const prompt = `As a Wall Street portfolio analyst, provide a comprehensive analysis of this investment portfolio. 

${portfolioSummary}

Please provide:
1. Overall Portfolio Grade (A+ to D)
2. Diversification Grade (A+ to D) 
3. Risk Assessment Grade (A+ to D)
4. Performance Grade (A+ to D)
5. 4-5 key analysis points and recommendations

Format your response as JSON with this structure:
{
  "overall_grade": "grade",
  "diversification_grade": "grade", 
  "risk_grade": "grade",
  "performance_grade": "grade",
  "analysis_points": ["point1", "point2", "point3", "point4"]
}`;

  console.log(`Calling portfolio analysis service at: ${analysisServiceUrl}/api/analysis`);
  
  try {
    const response = await fetch(`${analysisServiceUrl}/api/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': analysisApiKey
      },
      body: JSON.stringify({
        symbol: 'PORTFOLIO',
        shares: data.portfolio_metrics.positions_count,
        purchase_price: data.portfolio_metrics.total_invested,
        current_price: data.portfolio_metrics.total_value,
        gain_loss_percentage: data.portfolio_metrics.total_gain_loss_percentage,
        custom_prompt: prompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Portfolio analysis service error (${response.status}): ${errorText}`);
      throw new Error(`Portfolio analysis service request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error('Error calling portfolio analysis service:', error);
    throw error;
  }
}

async function generateIndividualAnalysis(investment: any) {
  const analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002';
  const analysisApiKey = process.env.ANALYSIS_SERVICE_API_KEY;

  if (!analysisApiKey) {
    throw new Error('Analysis service API key not configured');
  }

  try {
    const response = await fetch(`${analysisServiceUrl}/api/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': analysisApiKey
      },
      body: JSON.stringify({
        symbol: investment.symbol,
        shares: investment.shares,
        purchase_price: investment.purchase_price,
        current_price: investment.current_price,
        gain_loss_percentage: investment.gain_loss_percentage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Individual analysis service error (${response.status}): ${errorText}`);
      return null; // Return null for individual failures, don't break the whole process
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error(`Error analyzing ${investment.symbol}:`, error);
    return null;
  }
}

// POST - Generate comprehensive portfolio analysis
export async function POST(request: Request) {
  return withAuth(async (supabase: SupabaseClient, userId: string, req: Request) => {
    try {
      const requestData: PortfolioAnalysisRequest = await req.json();

      // Generate portfolio-level analysis
      const portfolioAnalysisText = await generatePortfolioAnalysis(requestData);
      
      // Try to parse the JSON response from ChatGPT
      let portfolioGrade;
      try {
        // Extract JSON from the response if it's wrapped in text
        const jsonMatch = portfolioAnalysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          portfolioGrade = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: parse the text response manually
          portfolioGrade = {
            overall_grade: 'B+',
            diversification_grade: 'B',
            risk_grade: 'B+',
            performance_grade: requestData.portfolio_metrics.total_gain_loss > 0 ? 'A-' : 'B-',
            analysis_points: [portfolioAnalysisText]
          };
        }
      } catch (parseError) {
        console.error('Error parsing portfolio analysis JSON:', parseError);
        // Fallback to text-based analysis
        portfolioGrade = {
          overall_grade: 'B+',
          diversification_grade: 'B',
          risk_grade: 'B+',
          performance_grade: requestData.portfolio_metrics.total_gain_loss > 0 ? 'A-' : 'B-',
          analysis_points: [portfolioAnalysisText]
        };
      }

      // Generate individual investment analyses in parallel
      const individualAnalyses = await Promise.all(
        requestData.investments.map(async (investment) => {
          const analysis = await generateIndividualAnalysis(investment);
          return {
            symbol: investment.symbol,
            analysis: analysis,
            grade: investment.gain_loss_percentage > 0 ? 'A' : 'B', // Fallback grade
            raw_analysis: analysis
          };
        })
      );

      // Format the response
      const response = {
        portfolio_grade: {
          overall: portfolioGrade.overall_grade,
          diversification: portfolioGrade.diversification_grade,
          risk: portfolioGrade.risk_grade,
          performance: portfolioGrade.performance_grade,
          analysis: portfolioGrade.analysis_points
        },
        individual_analyses: individualAnalyses,
        generated_at: new Date().toISOString()
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error generating portfolio analysis:', error);
      return NextResponse.json({ 
        error: 'Failed to generate portfolio analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }, request);
} 