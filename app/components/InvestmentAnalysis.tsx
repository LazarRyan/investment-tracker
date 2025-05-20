'use client';

import { useState, useEffect } from 'react';
import { Investment } from '../api/investments/route';

interface InvestmentAnalysis {
  id: string;
  investment_id: string;
  analysis_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface InvestmentAnalysisProps {
  investment: Investment & {
    currentPrice?: number;
    gainLossPercentage?: number;
    gainLoss?: number;
    totalValue?: number;
    totalPortfolioValue?: number;
  };
}

export default function InvestmentAnalysis({ investment }: InvestmentAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<InvestmentAnalysis | null>(null);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/analysis?investment_id=${investment.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }
      const data = await response.json();
      if (data && data.length > 0) {
        setAnalysis(data[0]);
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError('Failed to load analysis');
    }
  };

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investment_id: investment.id,
          symbol: investment.symbol,
          shares: investment.shares,
          purchase_price: investment.purchase_price,
          current_price: investment.currentPrice,
          gain_loss_percentage: investment.gainLossPercentage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError('Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically generate analysis when component mounts
    if (!analysis) {
      generateAnalysis();
    }
  }, [investment.id]);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6495ED]"></div>
          <p className="text-sm text-gray-500">Generating comprehensive analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      {analysis ? (
        <div className="space-y-6">
          {/* Investment Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
              <p className="text-sm text-gray-500">Symbol</p>
              <p className="text-lg font-semibold">{investment.symbol}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-900">{investment.symbol.charAt(0)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
              <p className="text-sm text-gray-500">Position Size</p>
              <p className="text-lg font-semibold">{investment.shares} shares</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
              <p className="text-sm text-gray-500">Entry Price</p>
              <p className="text-lg font-semibold">${investment.purchase_price}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.171-.879-1.171-2.303 0-3.182C10.582 7.759 11.35 7.54 12 7.54c.725 0 1.45.22 2.003.659" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
              <p className="text-sm text-gray-500">Current Price</p>
              <p className="text-lg font-semibold">${investment.currentPrice?.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Performance */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">Return Metrics</h4>
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Return</span>
                    <span className={`text-sm font-medium ${investment.gainLoss && investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${investment.gainLoss?.toFixed(2) || '-'}
                      </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Return %</span>
                    <span className={`text-sm font-medium ${investment.gainLossPercentage && investment.gainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {investment.gainLossPercentage?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Investment</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${(investment.purchase_price * investment.shares).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Value</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${investment.totalValue?.toFixed(2) || '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">Price History</h4>
                <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-gray-500">Price chart coming soon</span>
                  </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Powered by AI
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              {analysis.split('\n').map((line, lineIndex) => {
                // Headers (##)
                if (line.startsWith('##')) {
              return (
                    <h4 key={lineIndex} className="text-base font-semibold text-gray-900 mt-4 first:mt-0">
                      {line.replace('##', '').trim()}
                    </h4>
                      );
                    }
                    // Bullet points (•)
                    else if (line.trim().startsWith('•')) {
                      const content = line.substring(1).trim();
                      // Check if it contains a bold section
                      const boldMatch = content.match(/\*\*([^*]+)\*\*/);
                      if (boldMatch) {
                        const [fullMatch, boldText] = boldMatch;
                        const parts = content.split(fullMatch);
                        return (
                      <div key={lineIndex} className="flex items-start mt-2">
                        <span className="text-gray-400 mr-3">•</span>
                            <div className="flex-1">
                          <span className="font-semibold">{boldText}</span>
                              {parts[1]}
                            </div>
                          </div>
                        );
                      }
                      return (
                    <div key={lineIndex} className="flex items-start mt-2">
                      <span className="text-gray-400 mr-3">•</span>
                      <div className="flex-1 text-gray-600">{content}</div>
                        </div>
                      );
                    }
                // Regular paragraphs
                        return (
                  <p key={lineIndex} className="text-gray-600 mt-2">
                          {line}
                        </p>
                      );
                  })}
                </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Portfolio Weight</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((investment.totalValue || 0) / (investment.totalPortfolioValue || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {((investment.totalValue || 0) / (investment.totalPortfolioValue || 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Volatility</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">Medium</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Risk Level</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">High</span>
                </div>
            </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Analysis Available</h3>
          <p className="mt-1 text-sm text-gray-500">Select an investment to view detailed analysis</p>
        </div>
      )}
    </div>
  );
} 