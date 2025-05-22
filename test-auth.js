/**
 * Test script to verify authentication environment variables
 * Run with: node test-auth.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Check environment variables
console.log('=== Environment Variables Check ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

// Test Supabase client initialization
console.log('\n=== Supabase Client Initialization Test ===');
try {
  // Test with SUPABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Client initialization with SUPABASE_URL: ✅ Success');
    
    // Test anonymous authentication
    testAnonymousAuth(supabase);
  } else {
    console.log('Client initialization with SUPABASE_URL: ❌ Failed (missing variables)');
  }
  
  // Test with NEXT_PUBLIC_SUPABASE_URL
  const nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (nextPublicSupabaseUrl && supabaseAnonKey) {
    const supabase = createClient(nextPublicSupabaseUrl, supabaseAnonKey);
    console.log('Client initialization with NEXT_PUBLIC_SUPABASE_URL: ✅ Success');
  } else {
    console.log('Client initialization with NEXT_PUBLIC_SUPABASE_URL: ❌ Failed (missing variables)');
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error.message);
}

// Test anonymous authentication
async function testAnonymousAuth(supabase) {
  try {
    console.log('\n=== Anonymous Authentication Test ===');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
    } else {
      console.log('Session check:', data.session ? '✅ Session exists' : '⚠️ No session (expected for anonymous)');
    }
    
    // Test guest session creation
    console.log('\n=== Guest Session Test ===');
    const guestId = uuidv4(); // Generate a proper UUID
    console.log('Generated guest ID:', guestId);
    
    const { data: guestData, error: guestError } = await supabase
      .from('guest_sessions')
      .insert({
        guest_id: guestId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select();
    
    if (guestError) {
      console.error('Error creating guest session:', guestError.message);
    } else {
      console.log('Guest session creation: ✅ Success');
      console.log('Guest session data:', guestData);
    }
  } catch (error) {
    console.error('Error in authentication test:', error.message);
  }
} 