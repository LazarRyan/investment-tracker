'use client';

import { useEffect, useState } from 'react';
import { Investment } from '../api/investments/route';

interface MarketData {
  price: number;
  change: number;
}

interface InvestmentWithMarketData extends Investment {
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercentage?: number;
  sector?: string;
}

interface InvestmentPortfolioProps {
  onAddClick: () => void;
}

export default function InvestmentPortfolio({ onAddClick }: InvestmentPortfolioProps) {
  const [investments, setInvestments] = useState<InvestmentWithMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestments = async () => {
    try {
      const response = await fetch('/api/investments');
      if (!response.ok) {
        throw new Error('Failed to fetch investments');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching investments:', err);
      setError('Failed to load investments');
      return [];
    }
  };

  const fetchMarketData = async (symbol: string): Promise<MarketData | null> => {
    try {
      console.log(`Fetching market data for ${symbol}...`);
      const response = await fetch(`http://localhost:8000/api/stocks?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      const data = await response.json();
      console.log(`Received market data for ${symbol}:`, data);
      return data;
    } catch (err) {
      console.error(`Error fetching market data for ${symbol}:`, err);
      return null;
    }
  };

  const updateInvestmentsWithMarketData = async (investments: Investment[]) => {
    console.log('Updating investments with market data...');
    const updatedInvestments = await Promise.all(
      investments.map(async (investment) => {
        const marketData = await fetchMarketData(investment.symbol);
        if (marketData) {
          const currentPrice = marketData.price;
          const totalValue = currentPrice * investment.shares;
          const purchaseValue = investment.purchase_price * investment.shares;
          const gainLoss = totalValue - purchaseValue;
          const gainLossPercentage = (gainLoss / purchaseValue) * 100;

          console.log(`Updated values for ${investment.symbol}:`, {
            currentPrice,
            totalValue,
            gainLoss,
            gainLossPercentage
          });

          return {
            ...investment,
            currentPrice,
            totalValue,
            gainLoss,
            gainLossPercentage,
          };
        }
        return investment;
      })
    );

    console.log('Setting updated investments:', updatedInvestments);
    setInvestments(updatedInvestments);
  };

  const loadInvestments = async () => {
    console.log('Loading investments...');
    setLoading(true);
    const data = await fetchInvestments();
    console.log('Fetched investments:', data);
    await updateInvestmentsWithMarketData(data);
    setLoading(false);
  };

  useEffect(() => {
    // Initial load
    console.log('Initial load...');
    loadInvestments();

    // Refresh market data every 30 seconds
    const intervalId = setInterval(async () => {
      console.log('Running 30-second update interval...');
      const data = await fetchInvestments();
      await updateInvestmentsWithMarketData(data);
    }, 30000);

    return () => {
      console.log('Cleaning up interval...');
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array since we're using the interval for updates

  const handleDelete = async (investment: InvestmentWithMarketData) => {
    try {
      // Create a sell transaction
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investment_id: investment.id,
          symbol: investment.symbol,
          type: 'SELL',
          shares: investment.shares,
          price: investment.currentPrice || investment.purchase_price,
          total: (investment.currentPrice || investment.purchase_price) * investment.shares,
          date: new Date().toISOString(),
          notes: 'Full position sale'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Transaction error:', error);
        throw new Error('Failed to create sell transaction');
      }

      // Wait for the transaction to be created
      await response.json();

      // Delete the investment
      const deleteResponse = await fetch(`/api/investments?id=${investment.id}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        console.error('Delete error:', error);
        throw new Error('Failed to delete investment');
      }

      await loadInvestments();
    } catch (err) {
      console.error('Error selling investment:', err);
      setError('Failed to sell investment');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6495ED]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const totalPortfolioValue = investments.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
  const totalGainLoss = investments.reduce((sum, inv) => sum + (inv.gainLoss || 0), 0);
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.shares), 0);
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Portfolio Value</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${totalPortfolioValue.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="h-6 w-6 text-[#6495ED]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.171-.879-1.171-2.303 0-3.182C10.582 7.759 11.35 7.54 12 7.54c.725 0 1.45.22 2.003.659" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Day Change:</span>
              <span className={`ml-2 text-sm font-medium ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(totalGainLoss).toFixed(2)} ({totalGainLossPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Gain/Loss</h3>
              <p className={`mt-2 text-3xl font-semibold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalGainLoss.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Return:</span>
              <span className={`ml-2 text-sm font-medium ${totalGainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalGainLossPercentage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Invested</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${totalInvested.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Positions:</span>
              <span className="ml-2 text-sm font-medium text-gray-900">{investments.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Portfolio Diversity</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {investments.length} Stocks
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Sectors:</span>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {new Set(investments.map(inv => inv.sector)).size}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Investments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {investments.map((investment) => (
                <tr key={investment.id} 
                    className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-900">{investment.symbol.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{investment.symbol}</div>
                        <div className="text-sm text-gray-500">{investment.name || 'Stock'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{investment.shares}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${investment.purchase_price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${investment.currentPrice?.toFixed(2) || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${investment.totalValue?.toFixed(2) || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${investment.gainLoss && investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${investment.gainLoss?.toFixed(2) || '-'}
                      {investment.gainLossPercentage && (
                        <span className="block text-xs">
                          ({investment.gainLossPercentage.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(investment.purchase_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(investment);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 