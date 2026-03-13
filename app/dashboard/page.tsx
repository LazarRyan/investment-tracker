'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import InvestmentPortfolio from '../components/InvestmentPortfolio';
import AddInvestmentForm from '../components/AddInvestmentForm';
import { internalFetch } from '../../utils/api';
import { debounceAsync } from '../../utils/debounce';

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
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [marketData, setMarketData] = useState<MarketIndex[]>([]);
  const [marketDataLoading, setMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);
  const [isMarketHours, setIsMarketHours] = useState<boolean>(false);
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  
  // Add loading states for buttons
  const [refreshing, setRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({
    addInvestment: false,
    viewTransactions: false,
    portfolioAnalysis: false,
    stockScreener: false,
    signOut: false,
    createAccount: false
  });
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Dashboard auth check - User:', user ? 'authenticated' : 'not authenticated');
        
        if (user) {
          setUser(user);
          setIsGuest(false);
          Cookies.remove('guest_mode');
        } else {
          const isGuestMode = Cookies.get('guest_mode') === 'true';
          const guestId = Cookies.get('guest_id');
          console.log('Dashboard auth check - Guest mode:', isGuestMode, 'Guest ID:', guestId);
          
          if (isGuestMode && guestId) {
            console.log('Setting guest mode active');
            setIsGuest(true);
            Cookies.set('guest_mode', 'true', { expires: 1 });
          } else {
            console.log('No valid authentication or guest mode, redirecting to sign-in');
            router.push('/auth/signin');
            return;
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/auth/signin');
        return;
      } finally {
        setLoading(false);
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
    // Only fetch data if user is authenticated or in guest mode
    if (!loading && (user || isGuest)) {
      fetchDashboardData();
      
      // Refresh data every 5 minutes
      const intervalId = setInterval(fetchDashboardData, 300000);
      
      return () => clearInterval(intervalId);
    }
  }, [user, isGuest, loading]);

  // Extract the data fetching logic into a separate function with loading state
  const fetchDashboardDataInternal = async () => {
    if (refreshing) return; // Prevent multiple simultaneous calls
    
    setRefreshing(true);
    setMarketDataLoading(true);
    try {
      // Fetch market data with cache-busting timestamp
      const timestamp = new Date().getTime();
      const marketResponse = await internalFetch(`/api/market-data?_t=${timestamp}`);
      if (!marketResponse.ok) {
        throw new Error(marketResponse.error || 'Failed to fetch market data');
      }
      if (Array.isArray(marketResponse.data)) {
        setMarketData(marketResponse.data);
        localStorage.setItem('marketDataLastUpdated', new Date().toISOString());
      } else {
        setMarketData([]);
      }
      
      // Fetch portfolio summary
      const summaryResponse = await internalFetch('/api/portfolio/summary');
      if (!summaryResponse.ok) {
        throw new Error(summaryResponse.error || 'Failed to fetch portfolio summary');
      }
      if (summaryResponse.data && typeof summaryResponse.data === 'object') {
        setPortfolioSummary(summaryResponse.data);
      }
      
      setMarketDataLoading(false);
      setMarketDataError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setMarketDataError('Failed to load market data');
      setMarketDataLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  // Create debounced version of fetchDashboardData
  const fetchDashboardData = useCallback(
    debounceAsync(fetchDashboardDataInternal, 500),
    [refreshing]
  );

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6495ED]"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Helper function to handle button loading states
  const handleButtonClick = async (
    buttonKey: keyof typeof buttonLoading,
    action: () => Promise<void> | void
  ) => {
    setButtonLoading(prev => ({ ...prev, [buttonKey]: true }));
    try {
      await action();
    } finally {
      setButtonLoading(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  // Enhanced button handlers with loading states
  const handleAddInvestmentClick = () => {
    handleButtonClick('addInvestment', async () => {
      setShowAddForm(true);
    });
  };

  const handleViewTransactionsClick = () => {
    handleButtonClick('viewTransactions', async () => {
      router.push('/transactions');
    });
  };

  const handlePortfolioAnalysisClick = () => {
    handleButtonClick('portfolioAnalysis', async () => {
      router.push('/portfolio/analysis');
    });
  };

  const handleStockScreenerClick = () => {
    handleButtonClick('stockScreener', async () => {
      router.push('/stock-screener');
    });
  };

  const handleSignOutClick = () => {
    handleButtonClick('signOut', async () => {
      await supabase.auth.signOut();
    });
  };

  const handleCreateAccountClick = () => {
    handleButtonClick('createAccount', async () => {
      router.push('/auth/signup');
    });
  };

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
                  onClick={handleCreateAccountClick}
                  disabled={buttonLoading.createAccount}
                  className="text-sm font-medium text-[#6495ED] hover:text-[#4169E1] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buttonLoading.createAccount ? 'Loading...' : 'Create Account'}
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Welcome, {user?.email}</span>
                  <button
                    onClick={handleSignOutClick}
                    disabled={buttonLoading.signOut}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {buttonLoading.signOut ? 'Signing out...' : 'Sign Out'}
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
                        onClick={handleCreateAccountClick}
                        disabled={buttonLoading.createAccount}
                        className="font-medium text-yellow-800 underline hover:text-yellow-900 disabled:opacity-50"
                      >
                        {buttonLoading.createAccount ? 'Loading...' : 'Create an account'}
                      </button>
                      {' '}to save your progress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Header with Refresh Button */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Investment Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track and manage your investment portfolio
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
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
                    <button 
                      onClick={fetchDashboardData}
                      disabled={refreshing}
                      className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {refreshing ? 'Retrying...' : 'Retry'}
                    </button>
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
                    <button 
                      onClick={fetchDashboardData}
                      disabled={refreshing}
                      className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {refreshing ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Portfolio Summary */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Portfolio Summary</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Portfolio Value */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Portfolio Value</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      ${marketDataLoading ? "..." : portfolioSummary?.portfolioValue?.toFixed(2) || "0.00"}
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
                    <span className={`ml-2 text-sm font-medium ${(portfolioSummary?.dayChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${marketDataLoading ? "..." : Math.abs(portfolioSummary?.dayChange || 0).toFixed(2)} ({marketDataLoading ? "..." : (portfolioSummary?.dayChangePercentage || 0).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Gain/Loss */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Gain/Loss</h3>
                    <p className={`mt-2 text-3xl font-semibold ${(portfolioSummary?.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${marketDataLoading ? "..." : Math.abs(portfolioSummary?.totalGainLoss || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">Return:</span>
                    <span className={`ml-2 text-sm font-medium ${(portfolioSummary?.totalGainLossPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {marketDataLoading ? "..." : (portfolioSummary?.totalGainLossPercentage || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Invested */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Invested</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      ${marketDataLoading ? "..." : portfolioSummary?.totalInvested?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
                    <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">Positions:</span>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {marketDataLoading ? "..." : portfolioSummary?.positions || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portfolio Diversity */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Portfolio Diversity</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {marketDataLoading ? "..." : portfolioSummary?.stocksCount || 0} Stocks
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
                    <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">Sectors:</span>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {marketDataLoading ? "..." : portfolioSummary?.sectors || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={handleAddInvestmentClick}
                disabled={buttonLoading.addInvestment}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonLoading.addInvestment ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6495ED] mb-2"></div>
                ) : (
                  <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-900">
                  {buttonLoading.addInvestment ? 'Loading...' : 'Add Investment'}
                </span>
              </button>
              
              <button
                onClick={handleViewTransactionsClick}
                disabled={buttonLoading.viewTransactions}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonLoading.viewTransactions ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6495ED] mb-2"></div>
                ) : (
                  <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-900">
                  {buttonLoading.viewTransactions ? 'Loading...' : 'View Transactions'}
                </span>
              </button>
              
              <button
                onClick={handlePortfolioAnalysisClick}
                disabled={buttonLoading.portfolioAnalysis}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonLoading.portfolioAnalysis ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6495ED] mb-2"></div>
                ) : (
                  <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-900">
                  {buttonLoading.portfolioAnalysis ? 'Loading...' : 'Portfolio Analysis'}
                </span>
                {(portfolioSummary?.totalGainLoss || 0) < 0 && !buttonLoading.portfolioAnalysis && (
                  <span className="mt-1 text-xs font-medium text-red-500">Attention needed</span>
                )}
              </button>
              
              <button
                onClick={handleStockScreenerClick}
                disabled={buttonLoading.stockScreener}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonLoading.stockScreener ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6495ED] mb-2"></div>
                ) : (
                  <svg className="h-6 w-6 text-[#6495ED] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-900">
                  {buttonLoading.stockScreener ? 'Loading...' : 'Stock Screener'}
                </span>
                {(portfolioSummary?.sectors || 0) <= 1 && (portfolioSummary?.positions || 0) > 0 && !buttonLoading.stockScreener && (
                  <span className="mt-1 text-xs font-medium text-orange-500">Diversify portfolio</span>
                )}
              </button>
            </div>
          </div>

          {/* Investment Portfolio */}
          {showAddForm ? (
            <AddInvestmentForm
              onSuccess={() => {
                setShowAddForm(false);
                // Refresh both the portfolio summary and investment list
                fetchDashboardData();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <InvestmentPortfolio 
              onAddClick={handleAddInvestmentClick}
              onDataChange={fetchDashboardData}
            />
          )}
        </div>
      </main>
    </div>
  );
} 