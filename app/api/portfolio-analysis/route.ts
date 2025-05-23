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

async function generateFallbackPortfolioAnalysis(data: PortfolioAnalysisRequest) {
  // Simple built-in analysis when external service is not available
  const metrics = data.portfolio_metrics;
  const investments = data.investments;
  
  // Calculate grades based on simple rules
  const performanceGrade = metrics.total_gain_loss_percentage > 10 ? 'A' : 
                          metrics.total_gain_loss_percentage > 5 ? 'B+' :
                          metrics.total_gain_loss_percentage > 0 ? 'B' :
                          metrics.total_gain_loss_percentage > -5 ? 'C+' :
                          metrics.total_gain_loss_percentage > -10 ? 'C' : 'D';
  
  const diversificationGrade = metrics.sectors_count >= 5 ? 'A' :
                              metrics.sectors_count >= 3 ? 'B+' :
                              metrics.sectors_count >= 2 ? 'B' :
                              metrics.positions_count >= 3 ? 'C+' : 'C';
  
  const riskGrade = metrics.positions_count >= 10 ? 'A' :
                   metrics.positions_count >= 5 ? 'B+' :
                   metrics.positions_count >= 3 ? 'B' : 'C+';
  
  const overallGrade = [performanceGrade, diversificationGrade, riskGrade]
    .map(g => ({ 'A': 4, 'B+': 3.5, 'B': 3, 'C+': 2.5, 'C': 2, 'D': 1 }[g] || 2))
    .reduce((a, b) => a + b, 0) / 3;
  
  const overallGradeStr = overallGrade >= 3.5 ? 'A' :
                         overallGrade >= 3 ? 'B+' :
                         overallGrade >= 2.5 ? 'B' :
                         overallGrade >= 2 ? 'C+' : 'C';
  
  // Generate analysis points
  const analysisPoints: string[] = [];
  
  if (metrics.total_gain_loss_percentage > 0) {
    analysisPoints.push(`Your portfolio is performing well with a ${metrics.total_gain_loss_percentage.toFixed(2)}% overall return.`);
  } else {
    analysisPoints.push(`Your portfolio is currently down ${Math.abs(metrics.total_gain_loss_percentage).toFixed(2)}%. Consider reviewing underperforming positions.`);
  }
  
  if (metrics.sectors_count < 3) {
    analysisPoints.push(`Consider diversifying across more sectors. You currently have positions in ${metrics.sectors_count} sector(s).`);
  } else {
    analysisPoints.push(`Good diversification with positions across ${metrics.sectors_count} sectors.`);
  }
  
  if (metrics.positions_count < 5) {
    analysisPoints.push(`Consider adding more positions to reduce concentration risk. You currently have ${metrics.positions_count} position(s).`);
  }
  
  const topPerformer = investments.reduce((best, current) => 
    current.gain_loss_percentage > best.gain_loss_percentage ? current : best
  );
  
  const worstPerformer = investments.reduce((worst, current) => 
    current.gain_loss_percentage < worst.gain_loss_percentage ? current : worst
  );
  
  if (topPerformer.gain_loss_percentage > 0) {
    analysisPoints.push(`${topPerformer.symbol} is your top performer with a ${topPerformer.gain_loss_percentage.toFixed(2)}% gain.`);
  }
  
  if (worstPerformer.gain_loss_percentage < -10) {
    analysisPoints.push(`${worstPerformer.symbol} is significantly underperforming with a ${worstPerformer.gain_loss_percentage.toFixed(2)}% loss. Consider reviewing this position.`);
  }
  
  return {
    overall_grade: overallGradeStr,
    diversification_grade: diversificationGrade,
    risk_grade: riskGrade,
    performance_grade: performanceGrade,
    analysis_points: analysisPoints
  };
}

async function generatePortfolioAnalysis(data: PortfolioAnalysisRequest) {
  const analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002';
  const analysisApiKey = process.env.ANALYSIS_SERVICE_API_KEY;

  // Check if we're in a production environment with localhost URL (misconfiguration)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV;
  const isLocalhost = analysisServiceUrl.includes('localhost') || analysisServiceUrl.includes('127.0.0.1');
  
  if (!analysisApiKey) {
    console.log('Analysis service API key not configured, using fallback analysis');
    return generateFallbackPortfolioAnalysis(data);
  }

  if (isProduction && isLocalhost) {
    console.log('Production environment detected with localhost analysis service URL, using fallback analysis');
    return generateFallbackPortfolioAnalysis(data);
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
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Portfolio analysis service error (${response.status}): ${errorText}`);
      console.log('Falling back to built-in analysis');
      return generateFallbackPortfolioAnalysis(data);
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error('Error calling portfolio analysis service:', error);
    console.log('Falling back to built-in analysis');
    return generateFallbackPortfolioAnalysis(data);
  }
}

async function generateIndividualAnalysis(investment: any) {
  const analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002';
  const analysisApiKey = process.env.ANALYSIS_SERVICE_API_KEY;

  // Check if we're in a production environment with localhost URL (misconfiguration)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV;
  const isLocalhost = analysisServiceUrl.includes('localhost') || analysisServiceUrl.includes('127.0.0.1');

  if (!analysisApiKey || (isProduction && isLocalhost)) {
    // Simple fallback analysis for individual investments
    const performance = investment.gain_loss_percentage;
    let analysis = `${investment.symbol} `;
    
    if (performance > 10) {
      analysis += "is performing exceptionally well. Consider taking some profits or holding for continued growth.";
    } else if (performance > 5) {
      analysis += "is showing solid performance. Monitor for continued growth.";
    } else if (performance > 0) {
      analysis += "is slightly positive. Watch for momentum changes.";
    } else if (performance > -5) {
      analysis += "is slightly underperforming. Monitor closely for trend reversal.";
    } else if (performance > -15) {
      analysis += "is significantly underperforming. Consider reviewing your investment thesis.";
    } else {
      analysis += "is performing poorly. Consider cutting losses or averaging down if fundamentals remain strong.";
    }
    
    return analysis;
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
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(15000) // 15 second timeout for individual analysis
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
      const portfolioAnalysisResult = await generatePortfolioAnalysis(requestData);
      
      // Handle both structured object (fallback) and text response (external service)
      let portfolioGrade;
      
      if (typeof portfolioAnalysisResult === 'object' && portfolioAnalysisResult.overall_grade) {
        // This is a structured response from the fallback function
        portfolioGrade = portfolioAnalysisResult;
      } else {
        // This is a text response from the external service
        const portfolioAnalysisText = portfolioAnalysisResult;
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
      }

      // Generate individual investment analyses in parallel
      const individualAnalyses = await Promise.all(
        requestData.investments.map(async (investment) => {
          const analysis = await generateIndividualAnalysis(investment);
          return {
            symbol: investment.symbol,
            analysis: analysis || `Analysis not available for ${investment.symbol}`,
            grade: investment.gain_loss_percentage > 10 ? 'A' : 
                   investment.gain_loss_percentage > 5 ? 'B+' :
                   investment.gain_loss_percentage > 0 ? 'B' :
                   investment.gain_loss_percentage > -5 ? 'C+' :
                   investment.gain_loss_percentage > -10 ? 'C' : 'D',
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