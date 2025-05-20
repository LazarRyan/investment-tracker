'use client';

import { useEffect, useState } from 'react';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  type: 'index' | 'crypto';
}

export default function StockTicker() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/stocks');
        if (!response.ok) throw new Error('Failed to fetch market data');
        const data = await response.json();
        setMarketData(data);
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    // Initial fetch
    fetchMarketData();
    
    // Update every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (data: MarketData) => {
    if (data.type === 'crypto') {
      if (data.price < 1) return `$${data.price.toFixed(4)}`;
      if (data.price < 100) return `$${data.price.toFixed(2)}`;
      return `$${Math.round(data.price).toLocaleString()}`;
    }
    return data.price.toLocaleString();
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black text-white py-3 overflow-hidden border-b border-gray-800">
      <div className="animate-ticker inline-flex whitespace-nowrap transform-gpu will-change-transform">
        {[...marketData, ...marketData].map((data, index) => (
          <div key={index} className="mx-8 inline-flex items-center">
            {data.type === 'crypto' && (
              <span className="mr-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                CRYPTO
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
    </div>
  );
} 