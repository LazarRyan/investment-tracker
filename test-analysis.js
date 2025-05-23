const fetch = require('node-fetch');

async function testAnalysisService() {
  try {
    const response = await fetch('http://localhost:3002/api/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d'
      },
      body: JSON.stringify({
        symbol: 'AAPL',
        shares: 10,
        purchase_price: 150,
        current_price: 175,
        gain_loss_percentage: 16.67
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Analysis service is working!');
      console.log('Response:', result);
    } else {
      console.log('❌ Analysis service error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

testAnalysisService(); 