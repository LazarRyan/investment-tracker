const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.MARKET_SERVICE_URL || process.env.MARKET_DATA_URL || 'http://localhost:8000';
const API_KEY = process.env.ANALYSIS_SERVICE_API_KEY || process.env.API_KEY || '';

async function run() {
  console.log(`Testing market service at: ${BASE_URL}`);

  // Test health endpoint
  console.log('\nTesting health endpoint...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  console.log('Health Status Code:', healthRes.status);
  console.log('Health Response:', await healthRes.text());

  // Test prices endpoint
  console.log('\nTesting prices endpoint...');
  const pricesRes = await fetch(`${BASE_URL}/api/prices?symbol=AAPL`, {
    headers: API_KEY ? { 'x-api-key': API_KEY } : {}
  });
  console.log('Prices Status Code:', pricesRes.status);
  console.log('Prices Response:', await pricesRes.text());

  // Optional refresh trigger
  if (API_KEY) {
    console.log('\nTesting refresh endpoint...');
    const refreshRes = await fetch(`${BASE_URL}/api/refresh`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY }
    });
    console.log('Refresh Status Code:', refreshRes.status);
    console.log('Refresh Response:', await refreshRes.text());
  } else {
    console.log('\nSkipping /api/refresh test (ANALYSIS_SERVICE_API_KEY/API_KEY not set).');
  }
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});