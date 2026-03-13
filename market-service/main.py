import os
import json
import time
import logging
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from supabase import create_client, Client
import yfinance as yf
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
API_KEY = os.environ.get("ANALYSIS_SERVICE_API_KEY")

supabase: Client = None

def get_supabase():
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return supabase

def require_api_key(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if API_KEY:
            key = request.headers.get("x-api-key")
            if key != API_KEY:
                return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# Stock symbols to track
STOCK_SYMBOLS = ["SPY", "DIA", "QQQ", "VGK", "EWJ", "EWG",
                  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V"]

# Crypto coin IDs (CoinGecko)
CRYPTO_IDS = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "tether": "USDT",
    "cardano": "ADA",
    "dogecoin": "DOGE"
}

def fetch_stock_prices():
    """Fetch latest stock prices via yfinance."""
    results = []
    try:
        tickers = yf.download(
            STOCK_SYMBOLS,
            period="2d",
            interval="1d",
            progress=False,
            auto_adjust=True
        )
        close = tickers["Close"] if "Close" in tickers.columns else tickers

        for symbol in STOCK_SYMBOLS:
            try:
                if symbol not in close.columns:
                    continue
                prices = close[symbol].dropna()
                if len(prices) < 1:
                    continue

                current_price = float(prices.iloc[-1])
                prev_price = float(prices.iloc[-2]) if len(prices) >= 2 else current_price
                change_pct = ((current_price - prev_price) / prev_price * 100) if prev_price else 0

                results.append({
                    "symbol": symbol,
                    "price": round(current_price, 4),
                    "change_percentage": round(change_pct, 4),
                    "is_market_hours": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "type": "stock"
                })
            except Exception as e:
                logger.warning(f"Error processing {symbol}: {e}")
    except Exception as e:
        logger.error(f"Error fetching stock prices: {e}")
    return results


def fetch_crypto_prices():
    """Fetch crypto prices from CoinGecko (free tier)."""
    results = []
    try:
        ids = ",".join(CRYPTO_IDS.keys())
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd&include_24hr_change=true"
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            logger.error(f"CoinGecko error: {resp.status_code}")
            return results

        data = resp.json()
        for coin_id, ticker_symbol in CRYPTO_IDS.items():
            if coin_id not in data:
                continue
            coin = data[coin_id]
            results.append({
                "symbol": coin_id,  # stored as coin_id so frontend lookup works
                "price": round(coin.get("usd", 0), 6),
                "change_percentage": round(coin.get("usd_24h_change", 0), 4),
                "is_market_hours": True,  # Crypto trades 24/7
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "crypto"
            })
    except Exception as e:
        logger.error(f"Error fetching crypto prices: {e}")
    return results


def upsert_prices(records):
    """Upsert price records into Supabase historical_prices table."""
    if not records:
        return
    try:
        db = get_supabase()
        db.table("historical_prices").upsert(records, on_conflict="symbol,timestamp").execute()
        logger.info(f"Upserted {len(records)} price records")
    except Exception as e:
        logger.error(f"Supabase upsert error: {e}")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "market-data", "timestamp": datetime.now(timezone.utc).isoformat()})


@app.route("/api/refresh", methods=["POST"])
@require_api_key
def refresh_prices():
    """Fetch latest prices and store in Supabase."""
    stocks = fetch_stock_prices()
    cryptos = fetch_crypto_prices()
    all_records = stocks + cryptos
    upsert_prices(all_records)
    return jsonify({
        "success": True,
        "updated": len(all_records),
        "stocks": len(stocks),
        "cryptos": len(cryptos),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@app.route("/api/prices", methods=["GET"])
@require_api_key
def get_prices():
    """Return current prices for all tracked symbols."""
    symbol = request.args.get("symbol")
    stocks = fetch_stock_prices()
    cryptos = fetch_crypto_prices()
    all_data = stocks + cryptos

    if symbol:
        filtered = [p for p in all_data if p["symbol"].upper() == symbol.upper()]
        if not filtered:
            return jsonify({"error": f"No data for {symbol}"}), 404
        return jsonify(filtered[0])

    return jsonify(all_data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Market Data Service starting on port {port}")
    app.run(host="0.0.0.0", port=port)
