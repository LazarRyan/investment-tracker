import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Constants for market data - these are just for display names
const INDICES = {
  "SPY": "S&P 500 (ETF)",
  "DIA": "Dow Jones (ETF)",
  "QQQ": "NASDAQ-100 (ETF)",
  "VGK": "FTSE Europe (ETF)",
  "EWJ": "Nikkei (ETF)",
  "EWG": "DAX Germany (ETF)",
  // Add popular stocks
  "AAPL": "Apple Inc.",
  "MSFT": "Microsoft Corp.",
  "GOOGL": "Alphabet Inc.",
  "AMZN": "Amazon.com Inc.",
  "META": "Meta Platforms Inc.",
  "TSLA": "Tesla Inc.",
  "NVDA": "NVIDIA Corp.",
  "JPM": "JPMorgan Chase & Co.",
  "V": "Visa Inc."
};

const CRYPTO = {
  "bitcoin": "Bitcoin",
  "ethereum": "Ethereum",
  "tether": "Tether",
  "cardano": "Cardano",
  "dogecoin": "Dogecoin"
};

async function getLatestHistoricalData(symbol: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
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

    if (error) {
      console.error(`Supabase error for ${symbol}:`, error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log(`No historical data found for symbol: ${symbol}`);
      // Return a fallback response indicating no data
      return {
        symbol: symbol.toUpperCase(),
        price: null,
        change: 0,
        is_market_hours: false,
        timestamp: new Date().toISOString(),
        type: 'stock',
        error: 'No historical data available'
      };
    }

    // Determine if it's a crypto symbol or index
    const isCrypto = Object.keys(CRYPTO).includes(symbol.toLowerCase());
    const isIndex = Object.keys(INDICES).includes(symbol.toUpperCase());
    
    console.log(`Found data for ${symbol}:`, data[0]);
    
    return {
      symbol: isCrypto ? CRYPTO[symbol.toLowerCase()] : 
             isIndex ? INDICES[symbol.toUpperCase()] : 
             symbol.toUpperCase(),
      price: data[0].price,
      change: data[0].change_percentage || 0,
      is_market_hours: data[0].is_market_hours,
      timestamp: data[0].timestamp,
      type: isCrypto ? 'crypto' : isIndex ? 'index' : 'stock'
    };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    // Return a fallback response instead of null
    return {
      symbol: symbol.toUpperCase(),
      price: null,
      change: 0,
      is_market_hours: false,
      timestamp: new Date().toISOString(),
      type: 'stock',
      error: error.message || 'Failed to fetch data'
    };
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
      const symbol = entry.symbol;
      const isCrypto = Object.keys(CRYPTO).includes(symbol.toLowerCase());
      const isIndex = Object.keys(INDICES).includes(symbol.toUpperCase());
      
      return {
        symbol: isCrypto ? CRYPTO[symbol.toLowerCase()] : 
               isIndex ? INDICES[symbol.toUpperCase()] : 
               symbol.toUpperCase(),
        price: entry.price,
        change: entry.change_percentage,
        is_market_hours: entry.is_market_hours,
        timestamp: entry.timestamp,
        type: isCrypto ? 'crypto' : isIndex ? 'index' : 'stock'
      };
    });
  } catch (error) {
    console.error('Error fetching multiple historical data:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    console.log('Market data API called');
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    // Define cache-control headers to prevent caching
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    };
    
    // If a specific symbol is requested
    if (symbol) {
      console.log(`Fetching data for symbol: ${symbol}`);
      const historicalData = await getLatestHistoricalData(symbol);
      if (historicalData) {
        console.log(`Found historical data for ${symbol}:`, historicalData);
        return new Response(JSON.stringify(historicalData), { headers });
      }

      console.log(`No data available for ${symbol}`);
      return new Response(JSON.stringify({ error: 'No data available' }), {
        status: 404,
        headers
      });
    }

    // For the market overview (no specific symbol)
    // Get all symbols (both indices and crypto)
    const allSymbols = [...Object.keys(INDICES), ...Object.keys(CRYPTO)];
    console.log('Fetching market overview data for symbols:', allSymbols);
    const historicalData = await getMultipleHistoricalData(allSymbols);
    
    if (historicalData.length > 0) {
      console.log(`Found historical data for ${historicalData.length} symbols`);
      return new Response(JSON.stringify(historicalData), { headers });
    }

    // No data in DB yet — return empty array so the UI shows a graceful empty state
    // instead of an error banner. Seed data by calling POST /api/refresh on the market-service.
    console.log('No market data available');
    return new Response(JSON.stringify([]), { headers });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  }
} 