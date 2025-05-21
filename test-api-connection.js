/**
 * Test script to verify connection between Next.js app and the API service
 * Run with: node test-api-connection.js
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Configuration
const API_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:8000';
const API_KEY = process.env.ANALYSIS_SERVICE_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: ANALYSIS_SERVICE_API_KEY not found in .env.local');
  console.log('Please make sure you have set the API key in your .env.local file');
  process.exit(1);
}

// Test health endpoint
async function testHealthEndpoint() {
  console.log(`\n📡 Testing API health endpoint: ${API_URL}/api/health`);
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`❌ Health check failed with status: ${response.status}`);
      console.error('Response:', await response.text());
      return false;
    }

    const data = await response.json();
    console.log('✅ Health check successful!');
    console.log('📊 API Status:', data.status);
    
    if (data.services) {
      console.log('🔍 Services:');
      console.log(`  - FMP: ${data.services.fmp?.status || 'unknown'}`);
      console.log(`  - CoinGecko: ${data.services.coingecko?.status || 'unknown'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error connecting to API:', error.message);
    return false;
  }
}

// Test stocks endpoint
async function testStocksEndpoint() {
  console.log(`\n📡 Testing API stocks endpoint: ${API_URL}/api/stocks`);
  try {
    const response = await fetch(`${API_URL}/api/stocks`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`❌ Stocks endpoint failed with status: ${response.status}`);
      console.error('Response:', await response.text());
      return false;
    }

    const data = await response.json();
    console.log('✅ Stocks endpoint successful!');
    console.log(`📈 Received ${data.length} market data items`);
    
    // Display first few items
    if (data.length > 0) {
      console.log('🔍 Sample data:');
      data.slice(0, 3).forEach(item => {
        console.log(`  - ${item.symbol}: $${item.price} (${item.change >= 0 ? '+' : ''}${item.change}%)`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error connecting to API:', error.message);
    return false;
  }
}

// Test stock endpoint (singular form)
async function testStockEndpoint() {
  console.log(`\n📡 Testing API stock endpoint (singular): ${API_URL}/api/stock`);
  try {
    const response = await fetch(`${API_URL}/api/stock`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`❌ Stock endpoint failed with status: ${response.status}`);
      console.error('Response:', await response.text());
      return false;
    }

    const data = await response.json();
    console.log('✅ Stock endpoint successful!');
    console.log(`📈 Received ${data.length} market data items`);
    
    return true;
  } catch (error) {
    console.error('❌ Error connecting to API:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 TESTING API CONNECTION');
  console.log('========================');
  console.log(`🌐 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY ? '✓ Present' : '❌ Missing'}`);
  
  const healthCheck = await testHealthEndpoint();
  const stocksTest = await testStocksEndpoint();
  const stockTest = await testStockEndpoint();
  
  console.log('\n📋 TEST SUMMARY');
  console.log('========================');
  console.log(`Health Endpoint: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stocks Endpoint: ${stocksTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stock Endpoint: ${stockTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (healthCheck && stocksTest && stockTest) {
    console.log('\n🎉 All tests passed! Your API connection is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
}

runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
}); 