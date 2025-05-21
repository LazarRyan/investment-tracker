'use client';

import { useState, useEffect } from 'react';
import { Investment } from '../api/investments/route';

interface SellInvestmentFormProps {
  investment: Investment;
  currentPrice?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SellInvestmentForm({ 
  investment, 
  currentPrice, 
  onSuccess, 
  onCancel 
}: SellInvestmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shares: investment.shares.toString(),
    sell_price: currentPrice ? currentPrice.toString() : '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Calculate the total value of the sale
  const totalValue = parseFloat(formData.shares) * parseFloat(formData.sell_price || '0');
  
  // Calculate profit/loss
  const originalCost = parseFloat(formData.shares) * investment.purchase_price;
  const profitLoss = totalValue - originalCost;
  const profitLossPercentage = originalCost > 0 ? (profitLoss / originalCost) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const sharesToSell = parseFloat(formData.shares);
      const sellPrice = parseFloat(formData.sell_price);
      
      // Validate shares
      if (sharesToSell > investment.shares) {
        throw new Error(`You can't sell more shares than you own (${investment.shares})`);
      }
      
      if (sharesToSell <= 0 || sellPrice <= 0) {
        throw new Error('Shares and price must be greater than zero');
      }

      // Create a SELL transaction
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
          date: formData.date,
          notes: formData.notes || 'Sell transaction'
        }),
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      // If all shares are sold, delete the investment
      if (sharesToSell === investment.shares) {
        const deleteResponse = await fetch(`/api/investments?id=${investment.id}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          throw new Error(errorData.error || 'Failed to delete investment');
        }
      } else {
        // Otherwise, update the investment with the remaining shares
        const remainingShares = investment.shares - sharesToSell;
        const updateResponse = await fetch(`/api/investments?id=${investment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shares: remainingShares,
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update investment');
        }
      }

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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Sell {investment.symbol}</h2>
      <div className="mb-4 bg-gray-50 p-4 rounded-md">
        <p className="text-sm text-gray-600">You currently own <span className="font-semibold">{investment.shares}</span> shares at <span className="font-semibold">${investment.purchase_price.toFixed(2)}</span> per share.</p>
        {currentPrice && (
          <p className="text-sm text-gray-600 mt-1">Current market price: <span className="font-semibold">${currentPrice.toFixed(2)}</span> per share.</p>
        )}
      </div>
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
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Sale Date
          </label>
          <input
            type="date"
            name="date"
            id="date"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm"
            value={formData.date}
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

        {/* Sale summary */}
        {formData.shares && formData.sell_price && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Sale Summary</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Sale Value:</span>
                <span className="font-medium">${totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Original Cost Basis:</span>
                <span className="font-medium">${originalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                <span className="text-gray-500">Estimated Profit/Loss:</span>
                <span className={`font-medium ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} ({profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
                </span>
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
            className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sell Shares'}
          </button>
        </div>
      </form>
    </div>
  );
} 