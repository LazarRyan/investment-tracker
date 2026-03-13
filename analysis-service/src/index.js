require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// API key auth middleware
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.ANALYSIS_SERVICE_API_KEY;

  if (!expectedKey) {
    console.warn('ANALYSIS_SERVICE_API_KEY not set — skipping auth');
    return next();
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
  }

  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'investment-analysis', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/analysis', requireApiKey, async (req, res) => {
  try {
    const {
      symbol,
      shares,
      purchase_price,
      current_price,
      gain_loss_percentage,
      custom_prompt
    } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      // Fallback analysis without OpenAI
      const analysis = generateFallbackAnalysis({ symbol, shares, purchase_price, current_price, gain_loss_percentage });
      return res.json({ analysis });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    let prompt;

    if (custom_prompt) {
      // Portfolio-level analysis with custom prompt
      prompt = custom_prompt;
    } else {
      // Individual investment analysis
      const gain = gain_loss_percentage >= 0 ? `up ${gain_loss_percentage.toFixed(2)}%` : `down ${Math.abs(gain_loss_percentage).toFixed(2)}%`;
      prompt = `As a Wall Street investment analyst, provide a concise analysis (2-3 sentences) for this position:

Symbol: ${symbol}
Shares held: ${shares}
Purchase price: $${purchase_price}
Current price: $${current_price}
Performance: ${gain}

Focus on: current performance context, key risks or opportunities, and a brief recommendation.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Wall Street investment analyst providing concise, data-driven portfolio analysis. Be professional, specific, and actionable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    const analysis = completion.choices[0]?.message?.content || 'Analysis unavailable.';
    return res.json({ analysis });

  } catch (error) {
    console.error('Analysis error:', error);

    // If OpenAI fails, return fallback rather than hard error
    if (error.code === 'insufficient_quota' || error.status === 429) {
      const fallback = generateFallbackAnalysis(req.body);
      return res.json({ analysis: fallback });
    }

    return res.status(500).json({ error: 'Failed to generate analysis', details: error.message });
  }
});

function generateFallbackAnalysis({ symbol, gain_loss_percentage }) {
  const perf = gain_loss_percentage || 0;
  if (perf > 15) return `${symbol} is a strong outperformer. Consider taking partial profits while maintaining core position.`;
  if (perf > 5)  return `${symbol} is showing solid gains. Monitor momentum and maintain position.`;
  if (perf > 0)  return `${symbol} is slightly positive. Watch for continued momentum.`;
  if (perf > -5) return `${symbol} is slightly down. Monitor closely for trend reversal.`;
  if (perf > -15) return `${symbol} is underperforming. Review investment thesis and consider position sizing.`;
  return `${symbol} is significantly down. Assess whether fundamentals justify holding or cutting the position.`;
}

app.listen(PORT, () => {
  console.log(`Investment Analysis Service running on port ${PORT}`);
});

module.exports = app;
