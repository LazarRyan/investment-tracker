'use client';

import { useEffect, useState } from 'react';
import { Investment } from '../api/investments/route';
import { createClient } from '@/lib/supabase/client';
import { internalFetch } from '../../utils/api';

interface MarketData {
  price: number;
  change: number;
}

interface InvestmentWithMarketData extends Investment {
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercentage?: number;
}

interface PortfolioGrade {
  overall: string;
  diversification: string;
  risk: string;
  performance: string;
  analysis: string[];
}

interface AssetGrade {
  symbol: string;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export default function PortfolioAnalysis() {
  const [investments, setInvestments] = useState<InvestmentWithMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolioGrade, setPortfolioGrade] = useState<PortfolioGrade | null>(null);
  const [assetGrades, setAssetGrades] = useState<AssetGrade[]>([]);

  const fetchInvestments = async () => {
    try {
      const response = await internalFetch('/api/investments');
      if (response.data) {
        setInvestments(response.data);
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
      setError('Failed to load investments');
    }
  };

  const fetchMarketData = async (symbol: string): Promise<MarketData | null> => {
    try {
      const response = await fetch(`http://localhost:8000/api/stocks?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching market data for ${symbol}:`, err);
      return null;
    }
  };

  const updateInvestmentsWithMarketData = async (investments: Investment[]) => {
    const updatedInvestments = await Promise.all(
      investments.map(async (investment) => {
        const marketData = await fetchMarketData(investment.symbol);
        if (marketData) {
          const currentPrice = marketData.price;
          const totalValue = currentPrice * investment.shares;
          const purchaseValue = investment.purchase_price * investment.shares;
          const gainLoss = totalValue - purchaseValue;
          const gainLossPercentage = (gainLoss / purchaseValue) * 100;

          return {
            ...investment,
            currentPrice,
            totalValue,
            gainLoss,
            gainLossPercentage,
          };
        }
        return investment;
      })
    );

    setInvestments(updatedInvestments);
  };

  const fetchPortfolioAnalysis = async () => {
    try {
      // This would be replaced with actual API call to get AI analysis
      // Mocked data for now
      setPortfolioGrade({
        overall: 'B+',
        diversification: 'B',
        risk: 'A-',
        performance: 'B+',
        analysis: [
          'Well-balanced portfolio with room for improvement in sector diversification',
          'Good risk management with majority of investments in established companies',
          'Performance is above market average but could be optimized',
          'Consider adding more defensive stocks to balance growth positions'
        ]
      });

      const grades = investments.map(inv => ({
        symbol: inv.symbol,
        grade: 'B+',
        strengths: [
          'Strong market position',
          'Consistent growth',
          'Healthy financials'
        ],
        weaknesses: [
          'High volatility',
          'Sector concentration risk'
        ],
        recommendations: [
          'Consider increasing position on market dips',
          'Monitor sector exposure'
        ]
      }));
      setAssetGrades(grades);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError('Failed to load analysis');
    }
  };

  const fetchAnalysis = async () => {
    try {
      const response = await internalFetch('/api/analysis');
      if (response.data) {
        setAnalysis(response.data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setError('Failed to load portfolio analysis');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchInvestments();
      await updateInvestmentsWithMarketData(investments);
      await fetchPortfolioAnalysis();
      await fetchAnalysis();
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6495ED]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h1>
          <p className="mt-2 text-sm text-gray-500">
            AI-powered analysis and recommendations for your investment portfolio
          </p>
        </div>

        {/* Portfolio Grade Card */}
        {portfolioGrade && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Portfolio Grade</h2>
              <span className="text-4xl font-bold text-[#6495ED]">{portfolioGrade.overall}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Diversification</h3>
                <div className="mt-2 flex items-center">
                  <span className="text-2xl font-semibold text-gray-900">{portfolioGrade.diversification}</span>
                  <div className="ml-4 flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Risk Management</h3>
                <div className="mt-2 flex items-center">
                  <span className="text-2xl font-semibold text-gray-900">{portfolioGrade.risk}</span>
                  <div className="ml-4 flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Performance</h3>
                <div className="mt-2 flex items-center">
                  <span className="text-2xl font-semibold text-gray-900">{portfolioGrade.performance}</span>
                  <div className="ml-4 flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Analysis & Recommendations</h3>
              <ul className="space-y-3">
                {portfolioGrade.analysis.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-[#6495ED]">•</span>
                    <span className="ml-2 text-sm text-gray-600">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Individual Asset Grades */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Individual Asset Analysis</h2>
          <div className="space-y-6">
            {assetGrades.map((asset, index) => (
              <div key={index} className="border-t border-gray-200 pt-6 first:border-0 first:pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{asset.symbol}</h3>
                    <p className="text-sm text-gray-500">Individual Asset Grade</p>
                  </div>
                  <span className="text-3xl font-bold text-[#6495ED]">{asset.grade}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
                    <ul className="space-y-2">
                      {asset.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-gray-600">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Areas of Concern</h4>
                    <ul className="space-y-2">
                      {asset.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                          <span className="text-sm text-gray-600">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {asset.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                          </svg>
                          <span className="text-sm text-gray-600">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 