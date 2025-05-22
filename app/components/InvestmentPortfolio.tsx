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
                                  className="text-sm font-medium text-red-600 hover:text-red-900"
                                >
                                  Sell
                                </button>
                                <button
                                  onClick={() => handleDelete(investment)}
                                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
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