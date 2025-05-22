'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import InvestmentPortfolio from '../components/InvestmentPortfolio';
import AddInvestmentForm from '../components/AddInvestmentForm';
import { internalFetch } from '../../utils/api';

interface MarketIndex {
  symbol: string;
  price: number;
  change: number;
  type: string;
  is_market_hours: boolean;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [marketData, setMarketData] = useState<MarketIndex[]>([]);
  const [marketDataLoading, setMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);
  const [isMarketHours, setIsMarketHours] = useState<boolean>(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setIsGuest(false);
        Cookies.remove('guest_mode');
      } else {
        const isGuestMode = Cookies.get('guest_mode') === 'true';
        if (isGuestMode) {
          setIsGuest(true);
          Cookies.set('guest_mode', 'true', { expires: 1 });
        } else {
          router.push('/');
        }
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        Cookies.remove('guest_mode');
        setUser(null);
        setIsGuest(false);
        router.push('/');
      } else if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]);

  // Fetch market data and portfolio summary from our API service
  useEffect(() => {
    const fetchData = async () => {
      setMarketDataLoading(true);
      try {
        // Fetch market data only
        const marketResponse = await internalFetch('/api/market-data');
        if (marketResponse.data) {
          setMarketData(marketResponse.data);
          localStorage.setItem('marketDataLastUpdated', new Date().toISOString());
        }
        
        setMarketDataLoading(false);
        setMarketDataError(null);
      } catch (error) {
        console.error('Error fetching market data:', error);
        setMarketDataError('Failed to load market data');
        setMarketDataLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchData, 300000);
    
    return () => clearInterval(intervalId);
  }, []); // No dependencies needed

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-semibold text-[#6495ED]">Investment Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isGuest ? (
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="text-sm font-medium text-[#6495ED] hover:text-[#4169E1]"
                >
                  Create Account
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Welcome, {user?.email}</span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Guest Mode Warning */}
          {isGuest && (
            <div className="mb-8 rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Guest Mode Active</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You are using the application in guest mode. Your data will not be saved and will be lost when the session expires.{' '}
                      <button
                        onClick={() => router.push('/auth/signup')}
                        className="font-medium text-yellow-800 underline hover:text-yellow-900"
                      >
                        Create an account
                      </button>
                      {' '}to save your progress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Overview */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Market Overview</h2>
              {!marketDataLoading && !marketDataError && marketData.length > 0 && (
                <span className="text-xs text-gray-500">
                  Last updated: {new Date(localStorage.getItem('marketDataLastUpdated') || new Date().toISOString()).toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketDataLoading ? (
                // Loading skeleton
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-10"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : marketDataError ? (
                // Error state
                <div className="col-span-3 bg-red-50 rounded-lg p-4">
                  <div className="flex flex-col items-center justify-center py-6">
                    <svg className="h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{marketDataError}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Please try refreshing the page. If the problem persists, the market data service may be temporarily unavailable.
                    </p>
                  </div>
                </div>
              ) : marketData.length > 0 ? (
                // Real market data
                marketData.slice(0, 3).map(index => (
                  <div key={index.symbol} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          {index.symbol}
                          {!index.is_market_hours && (
                            <span className="ml-2 text-xs text-gray-400">(Delayed)</span>
                          )}
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {typeof index.price === 'number' 
                            ? index.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })
                            : index.price}
                        </p>
                      </div>
                      <div className={index.change >= 0 ? "text-green-600" : "text-red-600"}>
                        <p className="text-sm font-medium">
                          {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}%
                        </p>
                        <p className="text-xs">
                          {index.change >= 0 ? '+' : ''}{((index.price * index.change) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // No data available
                <div className="col-span-3 bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-col items-center justify-center py-6">
                    <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                    </svg>
                    <p className="text-sm text-gray-700 font-medium">No market data available</p>
                    <p className="text-xs text-gray-500 mt-2">Market data could not be loaded at this time.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
              >
                <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Add Investment</span>
              </button>
              
              <button
                onClick={() => router.push('/transactions')}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
              >
                <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                <span className="text-sm font-medium text-gray-900">View Transactions</span>
              </button>
              
              <button
                onClick={() => router.push('/portfolio/analysis')}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
              >
                <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Portfolio Analysis</span>
              </button>
              
              <button
                onClick={() => window.open('https://finance.yahoo.com/screener/new', '_blank')}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
              >
                <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Stock Screener</span>
              </button>
            </div>
          </div>

          {/* Investment Portfolio */}
          {showAddForm ? (
            <AddInvestmentForm
              onSuccess={() => {
                setShowAddForm(false);
                // The portfolio will automatically refresh due to its own useEffect
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <InvestmentPortfolio 
              onAddClick={() => setShowAddForm(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}