import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Cache file paths - stored in the app's temporary directory
const CACHE_DIR = path.join(process.cwd(), '.cache');
const SYMBOL_CACHE_FILE = path.join(CACHE_DIR, 'market-data-symbol-cache.json');
const TICKER_CACHE_FILE = path.join(CACHE_DIR, 'market-data-ticker-cache.json');

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating cache directory:', error);
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

/**
 * Fetch market data from our Python FastAPI service
 * This connects to the analysis-service/api Python API service which uses both FMP and CoinGecko
 */
export async function GET(request: Request) {
  try {
    console.log('Market data API called');
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    // Get the API service URL and API key from environment variables
    const apiServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:8000';
    const apiKey = process.env.ANALYSIS_SERVICE_API_KEY;
    
    // Log environment variables (not their values for security) for debugging
    console.log('Environment variables available:');
    console.log('ANALYSIS_SERVICE_URL exists:', !!process.env.ANALYSIS_SERVICE_URL);
    console.log('ANALYSIS_SERVICE_API_KEY exists:', !!process.env.ANALYSIS_SERVICE_API_KEY);

    // Check if we have required environment variables
    if (!apiKey) {
      console.error('Missing ANALYSIS_SERVICE_API_KEY environment variable');
      throw new Error('Server configuration error');
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

        // Check if the request was successful
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Could not read error response');
          console.error(`API error (${response.status}):`, errorText);
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
        
        return NextResponse.json({ error: `No data available for symbol: ${symbol}` }, { status: 404 });
      }
    }
    
    // For the ticker (no specific symbol)
    try {
      console.log(`Fetching all market data from Python API service`);
      
      // Call the Python API service
      const endpoint = `/api/stocks`;
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

      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch market data: ${response.status} ${errorText}`);
      }

      // Parse the response data
      const data = await response.json();
      console.log(`Successfully fetched ticker data from Python API service`);
      
      // Cache the successful response
      writeCache(TICKER_CACHE_FILE, data);
      
      return NextResponse.json(data);
    }
    catch (error) {
      console.error(`Error fetching ticker data:`, error);
      
      // Try to use cached ticker data
      const cachedData = readCache(TICKER_CACHE_FILE);
      if (cachedData) {
        console.log('Using cached ticker data');
        return NextResponse.json(cachedData);
      }
      
      // If no cached data is available, return an empty array with error message
      console.error('No cached data available, returning empty dataset');
      return NextResponse.json([], { status: 503 });
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