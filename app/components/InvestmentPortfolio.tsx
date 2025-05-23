'use client';

import { useEffect, useState, useCallback } from 'react';
import { Investment } from '../api/investments/route';
import SellInvestmentForm from './SellInvestmentForm';
import { internalFetch } from '../../utils/api';
import { debounceAsync } from '../../utils/debounce';

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
  onDataChange?: () => void;
}

export default function InvestmentPortfolio({ onAddClick, onDataChange }: InvestmentPortfolioProps) {
  const [investments, setInvestments] = useState<InvestmentWithMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellInvestment, setSellInvestment] = useState<InvestmentWithMarketData | null>(null);
  const [isMarketHours, setIsMarketHours] = useState<boolean>(false);
  
  // Add loading states for individual buttons
  const [buttonLoading, setButtonLoading] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

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
      const response = await internalFetch(`/api/market-data?symbol=${symbol}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No data available for ${symbol}`);
          return null;
        }
        throw new Error('Failed to fetch market data');
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

  const loadInvestmentsInternal = async () => {
    if (refreshing) return; // Prevent multiple simultaneous calls
    
    console.log('Loading investments...');
    setRefreshing(true);
    setLoading(true);
    try {
      const investments = await fetchInvestments();
      console.log('Fetched investments:', investments);
      await updateInvestmentsWithMarketData(investments);
    } catch (error) {
      console.error('Error loading investments:', error);
      setError('Failed to load investments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create debounced version of loadInvestments
  const loadInvestments = useCallback(
    debounceAsync(loadInvestmentsInternal, 500),
    [refreshing]
  );

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

  // Helper function to handle button loading states
  const handleButtonClick = async (
    buttonKey: string,
    action: () => Promise<void>
  ) => {
    setButtonLoading(prev => ({ ...prev, [buttonKey]: true }));
    try {
      await action();
    } catch (error) {
      console.error(`Error in ${buttonKey}:`, error);
      setError(`Failed to ${buttonKey.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    } finally {
      setButtonLoading(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  const handleSellClick = (investment: InvestmentWithMarketData) => {
    setSellInvestment(investment);
  };

  const handleSellSuccess = () => {
    setSellInvestment(null);
    loadInvestments();
    // Notify parent component that data has changed
    onDataChange?.();
  };

  const handleSellCancel = () => {
    setSellInvestment(null);
  };

  const handleDelete = async (investment: InvestmentWithMarketData) => {
    await handleButtonClick(`delete-${investment.id}`, async () => {
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

      // Update investment to 0 shares instead of deleting
      const updateResponse = await fetch(`/api/investments?id=${investment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shares: 0
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error('Update error:', error);
        throw new Error('Failed to update investment');
      }

      await loadInvestments();
      // Notify parent component that data has changed
      onDataChange?.();
    });
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

  if (sellInvestment) {
    return (
      <SellInvestmentForm
        investment={sellInvestment}
        onSuccess={handleSellSuccess}
        onCancel={handleSellCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    loadInvestments();
                  }}
                  className="bg-red-50 text-red-800 rounded-md px-2 py-1 text-sm font-medium hover:bg-red-100"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="sm:flex sm:items-center p-4 sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Your Investments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {investments.length} {investments.length === 1 ? 'investment' : 'investments'} in your portfolio
            </p>
          </div>
          <button
            onClick={loadInvestments}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6495ED] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#6495ED] mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mt-2 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Symbol</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Shares</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Purchase Price</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Purchase Date</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Current Price</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Value</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Gain/Loss</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="py-4 px-3 text-center text-sm text-gray-500">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#6495ED]"></div>
                              <span className="ml-2">Loading investments...</span>
                            </div>
                          </td>
                        </tr>
                      ) : investments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-4 px-3 text-center text-sm text-gray-500">
                            No investments found. <button onClick={onAddClick} className="text-[#6495ED] hover:text-[#4169E1] font-medium">Add your first investment</button>
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
                              {investment.purchase_date ? new Date(investment.purchase_date).toLocaleDateString() : 'N/A'}
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
                              {investment.gainLoss && investment.gainLossPercentage ? (
                                <div className={investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ${Math.abs(investment.gainLoss).toFixed(2)} ({investment.gainLossPercentage >= 0 ? '+' : ''}{investment.gainLossPercentage.toFixed(2)}%)
                                </div>
                              ) : (
                                <span className="text-gray-400">Loading...</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSellClick(investment)}
                                  disabled={buttonLoading[`sell-${investment.id}`]}
                                  className="text-sm font-medium text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {buttonLoading[`sell-${investment.id}`] ? 'Loading...' : 'Sell'}
                                </button>
                                <button
                                  onClick={() => handleDelete(investment)}
                                  disabled={buttonLoading[`delete-${investment.id}`]}
                                  className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {buttonLoading[`delete-${investment.id}`] ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                                      Deleting...
                                    </div>
                                  ) : (
                                    'Delete'
                                  )}
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