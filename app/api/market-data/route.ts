import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Cache file paths - stored in the app's temporary directory
// On Vercel, we can only write to /tmp
const CACHE_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp/investment-tracker-cache' 
  : path.join(process.cwd(), '.cache');
const SYMBOL_CACHE_FILE = path.join(CACHE_DIR, 'market-data-symbol-cache.json');
const TICKER_CACHE_FILE = path.join(CACHE_DIR, 'market-data-ticker-cache.json');

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Created cache directory at: ${CACHE_DIR}`);
  }
} catch (error) {
  console.error('Error creating cache directory:', error);
  // Don't fail the entire request if we can't create the cache directory
}

// Function to read cache from file
function readCache(cacheFile: string) {
  try {
    if (fs.existsSync(cacheFile)) {
      const cacheData = fs.readFileSync(cacheFile, 'utf8');
      const cache = JSON.parse(cacheData);
      // Check if cache is still valid (less than 24 hours old)
      if (cache.timestamp && (Date.now() - cache.timestamp < 24 * 60 * 60 * 1000)) {
        console.log(`Using cached data from ${cacheFile}`);
        return cache.data;
      }
    }
  } catch (error) {
    console.error(`Error reading cache from ${cacheFile}:`, error);
  }
  return null;
}

// Function to write cache to file
function writeCache(cacheFile: string, data: any) {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf8');
    console.log(`Cache written to ${cacheFile}`);
  } catch (error) {
    console.error(`Error writing cache to ${cacheFile}:`, error);
  }
}

// Inside the GET function, add this function for checking API health
async function checkApiHealth(serviceUrl: string, apiKey: string) {
  try {
    console.log('Checking API health...');
    const response = await fetch(`${serviceUrl}/api/health`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      signal: AbortSignal.timeout(3000) // Short timeout for health check
    });

    if (!response.ok) {
      console.error(`API health check failed: ${response.status}`);
      return false;
    }

    const healthData = await response.json();
    console.log('API health status:', healthData.status);
    
    // Log detailed health information for debugging
    if (healthData.services) {
      console.log('FMP status:', healthData.services.fmp?.status);
      console.log('CoinGecko status:', healthData.services.coingecko?.status);
    }
    
    return healthData.status === 'healthy';
  } catch (error) {
    console.error('API health check error:', error);
    return false;
  }
}

/**
 * Fetch market data from our Python FastAPI service
 * This connects to the analysis-service/api Python API service which uses both FMP and CoinGecko
 */
export async function GET(request: Request) {
  try {
    console.log('Market data API called');
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    // Use the dedicated Market Data API URL if available, otherwise fall back to the general API URL
    const apiServiceUrl = process.env.MARKET_DATA_URL || process.env.ANALYSIS_SERVICE_URL || 'http://localhost:8000';
    const apiKey = process.env.ANALYSIS_SERVICE_API_KEY;
    
    // CRITICAL - Log the exact URL we're trying to connect to
    console.log('🔴 DEBUGGING - Attempting to connect to Market Data API at:', apiServiceUrl);
    console.log('Environment: ' + process.env.NODE_ENV);
    console.log('API_KEY exists:', !!apiKey);

    // Check if we have required environment variables
    if (!apiKey) {
      console.error('Missing ANALYSIS_SERVICE_API_KEY environment variable');
      throw new Error('Server configuration error: Missing API key');
    }

    // Critical environment validation
    if (process.env.NODE_ENV === 'production') {
      if (apiServiceUrl === 'http://localhost:8000') {
        console.error('🔴 CRITICAL ERROR: Using localhost URL in production environment!');
        console.error('Set ANALYSIS_SERVICE_URL in your Vercel environment variables to the production API URL');
        throw new Error('Server misconfiguration: Using localhost in production');
      }
      // Validate URL format
      try {
        new URL(apiServiceUrl);
      } catch (e) {
        console.error('🔴 CRITICAL ERROR: ANALYSIS_SERVICE_URL is not a valid URL:', apiServiceUrl);
        throw new Error('Server misconfiguration: Invalid API URL format');
      }
    }

    // Add this code at the beginning of the GET function
    const isApiHealthy = await checkApiHealth(apiServiceUrl, apiKey);
    if (!isApiHealthy) {
      console.warn('API health check failed, proceeding with caution...');
      // We'll still try to make the request, but we've warned about potential issues
    }

    // For symbol-specific requests
    if (symbol) {
      try {
        console.log(`Fetching market data for symbol: ${symbol}`);
        
        // Call the Python API service
        const endpoint = `/api/stocks?symbol=${symbol}`;
        const fullUrl = `${apiServiceUrl}${endpoint}`;
        console.log('Calling Python API service:', fullUrl);

        // Make the API request with the API key
        const response = await fetch(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          // Add a short timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000)
        });

        // Log detailed response information for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        // Check if the request was successful
        if (!response.ok) {
          // Try to read the error response as text
          let errorText;
          try {
            errorText = await response.text();
          } catch (textError) {
            errorText = 'Could not read error response';
          }

          // Log detailed error information
          console.error(`API error (${response.status}):`, errorText);
          
          // For 404 errors, log specific debugging info
          if (response.status === 404) {
            console.error(`The endpoint ${endpoint} was not found on the API service.`);
            console.error(`Please verify the API service is running and the endpoint exists.`);
            console.error(`Full URL attempted: ${fullUrl}`);
          }
          
          throw new Error(`Failed to fetch market data: ${response.status} ${errorText}`);
        }

        // Parse the response data
        const data = await response.json();
        console.log(`Successfully fetched data for ${symbol}:`, data);
        
        // Cache the successful response
        const cachedData = { [symbol]: data };
        writeCache(SYMBOL_CACHE_FILE, cachedData);
        
        return NextResponse.json(data);
      }
      catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        
        // Try to use cached data for this symbol
        const cachedData = readCache(SYMBOL_CACHE_FILE);
        if (cachedData && cachedData[symbol]) {
          console.log(`Using cached data for symbol: ${symbol}`);
          return NextResponse.json(cachedData[symbol]);
        }
        
        return NextResponse.json({ 
          error: `No data available for symbol: ${symbol}`,
          message: error instanceof Error ? error.message : 'Unknown error',
          cached: false
        }, { status: 404 });
      }
    }
    
    // For the ticker (no specific symbol)
    try {
      console.log(`Fetching all market data from Python API service`);
      
      // Instead of hardcoding one endpoint, let's try both
      const endpoints = ['/api/stock', '/api/stocks'];
      let response = null;
      let successEndpoint = null;
      let lastError = null;

      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        const fullUrl = `${apiServiceUrl}${endpoint}`;
        console.log(`🔴 DEBUGGING - Trying API URL: ${fullUrl}`);

        try {
          // Make the API request with the API key
          response = await fetch(fullUrl, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            signal: AbortSignal.timeout(8000) // Increased timeout for production
          });
          
          console.log(`Endpoint ${endpoint} response status:`, response.status);
          
          if (response.ok) {
            console.log(`✅ Endpoint ${endpoint} successful!`);
            successEndpoint = endpoint;
            break; // We found a working endpoint
          } else {
            console.error(`❌ Endpoint ${endpoint} failed with status:`, response.status);
            lastError = new Error(`Failed with status ${response.status}`);
          }
        } catch (fetchError) {
          console.error(`❌ Fetch error for ${endpoint}:`, fetchError.message);
          lastError = fetchError;
        }
      }

      // If none of the endpoints worked
      if (!response || !successEndpoint) {
        console.error('All endpoints failed. Last error:', lastError);
        
        // Try to use cached data
        const cachedData = readCache(TICKER_CACHE_FILE);
        if (cachedData) {
          console.log('Using cached ticker data');
          return NextResponse.json(cachedData, {
            headers: {
              'X-Data-Source': 'cached',
              'Cache-Control': 'max-age=3600'
            }
          });
        }
        
        // Provide a static fallback response when API is unavailable and no cache exists
        console.warn('No cached data available, returning fallback dataset');
        const fallbackData = [
          { symbol: 'AAPL', name: 'Apple Inc.', price: 178.61, change: 0.5 },
          { symbol: 'MSFT', name: 'Microsoft Corporation', price: 413.64, change: 0.7 },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 174.42, change: -0.3 },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.75, change: 1.2 },
          { symbol: 'TSLA', name: 'Tesla, Inc.', price: 182.12, change: -1.5 },
          { symbol: 'META', name: 'Meta Platforms, Inc.', price: 472.56, change: 0.9 },
          { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 924.79, change: 2.1 },
          { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', price: 410.23, change: 0.1 }
        ];
        
        return NextResponse.json(fallbackData, {
          headers: {
            'X-Data-Source': 'fallback',
            'Cache-Control': 'max-age=300'
          },
          status: 200 // Return 200 instead of 503 to prevent client-side errors
        });
      }

      // If we made it here, we have a successful response from one of the endpoints
      // Parse the response data
      const data = await response.json();
      console.log(`Successfully fetched ticker data from Python API service using ${successEndpoint}`);
      
      // Cache the successful response and the endpoint that worked
      writeCache(TICKER_CACHE_FILE, data);
      
      // Also cache which endpoint worked for future use
      try {
        fs.writeFileSync(path.join(CACHE_DIR, 'working-endpoint.txt'), successEndpoint);
      } catch (e) {
        console.error('Failed to cache working endpoint:', e);
      }
      
      return NextResponse.json(data);
    }
    catch (error) {
      console.error(`Error fetching ticker data:`, error);
      
      // Log exactly what type of error we got
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🔴 Network fetch error - this could be a CORS issue or the API service is unreachable');
      }
      
      // Try to check the root endpoint of the API for basic connectivity
      try {
        console.log('Attempting to check API root as a last resort...');
        const rootResponse = await fetch(`${apiServiceUrl}/`, {
          method: 'GET',
          headers: { 'x-api-key': apiKey },
          signal: AbortSignal.timeout(5000),
          mode: 'no-cors' // Try with no-cors as a last resort
        });
        console.log('Root endpoint connection attempt result:', rootResponse.status);
      } catch (rootError) {
        console.error('Root endpoint completely unreachable:', rootError.message);
        console.error('This indicates the API service is down or unreachable from Vercel');
      }
      
      // Try to use cached ticker data
      const cachedData = readCache(TICKER_CACHE_FILE);
      if (cachedData) {
        console.log('Using cached ticker data');
        return NextResponse.json(cachedData);
      }
      
      // No cached data available, make sure we log this clearly
      console.error('🔴 CRITICAL: No cached data available and API call failed');
      console.error('Cache file path:', TICKER_CACHE_FILE);
      
      // Check if cache directory exists
      try {
        const cacheExists = fs.existsSync(CACHE_DIR);
        console.error('Cache directory exists:', cacheExists);
        if (cacheExists) {
          const files = fs.readdirSync(CACHE_DIR);
          console.error('Files in cache directory:', files);
        }
      } catch (fsError) {
        console.error('Error checking cache directory:', fsError);
      }
      
      // Return an error response that's more helpful
      return NextResponse.json({ 
        error: 'API service unavailable', 
        message: 'The market data service is currently unavailable. Please try again later.',
        apiUrlAttempted: apiServiceUrl,
        endpoint: '/api/stocks',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 503 });
    }
  } 
  catch (error) {
    console.error('Error in market data API:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Try to use cached ticker data as last resort
    const cachedData = readCache(TICKER_CACHE_FILE);
    if (cachedData) {
      console.log('Using cached ticker data due to general error');
      return NextResponse.json(cachedData);
    }
    
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
} 