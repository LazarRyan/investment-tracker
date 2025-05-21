import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// This is a fallback if the API call fails
const mockStockData = {
  AAPL: { 
    symbol: 'AAPL', 
    price: 191.28, 
    change: 1.57, 
    changePercent: 0.83,
    name: 'Apple Inc.'
  },
  MSFT: { 
    symbol: 'MSFT', 
    price: 427.65, 
    change: 3.18, 
    changePercent: 0.75,
    name: 'Microsoft Corporation'
  },
  GOOGL: { 
    symbol: 'GOOGL', 
    price: 175.98, 
    change: 0.83, 
    changePercent: 0.47,
    name: 'Alphabet Inc.'
  },
  TSLA: {
    symbol: 'TSLA',
    price: 175.34,
    change: -2.18,
    changePercent: -1.23,
    name: 'Tesla, Inc.'
  },
  AMZN: {
    symbol: 'AMZN',
    price: 178.75,
    change: 1.25,
    changePercent: 0.70,
    name: 'Amazon.com, Inc.'
  }
};

// Fallback ticker data for the stock ticker component
const tickerData = [
  { symbol: 'S&P 500', price: 5218.75, change: 0.83, type: 'index' },
  { symbol: 'NASDAQ', price: 16379.92, change: 0.75, type: 'index' },
  { symbol: 'DOW', price: 39118.28, change: 0.47, type: 'index' },
  { symbol: 'Bitcoin', price: 70356.12, change: 2.34, type: 'crypto' },
  { symbol: 'Ethereum', price: 3450.78, change: 1.56, type: 'crypto' }
];

/**
 * Fetch market data from our Python FastAPI service
 * This connects to the analysis-service/api Python API service
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
        return NextResponse.json(data);
      }
      catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        
        // Fall back to mock data if available
        const upperSymbol = symbol.toUpperCase();
        if (mockStockData[upperSymbol]) {
          console.log(`Falling back to mock data for: ${upperSymbol}`);
          return NextResponse.json({
            price: mockStockData[upperSymbol].price,
            change: mockStockData[upperSymbol].changePercent
          });
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
      return NextResponse.json(data);
    }
    catch (error) {
      console.error(`Error fetching ticker data:`, error);
      
      // Fall back to mock ticker data
      console.log('Falling back to mock ticker data');
      return NextResponse.json(tickerData);
    }
  } 
  catch (error) {
    console.error('Error in market data API:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
} 