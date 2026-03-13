import os
import json
import time
import logging
from datetime import datetime, timezone
from flask import Flask, jsonify, request
import yfinance as yf
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Supabase/client auth config
# Support legacy env var names used in older docs/deploys.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
API_KEY = os.environ.get("ANALYSIS_SERVICE_API_KEY") or os.environ.get("API_KEY")

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


def config_status():
    """Return non-sensitive runtime config status for diagnostics."""
    return {
        "supabase_url": bool(SUPABASE_URL),
        "supabase_service_role_key": bool(SUPABASE_SERVICE_ROLE_KEY),
        "api_key": bool(API_KEY)
    }

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
    """Fetch latest stock prices via yfinance with retry + per-symbol fallback."""
    results = []
    collected_symbols = set()
    now_iso = datetime.now(timezone.utc).isoformat()

    def build_record(symbol, prices):
        if len(prices) < 1:
            return None
        current_price = float(prices.iloc[-1])
        prev_price = float(prices.iloc[-2]) if len(prices) >= 2 else current_price
        change_pct = ((current_price - prev_price) / prev_price * 100) if prev_price else 0
        return {
            "symbol": symbol,
            "price": round(current_price, 4),
            "change_percentage": round(change_pct, 4),
            "is_market_hours": False,
            "timestamp": now_iso,
            "type": "stock"
        }

    def fetch_stooq_prices(symbol):
        """Fallback: fetch daily history CSV from Stooq."""
        # US-listed equities/ETFs use ".us" on Stooq.
        url = f"https://stooq.com/q/d/l/?s={symbol.lower()}.us&i=d"
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None

        lines = [line.strip() for line in resp.text.splitlines() if line.strip()]
        if len(lines) < 2:
            return None

        # CSV rows: Date,Open,High,Low,Close,Volume
        # Use last two valid closes to estimate daily change.
        closes = []
        for row in lines[1:]:
            parts = row.split(",")
            if len(parts) < 5:
                continue
            close_value = parts[4].strip()
            if not close_value or close_value == "N/D":
                continue
            try:
                closes.append(float(close_value))
            except ValueError:
                continue

        if not closes:
            return None
        return closes

    # 1) Bulk fetch with retries
    bulk_error = None
    for attempt in range(1, 4):
        try:
            tickers = yf.download(
                STOCK_SYMBOLS,
                period="5d",
                interval="1d",
                progress=False,
                auto_adjust=True,
                threads=False
            )
            close = tickers["Close"] if "Close" in tickers.columns else tickers

            for symbol in STOCK_SYMBOLS:
                try:
                    if symbol not in close.columns:
                        continue
                    prices = close[symbol].dropna()
                    record = build_record(symbol, prices)
                    if record:
                        results.append(record)
                        collected_symbols.add(symbol)
                except Exception as e:
                    logger.warning(f"Bulk parse error for {symbol}: {e}")

            if collected_symbols:
                break
        except Exception as e:
            bulk_error = e
            logger.warning(f"Bulk stock fetch attempt {attempt}/3 failed: {e}")
            time.sleep(attempt)

    if not collected_symbols and bulk_error:
        logger.error(f"Bulk stock fetch failed after retries: {bulk_error}")

    # 2) Per-symbol fallback for missing symbols
    missing_symbols = [s for s in STOCK_SYMBOLS if s not in collected_symbols]
    if missing_symbols:
        logger.info(f"Falling back to per-symbol fetch for {len(missing_symbols)} symbols")

    for symbol in missing_symbols:
        try:
            history = yf.Ticker(symbol).history(period="5d", interval="1d", auto_adjust=True)
            if history.empty or "Close" not in history.columns:
                continue
            prices = history["Close"].dropna()
            record = build_record(symbol, prices)
            if record:
                results.append(record)
                collected_symbols.add(symbol)
        except Exception as e:
            logger.warning(f"Fallback fetch failed for {symbol}: {e}")

    # 3) Secondary provider fallback for any still-missing symbols
    still_missing = [s for s in STOCK_SYMBOLS if s not in collected_symbols]
    if still_missing:
        logger.info(f"Falling back to Stooq for {len(still_missing)} symbols")

    for symbol in still_missing:
        try:
            closes = fetch_stooq_prices(symbol)
            if not closes:
                continue
            current_price = closes[-1]
            prev_price = closes[-2] if len(closes) >= 2 else current_price
            change_pct = ((current_price - prev_price) / prev_price * 100) if prev_price else 0
            results.append({
                "symbol": symbol,
                "price": round(current_price, 4),
                "change_percentage": round(change_pct, 4),
                "is_market_hours": False,
                "timestamp": now_iso,
                "type": "stock"
            })
            collected_symbols.add(symbol)
        except Exception as e:
            logger.warning(f"Stooq fallback failed for {symbol}: {e}")

    logger.info(f"Fetched stock prices for {len(collected_symbols)}/{len(STOCK_SYMBOLS)} symbols")
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
        raise ValueError("No price records to upsert")
    try:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        endpoint = f"{SUPABASE_URL}/rest/v1/historical_prices?on_conflict=symbol,timestamp"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal"
        }
        # Keep only columns that exist in historical_prices.
        payload = [
            {
                "symbol": r.get("symbol"),
                "timestamp": r.get("timestamp"),
                "price": r.get("price"),
                "change_percentage": r.get("change_percentage"),
                "is_market_hours": r.get("is_market_hours"),
                "name": r.get("name")
            }
            for r in records
        ]
        response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        if response.status_code >= 300:
            raise RuntimeError(f"Supabase REST upsert failed ({response.status_code}): {response.text}")
        logger.info(f"Upserted {len(payload)} price records")
    except Exception as e:
        logger.error(f"Supabase upsert error: {e}", exc_info=True)
        raise


@app.route("/health")
def health():
    status = config_status()
    overall = "ok" if status["supabase_url"] and status["supabase_service_role_key"] else "degraded"
    return jsonify({
        "status": overall,
        "service": "market-data",
        "config": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@app.route("/api/health")
def api_health():
    """Backward-compatible health endpoint alias."""
    return health()


@app.route("/api/refresh", methods=["POST"])
@require_api_key
def refresh_prices():
    """Fetch latest prices and store in Supabase."""
    stocks = fetch_stock_prices()
    cryptos = fetch_crypto_prices()
    all_records = stocks + cryptos
    if not all_records:
        logger.error("No records fetched from upstream providers")
        return jsonify({
            "success": False,
            "error": "No market records fetched from upstream providers",
            "updated": 0,
            "stocks": 0,
            "cryptos": 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 502

    try:
        upsert_prices(all_records)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to write records to Supabase",
            "details": str(e),
            "updated": 0,
            "stocks": len(stocks),
            "cryptos": len(cryptos),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500

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


@app.route("/api/stock", methods=["GET"])
@require_api_key
def get_stock_alias():
    """Backward-compatible alias for /api/prices."""
    return get_prices()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    if os.environ.get("SUPABASE_KEY") and not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        logger.warning("Using legacy SUPABASE_KEY env var. Prefer SUPABASE_SERVICE_ROLE_KEY.")
    if os.environ.get("API_KEY") and not os.environ.get("ANALYSIS_SERVICE_API_KEY"):
        logger.warning("Using legacy API_KEY env var. Prefer ANALYSIS_SERVICE_API_KEY.")
    logger.info(f"Market Data Service starting on port {port}")
    logger.info(f"Config status: {config_status()}")
    app.run(host="0.0.0.0", port=port)
