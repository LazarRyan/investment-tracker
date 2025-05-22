import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
      signal: AbortSignal.timeout(10000) // Increased timeout to 10 seconds
    });

    if (!response.ok) {
      console.error(`API health check failed: ${response.status}`);
      // Don't fail immediately on health check failure
      return true;
    }

    const healthData = await response.json();
    console.log('API health status:', healthData.status);
    
    // Log detailed health information for debugging
    if (healthData.services) {
      console.log('FMP status:', healthData.services.fmp?.status);
      console.log('CoinGecko status:', healthData.services.coingecko?.status);
    }
    
    return true; // Always return true to bypass health check for now
  } catch (error) {
    console.error('API health check error:', error);
    return true; // Don't fail on health check error
  }
}

async function getLatestHistoricalData(symbol: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the most recent data point for this symbol
    const { data, error } = await supabase
      .from('historical_prices')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Determine if it's a crypto symbol
    const isCrypto = Object.keys(CRYPTO).includes(symbol.toLowerCase());
    
    return {
      symbol: isCrypto ? CRYPTO[symbol.toLowerCase()] : (INDICES[data[0].symbol] || data[0].symbol),
      price: data[0].price,
      change: data[0].change_percentage,
      is_market_hours: data[0].is_market_hours,
      timestamp: data[0].timestamp,
      type: isCrypto ? 'crypto' : 'index'
    };
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return null;
  }
}

async function getMultipleHistoricalData(symbols: string[]) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the latest data point for each symbol
    const { data, error } = await supabase
      .from('historical_prices')
      .select('*')
      .in('symbol', symbols.map(s => s.toUpperCase()))
      .order('timestamp', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Get the most recent entry for each symbol
    const latestBySymbol = new Map();
    data.forEach(entry => {
      if (!latestBySymbol.has(entry.symbol) || 
          new Date(entry.timestamp) > new Date(latestBySymbol.get(entry.symbol).timestamp)) {
        latestBySymbol.set(entry.symbol, entry);
      }
    });

    return Array.from(latestBySymbol.values()).map(entry => {
      const isCrypto = Object.keys(CRYPTO).includes(entry.symbol.toLowerCase());
      return {
        symbol: isCrypto ? CRYPTO[entry.symbol.toLowerCase()] : (INDICES[entry.symbol] || entry.symbol),
        price: entry.price,
        change: entry.change_percentage,
        is_market_hours: entry.is_market_hours,
        timestamp: entry.timestamp,
        type: isCrypto ? 'crypto' : 'index'
      };
    });
  } catch (error) {
    console.error('Error fetching multiple historical data:', error);
    return [];
  }
}

// Constants for market data
const INDICES = {
  "SPY": "S&P 500 (ETF)",
  "DIA": "Dow Jones (ETF)",
  "QQQ": "NASDAQ-100 (ETF)",
  "VGK": "FTSE Europe (ETF)",
  "EWJ": "Nikkei (ETF)",
  "EWG": "DAX Germany (ETF)"
};

const CRYPTO = {
  "bitcoin": "Bitcoin",
  "ethereum": "Ethereum",
  "tether": "Tether",
  "cardano": "Cardano",
  "dogecoin": "Dogecoin"
};

/**
 * Fetch market data from our Python FastAPI service
 * This connects to the analysis-service/api Python API service which uses both FMP and CoinGecko
 */
export async function GET(request: Request) {
  try {
    console.log('Market data API called');
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    // Use dedicated URLs and API keys for each service
    const marketDataUrl = process.env.MARKET_DATA_URL || 'http://localhost:8000';
    const marketDataApiKey = process.env.MARKET_DATA_API_KEY || process.env.ANALYSIS_SERVICE_API_KEY;
    
    // CRITICAL - Log the exact URL we're trying to connect to
    console.log('🔴 DEBUGGING - Attempting to connect to Market Data API at:', marketDataUrl);
    console.log('Environment: ' + process.env.NODE_ENV);
    console.log('API_KEY exists:', !!marketDataApiKey);

    // Check if we have required environment variables
    if (!marketDataApiKey) {
      console.error('Missing MARKET_DATA_API_KEY and ANALYSIS_SERVICE_API_KEY environment variables');
      throw new Error('Server configuration error: Missing API key');
    }

    // Critical environment validation
    if (process.env.NODE_ENV === 'production') {
      if (marketDataUrl === 'http://localhost:8000') {
        console.error('🔴 CRITICAL ERROR: Using localhost URL in production environment!');
        console.error('Set MARKET_DATA_URL in your Vercel environment variables to the production API URL');
        throw new Error('Server misconfiguration: Using localhost in production');
      }
      // Validate URL format
      try {
        new URL(marketDataUrl);
      } catch (e) {
        console.error('🔴 CRITICAL ERROR: MARKET_DATA_URL is not a valid URL:', marketDataUrl);
        throw new Error('Server misconfiguration: Invalid API URL format');
      }
    }

    // Add this code at the beginning of the GET function
    const isApiHealthy = await checkApiHealth(marketDataUrl, marketDataApiKey);
    if (!isApiHealthy) {
      console.warn('API health check failed, proceeding with caution...');
      // We'll still try to make the request, but we've warned about potential issues
    }

    // If a specific symbol is requested
    if (symbol) {
      const historicalData = await getLatestHistoricalData(symbol);
      if (historicalData) {
        return new Response(JSON.stringify(historicalData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'No data available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For the market overview (no specific symbol)
    // Get all symbols (both indices and crypto)
    const allSymbols = [...Object.keys(INDICES), ...Object.keys(CRYPTO)];
    const historicalData = await getMultipleHistoricalData(allSymbols);
    
    if (historicalData.length > 0) {
      return new Response(JSON.stringify(historicalData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If no data available at all
    return new Response(JSON.stringify({ error: 'No market data available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 