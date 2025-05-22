import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  try {
    console.log('Market data API called');
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

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