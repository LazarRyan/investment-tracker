'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { internalFetch } from '../../utils/api';

interface MarketItem {
  symbol: string;
  price: number | null;
  change: number;
  type: string;
  is_market_hours?: boolean;
  timestamp?: string;
}

export default function StockScreenerPage() {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'index' | 'crypto'>('all');
  const [sortField, setSortField] = useState<'symbol' | 'price' | 'change'>('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const timestamp = Date.now();
        const res = await internalFetch(`/api/market-data?_t=${timestamp}`);
        if (!res.ok) throw new Error(res.error || 'Failed to fetch');
        const data = await res.json();
        setMarketData(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Failed to load market data. Make sure the market-service has been seeded.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = marketData
    .filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (search && !item.symbol.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'symbol') cmp = a.symbol.localeCompare(b.symbol);
      else if (sortField === 'price') cmp = (a.price ?? 0) - (b.price ?? 0);
      else if (sortField === 'change') cmp = a.change - b.change;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 inline-block text-gray-400">
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Screener</h1>
            <p className="mt-1 text-sm text-gray-500">Latest prices from the market database</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by symbol..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6495ED]"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6495ED]"
          >
            <option value="all">All Types</option>
            <option value="index">Indices / Stocks</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6495ED]" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <p className="mt-2 text-xs text-gray-500">
                To seed data, call: <code className="bg-gray-100 px-1 rounded">POST [market-service-url]/api/refresh</code>
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {marketData.length === 0
                ? 'No market data available. The database has not been seeded yet.'
                : 'No results match your search.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('symbol')}
                  >
                    Symbol <SortIcon field="symbol" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('price')}
                  >
                    Price <SortIcon field="price" />
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('change')}
                  >
                    Change % <SortIcon field="change" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(item => (
                  <tr key={item.symbol} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {item.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.type === 'crypto'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type === 'crypto' ? 'Crypto' : 'Index/Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.price != null ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-right text-gray-400">
                      {item.is_market_hours ? 'Market open' : 'After hours'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400 text-right">
          Data sourced from the market-service database.
        </p>
      </div>
    </div>
  );
}
