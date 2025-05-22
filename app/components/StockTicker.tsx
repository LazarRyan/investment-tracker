'use client';

import { useEffect, useState } from 'react';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  type: 'index' | 'crypto';
  is_market_hours?: boolean;
}

export default function StockTicker() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMarketHours, setIsMarketHours] = useState<boolean>(false);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('StockTicker: Fetching market data from the API service...');
        const response = await fetch('/api/market-data');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch market data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('StockTicker: Received market data:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          setMarketData(data);
          setLastUpdated(new Date());
          // Check if any of the stock data is from market hours
          setIsMarketHours(data.some((item: MarketData & { is_market_hours?: boolean }) => 
            item.type === 'index' && item.is_market_hours
          ));
          setError(null);
        } else {
          console.warn('StockTicker: Received empty market data');
          setError('No market data available');
        }
      } catch (error) {
        console.error('StockTicker: Error fetching market data:', error);
        setError('Failed to load market data');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchMarketData();
    
    // Update every 5 minutes since we're using historical data
    const interval = setInterval(fetchMarketData, 300000);
    return () => clearInterval(interval);
  }, []); // Remove isMarketHours dependency since we're using historical data

  const formatPrice = (data: MarketData) => {
    if (data.type === 'crypto') {
      if (data.price < 1) return `$${data.price.toFixed(4)}`;
      if (data.price < 100) return `$${data.price.toFixed(2)}`;
      return `$${Math.round(data.price).toLocaleString()}`;
    }
    return `$${data.price.toLocaleString()}`;
  };

  // If no data is available yet, show loading state
  if (isLoading && marketData.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-black text-white py-3 overflow-hidden border-b border-gray-800">
        <div className="flex justify-center items-center">
          <div className="animate-pulse text-gray-400">Loading market data...</div>
        </div>
      </div>
    );
  }

  // If there's an error and no data, show error state
  if (error && marketData.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-black text-white py-3 overflow-hidden border-b border-gray-800">
        <div className="flex justify-center items-center">
          <div className="text-red-400">
            <span>{error}</span>
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-500">
                Last updated: {lastUpdated.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If we have no data at all, don't show the ticker
  if (marketData.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-black text-white py-3 overflow-hidden border-b border-gray-800">
        <div className="flex justify-center items-center">
          <div className="text-gray-400">Market data unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black text-white py-3 overflow-hidden border-b border-gray-800">
      <div className="animate-ticker inline-flex whitespace-nowrap transform-gpu will-change-transform">
        {/* Duplicate the data for continuous scrolling effect */}
        {[...marketData, ...marketData].map((data, index) => (
          <div key={index} className="mx-8 inline-flex items-center">
            {data.type === 'crypto' && (
              <span className="mr-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                CRYPTO
              </span>
            )}
            {data.type === 'index' && !data.is_market_hours && (
              <span className="mr-2 text-xs bg-gray-500 text-white px-1.5 py-0.5 rounded">
                DELAYED
              </span>
            )}
            <span className={`font-semibold ${data.type === 'crypto' ? 'text-yellow-400' : 'text-blue-400'}`}>
              {data.symbol}
            </span>
            <span className="ml-2">{formatPrice(data)}</span>
            <span className={`ml-2 ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {lastUpdated && (
        <div className="text-right pr-4">
          <span className="text-xs text-gray-500">
            {isMarketHours ? 'Live' : 'Delayed'} data as of {lastUpdated.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
} 