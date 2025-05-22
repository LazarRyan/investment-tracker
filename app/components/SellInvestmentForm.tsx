'use client';

import { useState, useEffect } from 'react';
import { Investment } from '../api/investments/route';

interface SellInvestmentFormProps {
  investment: Investment;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SellInvestmentForm({ investment, onSuccess, onCancel }: SellInvestmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    shares: investment.shares.toString(),
    sell_price: '',
    sell_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Fetch current market price when component loads
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      try {
        const response = await fetch(`/api/market-data?symbol=${investment.symbol}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentPrice(data.price);
          setFormData(prev => ({ ...prev, sell_price: data.price.toString() }));
        }
      } catch (error) {
        console.error('Error fetching current price:', error);
      }
    };

    fetchCurrentPrice();
  }, [investment.symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const sharesToSell = parseFloat(formData.shares);
    const sellPrice = parseFloat(formData.sell_price);
    
    // Validate inputs
    if (sharesToSell <= 0) {
      setError('Number of shares must be greater than 0');
      setLoading(false);
      return;
    }
    
    if (sharesToSell > investment.shares) {
      setError(`You only have ${investment.shares} shares of ${investment.symbol}`);
      setLoading(false);
      return;
    }

    try {
      // Create SELL transaction
      const transactionResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investment_id: investment.id,
          symbol: investment.symbol,
          type: 'SELL',
          shares: sharesToSell,
          price: sellPrice,
          total: sellPrice * sharesToSell,
          date: formData.sell_date,
          notes: formData.notes || `Sold ${sharesToSell} shares at $${sellPrice}`,
          profit: (sellPrice - investment.purchase_price) * sharesToSell // Calculate profit/loss
        }),
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        console.error('Transaction creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to create sell transaction');
      }

      // If selling all shares, mark investment as sold
      if (sharesToSell === investment.shares) {
        await fetch(`/api/investments?id=${investment.id}`, {
          method: 'DELETE'
        });
      } 
      // If selling part of the shares, update remaining shares
      else if (sharesToSell < investment.shares) {
        await fetch(`/api/investments?id=${investment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shares: investment.shares - sharesToSell
          }),
        });
      }

      console.log(`Successfully sold ${sharesToSell} shares of ${investment.symbol}`);
      onSuccess();
    } catch (err) {
      console.error('Error selling investment:', err);
      setError(err instanceof Error ? err.message : 'Failed to sell investment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Calculate potential profit or loss
  const sharesToSell = parseFloat(formData.shares) || 0;
  const sellPrice = parseFloat(formData.sell_price) || 0;
  const purchaseValue = investment.purchase_price * sharesToSell;
  const sellValue = sellPrice * sharesToSell;
  const profitLoss = sellValue - purchaseValue;
  const profitLossPercentage = purchaseValue ? (profitLoss / purchaseValue) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Sell {investment.symbol}</h2>
      <p className="text-sm text-gray-500 mb-6">Current Holdings: {investment.shares} shares at ${investment.purchase_price.toFixed(2)}</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="shares" className="block text-sm font-medium text-gray-700">
            Number of Shares to Sell
          </label>
          <input
            type="number"
            name="shares"
            id="shares"
            required
            min="0.0001"
            max={investment.shares}
            step="0.0001"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm"
            value={formData.shares}
            onChange={handleChange}
          />
          <p className="mt-1 text-xs text-gray-500">
            Maximum: {investment.shares} shares
          </p>
        </div>

        <div>
          <label htmlFor="sell_price" className="block text-sm font-medium text-gray-700">
            Sell Price per Share
          </label>
          <input
            type="number"
            name="sell_price"
            id="sell_price"
            required
            min="0.01"
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm"
            value={formData.sell_price}
            onChange={handleChange}
          />
          {currentPrice && (
            <p className="mt-1 text-xs text-gray-500">
              Current market price: ${currentPrice.toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sell_date" className="block text-sm font-medium text-gray-700">
            Sell Date
          </label>
          <input
            type="date"
            name="sell_date"
            id="sell_date"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm"
            value={formData.sell_date}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional notes about this sale"
          />
        </div>

        {/* Summary Section */}
        {sharesToSell > 0 && sellPrice > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Purchase Value:</div>
              <div className="text-right font-medium">${purchaseValue.toFixed(2)}</div>
              
              <div className="text-gray-500">Sell Value:</div>
              <div className="text-right font-medium">${sellValue.toFixed(2)}</div>
              
              <div className="text-gray-500">Profit/Loss:</div>
              <div className={`text-right font-medium ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${profitLoss.toFixed(2)} ({profitLossPercentage.toFixed(2)}%)
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#6495ED] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4169E1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6495ED] disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sell Investment'}
          </button>
        </div>
      </form>
    </div>
  );
} 