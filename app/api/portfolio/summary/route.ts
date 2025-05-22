import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '@/utils/server-api';

export const dynamic = 'force-dynamic';

interface Investment {
  id: string;
  user_id: string;
  symbol: string;
  shares: number;
  purchase_price: number;
}

export async function GET(req: Request) {
  return withAuth(async (supabase, userId) => {
    try {
      // Fetch all investments for the user
      const { data: investments, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId);

      if (investmentsError) {
        console.error('Error fetching investments:', investmentsError);
        return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
      }

      if (!investments || investments.length === 0) {
        return NextResponse.json({
          portfolioValue: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0,
          dayChange: 0,
          dayChangePercentage: 0,
          totalInvested: 0,
          positions: 0,
          stocksCount: 0,
          sectors: 0
        });
      }

      // For each investment, fetch the latest market data
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const adminSupabase = createClient(supabaseUrl, supabaseKey);
      
      // Get all unique symbols using Array.filter instead of Set spread
      const symbolsSet = new Set<string>();
      investments.forEach(inv => symbolsSet.add(inv.symbol));
      const symbols = Array.from(symbolsSet);
      
      // Fetch the latest market data for all symbols
      const { data: marketData, error: marketDataError } = await adminSupabase
        .from('historical_prices')
        .select('*')
        .in('symbol', symbols)
        .order('timestamp', { ascending: false });

      if (marketDataError) {
        console.error('Error fetching market data:', marketDataError);
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
      }

      // Get the most recent price for each symbol
      const latestPriceBySymbol = new Map();
      marketData?.forEach(entry => {
        if (!latestPriceBySymbol.has(entry.symbol) || 
            new Date(entry.timestamp) > new Date(latestPriceBySymbol.get(entry.symbol).timestamp)) {
          latestPriceBySymbol.set(entry.symbol, entry);
        }
      });

      // Calculate portfolio summary metrics
      let portfolioValue = 0;
      let totalInvested = 0;
      let totalGainLoss = 0;
      let dayChange = 0;
      
      // For sectors count, we would need sector information
      // For now, we'll just count unique symbols as a proxy
      const uniqueSymbols = new Set<string>();

      investments.forEach(investment => {
        const latestData = latestPriceBySymbol.get(investment.symbol);
        const currentPrice = latestData?.price || investment.purchase_price;
        
        uniqueSymbols.add(investment.symbol);
        
        const investmentValue = currentPrice * investment.shares;
        const investmentCost = investment.purchase_price * investment.shares;
        const investmentGainLoss = investmentValue - investmentCost;
        
        portfolioValue += investmentValue;
        totalInvested += investmentCost;
        totalGainLoss += investmentGainLoss;
        
        // Calculate day change based on the change percentage from historical data
        if (latestData) {
          const dailyChange = (latestData.change_percentage / 100) * investmentValue;
          dayChange += dailyChange;
        }
      });

      const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
      const dayChangePercentage = portfolioValue > 0 ? (dayChange / portfolioValue) * 100 : 0;

      return NextResponse.json({
        portfolioValue,
        totalGainLoss,
        totalGainLossPercentage,
        dayChange,
        dayChangePercentage,
        totalInvested,
        positions: investments.length,
        stocksCount: uniqueSymbols.size,
        sectors: uniqueSymbols.size // Using symbols count as a proxy for sectors
      });
    } catch (error) {
      console.error('Error in portfolio summary:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
} 