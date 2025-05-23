'use client';

import { useEffect, useState } from 'react';
import { Investment } from '../../api/investments/route';
import { createClient } from '@/lib/supabase/client';
import { generatePortfolioReport, InvestmentWithData } from '../../../utils/pdf-generator';

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
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioGrade, setPortfolioGrade] = useState<PortfolioGrade | null>(null);
  const [assetGrades, setAssetGrades] = useState<AssetGrade[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);

  const fetchInvestments = async () => {
    try {
      const response = await fetch('/api/investments');
      if (!response.ok) {
        throw new Error('Failed to fetch investments');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching investments:', err);
      setError('Failed to load investments');
      return [];
    }
  };

  const fetchMarketData = async (symbol: string): Promise<MarketData | null> => {
    try {
      const response = await fetch(`/api/market-data?symbol=${symbol}`);
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

  const fetchPortfolioAnalysis = async (investments: InvestmentWithMarketData[]) => {
    if (!aiAnalysisEnabled) {
      // Skip AI analysis if disabled, use basic analysis
      generateBasicAnalysis(investments);
      return;
    }

    setAnalysisLoading(true);
    setError(null);
    
    try {
      // Calculate portfolio metrics
      const totalValue = investments.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
      const totalInvested = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.shares), 0);
      const totalGainLoss = investments.reduce((sum, inv) => sum + (inv.gainLoss || 0), 0);
      const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
      const sectorDiversification = new Set(investments.map(inv => inv.sector)).size;

      // Prepare data for AI analysis
      const analysisData = {
        investments: investments.map(inv => ({
          symbol: inv.symbol,
          shares: inv.shares,
          purchase_price: inv.purchase_price,
          current_price: inv.currentPrice || inv.purchase_price,
          total_value: inv.totalValue || 0,
          gain_loss: inv.gainLoss || 0,
          gain_loss_percentage: inv.gainLossPercentage || 0,
          sector: inv.sector || 'Unknown'
        })),
        portfolio_metrics: {
          total_value: totalValue,
          total_invested: totalInvested,
          total_gain_loss: totalGainLoss,
          total_gain_loss_percentage: totalGainLossPercentage,
          positions_count: investments.length,
          sectors_count: sectorDiversification
        }
      };

      console.log('Calling AI portfolio analysis with data:', analysisData);

      // Call the AI analysis service
      const response = await fetch('/api/portfolio-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Portfolio analysis API error:', errorData);
        throw new Error(errorData.error || 'Failed to generate portfolio analysis');
      }

      const analysisResult = await response.json();
      console.log('Received AI analysis result:', analysisResult);

      // Set portfolio grade from AI analysis
      setPortfolioGrade({
        overall: analysisResult.portfolio_grade.overall,
        diversification: analysisResult.portfolio_grade.diversification,
        risk: analysisResult.portfolio_grade.risk,
        performance: analysisResult.portfolio_grade.performance,
        analysis: analysisResult.portfolio_grade.analysis
      });

      // Process individual analyses and create asset grades
      const aiAssetGrades = analysisResult.individual_analyses.map((analysis: any) => {
        const investment = investments.find(inv => inv.symbol === analysis.symbol);
        
        // Parse the AI analysis to extract structured data
        const analysisText = analysis.analysis || analysis.raw_analysis || '';
        
        // Extract grade from analysis text (look for patterns like "Grade: A" or "A+" etc.)
        const gradeMatch = analysisText.match(/(?:Grade|Rating):\s*([A-D][+-]?)/i) || 
                          analysisText.match(/\b([A-D][+-]?)\s*(?:grade|rating)/i);
        const extractedGrade = gradeMatch ? gradeMatch[1] : analysis.grade || 'B';

        // Extract strengths, weaknesses, and recommendations from the analysis
        const strengths = extractAnalysisSection(analysisText, ['strength', 'positive', 'advantage']);
        const weaknesses = extractAnalysisSection(analysisText, ['weakness', 'risk', 'concern', 'negative']);
        const recommendations = extractAnalysisSection(analysisText, ['recommend', 'suggest', 'consider', 'should']);

        return {
          symbol: analysis.symbol,
          grade: extractedGrade,
          strengths: strengths.length > 0 ? strengths : [
            `Current performance: ${investment?.gainLossPercentage?.toFixed(1) || '0'}%`,
            'AI analysis completed',
            `${investment?.sector || 'Market'} sector exposure`
          ],
          weaknesses: weaknesses.length > 0 ? weaknesses : [
            'Market volatility exposure',
            'Requires ongoing monitoring'
          ],
          recommendations: recommendations.length > 0 ? recommendations : [
            'Monitor performance regularly',
            'Consider portfolio balance'
          ],
          ai_analysis: analysisText // Store full AI analysis for reference
        };
      });

      setAssetGrades(aiAssetGrades);

    } catch (err) {
      console.error('Error generating AI portfolio analysis:', err);
      
      // Fallback to basic analysis if AI service fails
      console.log('Falling back to basic analysis due to AI service error');
      generateBasicAnalysis(investments);
      setError('AI analysis temporarily unavailable. Showing basic portfolio metrics.');
      setAiAnalysisEnabled(false); // Disable AI for this session
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Separate function for basic analysis fallback
  const generateBasicAnalysis = (investments: InvestmentWithMarketData[]) => {
    const totalValue = investments.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
    const totalGainLoss = investments.reduce((sum, inv) => sum + (inv.gainLoss || 0), 0);
      const sectorDiversification = new Set(investments.map(inv => inv.sector)).size;
      
      setPortfolioGrade({
        overall: totalGainLoss > 0 ? 'A-' : 'B+',
        diversification: sectorDiversification > 3 ? 'A' : 'B',
        risk: 'B+',
        performance: totalGainLoss > 0 ? 'A' : 'B-',
        analysis: [
          `Portfolio consists of ${investments.length} stocks across ${sectorDiversification} sectors`,
          `Overall performance shows ${totalGainLoss > 0 ? 'positive' : 'negative'} returns`,
        aiAnalysisEnabled ? 'AI analysis temporarily unavailable - showing basic metrics' : 'Using basic analysis mode',
        aiAnalysisEnabled ? 'Consider refreshing for detailed AI insights' : 'Enable AI analysis for detailed insights'
      ]
    });

    // Basic fallback for individual assets
    const basicAssetGrades = investments.map(inv => {
        const performanceGrade = (inv.gainLossPercentage || 0) > 0 ? 'A' : 'B';
        const positionSize = ((inv.totalValue || 0) / totalValue) * 100;
        
        return {
          symbol: inv.symbol,
          grade: performanceGrade,
          strengths: [
            `${positionSize > 20 ? 'Major' : 'Balanced'} position in portfolio (${positionSize.toFixed(1)}%)`,
            inv.gainLossPercentage && inv.gainLossPercentage > 0 
              ? `Strong performance with ${inv.gainLossPercentage.toFixed(1)}% return`
            : 'Established market presence'
          ],
          weaknesses: [
          aiAnalysisEnabled ? 'AI analysis unavailable' : 'Basic analysis mode',
          positionSize > 20 ? 'High concentration risk' : 'Limited position size'
          ],
          recommendations: [
          aiAnalysisEnabled ? 'Refresh page for AI analysis' : 'Enable AI analysis for detailed insights',
          'Monitor performance trends'
          ]
        };
      });

    setAssetGrades(basicAssetGrades);
  };

  // Helper function to extract sections from AI analysis text
  const extractAnalysisSection = (text: string, keywords: string[]): string[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const matchingSentences: string[] = [];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (keywords.some(keyword => lowerSentence.includes(keyword))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10) { // Filter out very short matches
          matchingSentences.push(cleanSentence);
        }
      }
    });
    
    return matchingSentences.slice(0, 3); // Limit to 3 items per section
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPdf(true);
      
      // Get user information
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email || 'Investor';
      
      // Generate PDF blob - now awaiting the async function
      const pdfBlob = await generatePortfolioReport({
        investments: investments as InvestmentWithData[],
        portfolioGrade: portfolioGrade || undefined,
        assetGrades: assetGrades || [],
        userName,
        reportDate: new Date()
      });
      
      // Create URL and download
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Investment_Portfolio_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(pdfUrl);
      setGeneratingPdf(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchInvestments();
        await updateInvestmentsWithMarketData(data);
        // Only generate analysis after we have investment data
        if (data.length > 0) {
          await fetchPortfolioAnalysis(data);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load portfolio data');
      } finally {
        setLoading(false);
      }
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h1>
              <p className="mt-2 text-sm text-gray-500">
                AI-powered analysis and recommendations for your investment portfolio
              </p>
              {analysisLoading && (
                <div className="mt-2 flex items-center text-sm text-blue-600">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating AI analysis...
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* AI Analysis Toggle */}
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiAnalysisEnabled}
                    onChange={(e) => {
                      setAiAnalysisEnabled(e.target.checked);
                      if (e.target.checked && investments.length > 0) {
                        fetchPortfolioAnalysis(investments);
                      } else if (!e.target.checked) {
                        generateBasicAnalysis(investments);
                      }
                    }}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    aiAnalysisEnabled ? 'bg-[#6495ED]' : 'bg-gray-200'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiAnalysisEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    AI Analysis
                  </span>
                </label>
              </div>

              {/* Refresh Analysis Button */}
              {aiAnalysisEnabled && (
                <button
                  onClick={() => fetchPortfolioAnalysis(investments)}
                  disabled={analysisLoading || loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analysisLoading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span className="ml-1">Refresh</span>
                </button>
              )}
            
            {/* Export PDF Button */}
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPdf || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6495ED] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPdf ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export PDF Report
                </>
              )}
            </button>
            </div>
          </div>
        </div>

        {/* Portfolio Grade Card */}
        {portfolioGrade && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Portfolio Grade</h2>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  aiAnalysisEnabled 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {aiAnalysisEnabled ? (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Analysis
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Basic Analysis
                    </>
                  )}
                </div>
                {analysisLoading && (
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </div>
                )}
              </div>
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