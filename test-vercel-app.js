/**
 * Test script to verify if the Vercel app can retrieve data from Supabase
 * Run with: node test-vercel-app.js
 */

const fetch = require('node-fetch');

// Configuration - no need for API keys as we're testing public endpoints
const VERCEL_APP_URL = 'https://investment-tracker-tau.vercel.app';

// Test the main page to ensure the app is running
async function testMainPage() {
  console.log(`\n📡 Testing main page: ${VERCEL_APP_URL}`);
  try {
    const response = await fetch(VERCEL_APP_URL);
    
    if (!response.ok) {
      console.error(`❌ Main page request failed with status: ${response.status}`);
      return false;
    }
    
    console.log(`✅ Main page accessible (status: ${response.status})`);
    return true;
  } catch (error) {
    console.error('❌ Error accessing main page:', error.message);
    return false;
  }
}

// Test the stock ticker component which should display market data
async function testStockTicker() {
  console.log(`\n📡 Testing stock ticker data: ${VERCEL_APP_URL}/api/market-data`);
  try {
    const response = await fetch(`${VERCEL_APP_URL}/api/market-data`);
    
    if (!response.ok) {
      console.error(`❌ Market data request failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('❌ No market data returned');
      return false;
    }
    
    console.log(`✅ Market data retrieved successfully (${data.length} items)`);
    console.log('🔍 Sample data:');
    data.slice(0, 3).forEach(item => {
      console.log(`  - ${item.symbol}: $${item.price} (${item.change >= 0 ? '+' : ''}${item.change}%)`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error fetching market data:', error.message);
    return false;
  }
}

// Test historical data API if it exists
async function testHistoricalData() {
  console.log(`\n📡 Testing historical data API: ${VERCEL_APP_URL}/api/historical/AAPL`);
  try {
    const response = await fetch(`${VERCEL_APP_URL}/api/historical/AAPL`);
    
    if (!response.ok) {
      console.error(`❌ Historical data request failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('❌ No historical data returned');
      return false;
    }
    
    console.log(`✅ Historical data retrieved successfully (${data.length} items)`);
    console.log('🔍 Most recent data point:');
    console.log(`  - Date: ${new Date(data[0].timestamp).toLocaleString()}`);
    console.log(`  - Price: $${data[0].price}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error fetching historical data:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 TESTING VERCEL APP DATA RETRIEVAL');
  console.log('==================================');
  console.log(`🌐 Vercel App URL: ${VERCEL_APP_URL}`);
  
  const mainPageTest = await testMainPage();
  const stockTickerTest = await testStockTicker();
  const historicalDataTest = await testHistoricalData();
  
  console.log('\n📋 TEST SUMMARY');
  console.log('========================');
  console.log(`Main Page: ${mainPageTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stock Ticker Data: ${stockTickerTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Historical Data: ${historicalDataTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (mainPageTest && stockTickerTest && historicalDataTest) {
    console.log('\n🎉 All tests passed! The Vercel app is successfully retrieving data.');
  } else {
    console.log('\n⚠️ Some tests failed. The Vercel app may have issues retrieving data.');
  }
}

runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
}); 