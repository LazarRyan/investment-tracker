'use client';

import { useState } from 'react';
import { Investment } from '../api/investments/route';

interface AddInvestmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddInvestmentForm({ onSuccess, onCancel }: AddInvestmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    shares: '',
    purchase_price: '',
    purchase_date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First create the investment
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          shares: parseFloat(formData.shares),
          purchase_price: parseFloat(formData.purchase_price),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add investment');
      }

      let investment = await response.json();
      console.log('Investment created:', investment);

      // Check if investment has warning (duplicate found)
      if (investment.warning) {
        console.log('Duplicate investment warning:', investment.warning);
        investment = investment.investment; // Use the existing investment
      }

      // Verify we have a valid investment object with an ID
      if (!investment || !investment.id) {
        console.error('Invalid investment object received:', investment);
        throw new Error('Invalid investment data received from server');
      }

      // Then create a BUY transaction
      const transactionResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investment_id: investment.id,
          symbol: investment.symbol,
          type: 'BUY',
          shares: investment.shares,
          price: investment.purchase_price,
          total: investment.purchase_price * investment.shares,
          date: investment.purchase_date,
          notes: investment.notes || 'Initial purchase'
        }),
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        console.error('Transaction creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      console.log('Transaction created successfully');
      onSuccess();
    } catch (err) {
      console.error('Error in form submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to add investment. Please try again.');
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
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Investment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
            Stock Symbol
          </label>
          <input
            type="text"
            name="symbol"
            id="symbol"
            required
            disabled={loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={formData.symbol}
            onChange={handleChange}
            placeholder="e.g., AAPL"
          />
        </div>

        <div>
          <label htmlFor="shares" className="block text-sm font-medium text-gray-700">
            Number of Shares
          </label>
          <input
            type="number"
            name="shares"
            id="shares"
            required
            min="0"
            step="0.0001"
            disabled={loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={formData.shares}
            onChange={handleChange}
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
            Purchase Price per Share
          </label>
          <input
            type="number"
            name="purchase_price"
            id="purchase_price"
            required
            min="0"
            step="0.01"
            disabled={loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={formData.purchase_price}
            onChange={handleChange}
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
            Purchase Date
          </label>
          <input
            type="date"
            name="purchase_date"
            id="purchase_date"
            required
            disabled={loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={formData.purchase_date}
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
            rows={3}
            disabled={loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6495ED] focus:ring-[#6495ED] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional notes about this investment"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-[#6495ED] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4169E1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6495ED] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Investment...
              </>
            ) : (
              'Add Investment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 