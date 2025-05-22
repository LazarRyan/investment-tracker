/**
 * Test script to verify Supabase connection and check historical data
 * Run with: node test-supabase-connection.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  console.log('Please make sure you have set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('\n📡 Testing Supabase connection');
  try {
    // A simple query to check if we can connect - just get a few rows
    const { data, error } = await supabase
      .from('historical_prices')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error.message);
    return false;
  }
}

// Check historical data
async function checkHistoricalData() {
  console.log('\n📊 Checking historical price data');
  try {
    // Get recent entries
    const { data: recentData, error: recentError } = await supabase
      .from('historical_prices')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
      
    if (recentError) {
      console.error('❌ Failed to fetch recent historical prices:', recentError.message);
      return false;
    }
    
    if (recentData.length === 0) {
      console.log('⚠️ No historical price data found in the database');
      return false;
    }
    
    console.log(`✅ Found ${recentData.length} historical price records`);
    console.log('🔍 Most recent entries:');
    recentData.forEach(record => {
      console.log(`  - ${record.symbol}: $${record.price} (${new Date(record.timestamp).toLocaleString()})`);
    });
    
    // Check for recent data (within last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const hasRecentData = recentData.some(record => new Date(record.timestamp) > oneDayAgo);
    
    if (hasRecentData) {
      console.log('✅ Database contains recent data (within last 24 hours)');
    } else {
      console.log('⚠️ No recent data found (within last 24 hours)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking historical data:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 TESTING SUPABASE CONNECTION');
  console.log('=============================');
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Supabase Key: ${SUPABASE_KEY ? '✓ Present' : '❌ Missing'}`);
  
  const connectionTest = await testSupabaseConnection();
  let dataTest = false;
  
  if (connectionTest) {
    dataTest = await checkHistoricalData();
  }
  
  console.log('\n📋 TEST SUMMARY');
  console.log('========================');
  console.log(`Supabase Connection: ${connectionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Historical Data: ${dataTest ? '✅ PASS' : '⚠️ ISSUE'}`);
  
  if (connectionTest && dataTest) {
    console.log('\n🎉 All tests passed! Your Supabase connection is working correctly.');
  } else {
    console.log('\n⚠️ Issues detected. Please review the results above.');
  }
}

runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
}); 