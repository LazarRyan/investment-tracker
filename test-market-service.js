const https = require('https');

// Test the health endpoint
console.log('Testing health endpoint...');
https.get('https://market-service-production.up.railway.app/api/health', (res) => {
  console.log('Health Status Code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Health Response:', data);
    
    // After health check, test stock data
    console.log('\nTesting stock data endpoint...');
    https.get('https://market-service-production.up.railway.app/api/stock?symbol=AAPL', (res) => {
      console.log('Stock Data Status Code:', res.statusCode);
      let stockData = '';
      res.on('data', (chunk) => {
        stockData += chunk;
      });
      res.on('end', () => {
        console.log('Stock Data Response:', stockData);
      });
    }).on('error', (e) => {
      console.error('Stock Data Error:', e);
    });
  });
}).on('error', (e) => {
  console.error('Health Error:', e);
}); 