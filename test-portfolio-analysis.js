const fetch = require('node-fetch');

async function testPortfolioAnalysis() {
  try {
    const samplePortfolioData = {
      investments: [
        {
          symbol: 'AAPL',
          shares: 10,
          purchase_price: 150,
          current_price: 175,
          total_value: 1750,
          gain_loss: 250,
          gain_loss_percentage: 16.67,
          sector: 'Technology'
        },
        {
          symbol: 'MSFT',
          shares: 5,
          purchase_price: 300,
          current_price: 320,
          total_value: 1600,
          gain_loss: 100,
          gain_loss_percentage: 6.67,
          sector: 'Technology'
        },
        {
          symbol: 'JPM',
          shares: 8,
          purchase_price: 140,
          current_price: 145,
          total_value: 1160,
          gain_loss: 40,
          gain_loss_percentage: 3.57,
          sector: 'Financial'
        }
      ],
      portfolio_metrics: {
        total_value: 4510,
        total_invested: 4120,
        total_gain_loss: 390,
        total_gain_loss_percentage: 9.47,
        positions_count: 3,
        sectors_count: 2
      }
    };

    const response = await fetch('https://investment-analysis-service-production.up.railway.app/api/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d'
      },
      body: JSON.stringify({
        symbol: 'PORTFOLIO',
        shares: samplePortfolioData.portfolio_metrics.positions_count,
        purchase_price: samplePortfolioData.portfolio_metrics.total_invested,
        current_price: samplePortfolioData.portfolio_metrics.total_value,
        gain_loss_percentage: samplePortfolioData.portfolio_metrics.total_gain_loss_percentage,
        custom_prompt: `As a Wall Street portfolio analyst, provide a comprehensive analysis of this investment portfolio. 

Portfolio Overview:
- Total Value: $${samplePortfolioData.portfolio_metrics.total_value.toFixed(2)}
- Total Invested: $${samplePortfolioData.portfolio_metrics.total_invested.toFixed(2)}
- Total Gain/Loss: $${samplePortfolioData.portfolio_metrics.total_gain_loss.toFixed(2)} (${samplePortfolioData.portfolio_metrics.total_gain_loss_percentage.toFixed(2)}%)
- Number of Positions: ${samplePortfolioData.portfolio_metrics.positions_count}
- Sectors: ${samplePortfolioData.portfolio_metrics.sectors_count}

Individual Holdings:
${samplePortfolioData.investments.map(inv => 
  `- ${inv.symbol}: ${inv.shares} shares, Entry: $${inv.purchase_price}, Current: $${inv.current_price}, P&L: ${inv.gain_loss_percentage.toFixed(2)}%`
).join('\n')}

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
}`
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Portfolio analysis service is working!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Portfolio analysis service error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

testPortfolioAnalysis(); 