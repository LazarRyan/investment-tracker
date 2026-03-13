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

async function getLiveStockFallback(symbol: string): Promise<{ price: number; change_percentage: number } | null> {
  try {
    const url = `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}.us&i=d`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;

    const text = await response.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;

    const closes: number[] = [];
    for (const row of lines.slice(1)) {
      const parts = row.split(',');
      if (parts.length < 5) continue;
      const close = parts[4];
      if (!close || close === 'N/D') continue;
      const parsed = Number(close);
      if (!Number.isFinite(parsed)) continue;
      closes.push(parsed);
    }
    if (closes.length === 0) return null;

    const current = closes[closes.length - 1];
    const prev = closes.length >= 2 ? closes[closes.length - 2] : current;
    const changePct = prev ? ((current - prev) / prev) * 100 : 0;
    return { price: current, change_percentage: changePct };
  } catch (error) {
    console.error(`Live fallback failed for ${symbol}:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  return withAuth(async (supabase, userId) => {
    try {
      // Fetch all investments for the user
      const { data: investments, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .gt('shares', 0); // Only include investments with shares > 0

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
      
      // Normalize symbols to match how historical_prices stores data:
      // - stocks/ETFs in uppercase
      // - supported crypto symbols in lowercase coin ids
      const cryptoSymbols = new Set(['bitcoin', 'ethereum', 'tether', 'cardano', 'dogecoin']);
      const normalizeSymbol = (symbol: string) => {
        const trimmed = (symbol || '').trim();
        return cryptoSymbols.has(trimmed.toLowerCase()) ? trimmed.toLowerCase() : trimmed.toUpperCase();
      };

      const symbolsSet = new Set<string>();
      investments.forEach(inv => symbolsSet.add(normalizeSymbol(inv.symbol)));
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

      const liveCache = new Map<string, { price: number; change_percentage: number } | null>();
      for (const investment of investments) {
        const normalized = normalizeSymbol(investment.symbol);
        let latestData = latestPriceBySymbol.get(normalized);

        if (!latestData) {
          if (!liveCache.has(normalized)) {
            liveCache.set(normalized, await getLiveStockFallback(normalized));
          }
          const live = liveCache.get(normalized);
          if (live) {
            latestData = live;
          }
        }

        const currentPrice = latestData?.price || investment.purchase_price;

        uniqueSymbols.add(investment.symbol);

        const investmentValue = currentPrice * investment.shares;
        const investmentCost = investment.purchase_price * investment.shares;
        const investmentGainLoss = investmentValue - investmentCost;

        portfolioValue += investmentValue;
        totalInvested += investmentCost;
        totalGainLoss += investmentGainLoss;

        // Calculate day change based on percentage where available.
        if (latestData && typeof latestData.change_percentage === 'number') {
          const dailyChange = (latestData.change_percentage / 100) * investmentValue;
          dayChange += dailyChange;
        }
      }

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