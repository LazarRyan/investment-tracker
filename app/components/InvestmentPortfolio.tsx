'use client';

import { useEffect, useState } from 'react';
import { Investment } from '../api/investments/route';
import SellInvestmentForm from './SellInvestmentForm';
import { internalFetch } from '../../utils/api';

interface MarketData {
  price: number;
  change: number;
  is_market_hours?: boolean;
}

interface InvestmentWithMarketData extends Investment {
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercentage?: number;
  sector?: string;
  isMarketHours?: boolean;
}

interface InvestmentPortfolioProps {
  onAddClick: () => void;
}

export default function InvestmentPortfolio({ onAddClick }: InvestmentPortfolioProps) {
  const [investments, setInvestments] = useState<InvestmentWithMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellInvestment, setSellInvestment] = useState<InvestmentWithMarketData | null>(null);
  const [isMarketHours, setIsMarketHours] = useState<boolean>(false);

  const fetchInvestments = async () => {
    try {
      const response = await internalFetch('/api/investments');
      if (response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching investments:', error);
      return [];
    }
  };

  const fetchMarketData = async (symbol: string): Promise<MarketData | null> => {
    try {
      console.log(`Fetching market data for ${symbol}...`);
      // First try to get current market data
      const response = await internalFetch(`/api/market-data?symbol=${symbol}`);
      
      // If no current data available, fall back to historical data
      if (!response.ok || response.status === 404) {
        console.log(`No current data available for ${symbol}, fetching historical data...`);
        const historicalResponse = await internalFetch(`/api/historical/${symbol}?limit=1`);
        
        if (!historicalResponse.ok) {
          console.log(`No historical data available for ${symbol}`);
          return null;
        }
        
        const historicalData = await historicalResponse.json();
        if (Array.isArray(historicalData) && historicalData.length > 0) {
          const latestData = historicalData[0];
          console.log(`Received historical data for ${symbol}:`, latestData);
          
          return {
            price: latestData.price,
            change: latestData.change_percentage || 0,
            is_market_hours: latestData.is_market_hours
          };
        }
        return null;
      }
      
      const data = await response.json();
      console.log(`Received market data for ${symbol}:`, data);
      
      // Update market hours state based on the data
      if (data.is_market_hours !== undefined) {
        setIsMarketHours(data.is_market_hours);
      }
      
      return {
        price: data.price,
        change: data.change,
        is_market_hours: data.is_market_hours
      };
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
            gainLossPercentage,
            isMarketHours: marketData.is_market_hours
          });

          return {
            ...investment,
            currentPrice,
            totalValue,
            gainLoss,
            gainLossPercentage,
            isMarketHours: marketData.is_market_hours
          };
        }
        
        // If no market data available, use purchase price as current price
        const totalValue = investment.purchase_price * investment.shares;
        return {
          ...investment,
          currentPrice: investment.purchase_price,
          totalValue,
          gainLoss: 0,
          gainLossPercentage: 0,
          isMarketHours: false
        };
      })
    );

    console.log('Setting updated investments:', updatedInvestments);
    setInvestments(updatedInvestments);
  };

  const loadInvestments = async () => {
    console.log('Loading investments...');
    setLoading(true);
    const investments = await fetchInvestments();
    console.log('Fetched investments:', investments);
    await updateInvestmentsWithMarketData(investments);
    setLoading(false);
  };

  useEffect(() => {
    // Initial load
    console.log('Initial load...');
    loadInvestments();

    // Refresh market data every 5 minutes since we're using historical data
    const intervalId = setInterval(async () => {
      console.log('Running 5-minute update interval...');
      const data = await fetchInvestments();
      await updateInvestmentsWithMarketData(data);
    }, 300000);

    return () => {
      console.log('Cleaning up interval...');
      clearInterval(intervalId);
    };
  }, []); // Remove isMarketHours dependency since we're using historical data

  const handleSellClick = (investment: InvestmentWithMarketData) => {
    setSellInvestment(investment);
  };

  const handleSellSuccess = () => {
    setSellInvestment(null);
    loadInvestments();
  };

  const handleSellCancel = () => {
    setSellInvestment(null);
  };

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

  const handleSell = async (investmentId: string, quantity: number, currentPrice: number) => {
    try {
      const response = await internalFetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investmentId,
          quantity,
          price: currentPrice,
          type: 'SELL'
        })
      });

      if (response.success) {
        fetchInvestments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error selling investment:', error);
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

  // If the SellInvestmentForm is active, show it instead of the portfolio
  if (sellInvestment) {
    return (
      <SellInvestmentForm
        investment={sellInvestment}
        currentPrice={sellInvestment.currentPrice}
        onSuccess={handleSellSuccess}
        onCancel={handleSellCancel}
      />
    );
  }

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
        <div className="sm:flex sm:items-center p-4 sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Your Investments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {investments.length} {investments.length === 1 ? 'investment' : 'investments'} in your portfolio
            </p>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mt-2 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Symbol
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Shares
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Purchase Price
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Current Price
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Total Value
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Gain/Loss
                        </th>
                        <th
                          scope="col"
                          className="relative px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {investments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                            <p>No investments found</p>
                            <button
                              onClick={onAddClick}
                              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-[#6495ED] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6495ED]"
                            >
                              Add your first investment
                            </button>
                          </td>
                        </tr>
                      ) : (
                        investments.map((investment) => (
                          <tr key={investment.id}>
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                              {investment.symbol}
                              {investment.isMarketHours === false && (
                                <span className="ml-2 text-xs text-gray-400">(Delayed)</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {investment.shares}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              ${investment.purchase_price.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {investment.currentPrice ? (
                                <>${investment.currentPrice.toFixed(2)}</>
                              ) : (
                                <span className="text-gray-400">Loading...</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {investment.totalValue ? (
                                <>${investment.totalValue.toFixed(2)}</>
                              ) : (
                                <span className="text-gray-400">Loading...</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {investment.gainLoss !== undefined && investment.gainLossPercentage !== undefined ? (
                                <div className="flex flex-col">
                                  <span className={`${investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {investment.gainLoss >= 0 ? '+' : ''}{investment.gainLoss.toFixed(2)} ({investment.gainLossPercentage.toFixed(2)}%)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Loading...</span>
                              )}
                            </td>
                            <td className="relative whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleSellClick(investment)}
                                  className="text-red-600 hover:text-red-900 px-2 py-1 border border-gray-300 rounded-md"
                                >
                                  Sell
                                </button>
                                <button
                                  onClick={() => handleDelete(investment)}
                                  className="text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-300 rounded-md"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 