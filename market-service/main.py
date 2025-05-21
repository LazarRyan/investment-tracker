from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import fmpsdk
from pycoingecko import CoinGeckoAPI
import pandas as pd
from typing import List, Dict, Union, Optional, Any
from datetime import datetime, timedelta
import requests
import logging
import os
import time
import json
from functools import lru_cache
from dotenv import load_dotenv
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import uuid

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Investment Data API", description="API for fetching stock and crypto data")

# Add request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        logger.info(f"[{request_id}] Request: {request.method} {request.url}")
        
        # Log headers in development mode
        if os.getenv("NODE_ENV") == "development":
            headers = dict(request.headers.items())
            # Mask sensitive headers
            if "authorization" in headers:
                headers["authorization"] = "********"
            if "x-api-key" in headers:
                headers["x-api-key"] = "********"
            logger.debug(f"[{request_id}] Headers: {headers}")
        
        # Process the request
        try:
            response = await call_next(request)
            logger.info(f"[{request_id}] Response: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"[{request_id}] Error processing request: {str(e)}")
            raise e

# Add the middleware after creating the app but before other middleware
app.add_middleware(RequestLoggingMiddleware)

# Get API keys from environment variables with fallbacks
API_KEY = os.getenv("API_KEY", "default_api_key_for_development")
FMP_API_KEY = os.getenv("FMP_API_KEY")

if not FMP_API_KEY:
    logger.warning("FMP_API_KEY not found in environment variables. Stock data will be limited.")

# Set up API clients
cg = CoinGeckoAPI()  # CoinGecko doesn't need an API key for basic usage

# Define allowed origins for CORS
allowed_origins = [
    "https://investment-tracker-tau.vercel.app",    # Production domain
    "https://investment-tracker.vercel.app",        # Base Vercel domain
    "https://investment-tracker-git-main.vercel.app", # Main branch preview
    "https://*.vercel.app",                         # All Vercel preview deployments
    "http://localhost:3000",                        # Local development
    "http://localhost:8000",                        # Local API testing
]

# Add CORS middleware with proper production configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-api-key"],
    expose_headers=["Content-Length"],
    max_age=600,  # 10 minutes cache for preflight requests
)

# Define the standard market indices we want to track (using ETFs as proxies)
INDICES = {
    "SPY": "S&P 500",     # S&P 500 ETF
    "QQQ": "NASDAQ",      # NASDAQ ETF
    "DIA": "DOW",         # Dow Jones ETF
    "EFA": "FTSE",        # FTSE Developed Markets ETF
    "EWJ": "Nikkei",      # Japan ETF (closely follows Nikkei)
    "EWG": "DAX"          # Germany ETF (closely follows DAX)
}

# Define cryptocurrencies to track
CRYPTO = {
    "bitcoin": "Bitcoin",
    "ethereum": "Ethereum",
    "tether": "Tether",
    "cardano": "Cardano",
    "dogecoin": "Dogecoin"
}

# Caching configuration
STOCK_CACHE_TTL = 900  # 15 minutes in seconds
CRYPTO_CACHE_TTL = 300  # 5 minutes in seconds
stock_cache = {}
crypto_cache = {}

# Add better caching with persistent storage
class PersistentCache:
    """Cache that persists to disk between service restarts"""
    
    def __init__(self, cache_dir: str = None):
        # In production environments like Railway, use /tmp for cache
        if cache_dir is None:
            if os.getenv("NODE_ENV") == "production":
                cache_dir = "/tmp/investment-api-cache"
            else:
                cache_dir = '.cache'
                
        self.cache_dir = cache_dir
        
        # Create cache directory if it doesn't exist
        try:
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
            logger.info(f"Using persistent cache in {cache_dir}")
        except Exception as e:
            logger.error(f"Failed to create cache directory: {e}")
    
    def get(self, key: str, ttl_seconds: int) -> Optional[Dict]:
        """Get value from cache if it exists and is not expired"""
        try:
            cache_file = os.path.join(self.cache_dir, f"{key}.json")
            if not os.path.exists(cache_file):
                return None
                
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
            
            # Check if cache is expired
            timestamp = cache_data.get('timestamp', 0)
            if (datetime.now() - datetime.fromtimestamp(timestamp)).total_seconds() > ttl_seconds:
                logger.debug(f"Cache expired for {key}")
                return None
                
            logger.info(f"Cache hit for {key}")
            return cache_data.get('data')
        except Exception as e:
            logger.error(f"Error reading from cache: {e}")
            return None
    
    def set(self, key: str, data: Any) -> None:
        """Store value in cache with current timestamp"""
        try:
            cache_file = os.path.join(self.cache_dir, f"{key}.json")
            cache_data = {
                'timestamp': datetime.now().timestamp(),
                'data': data
            }
            
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f)
                
            logger.info(f"Cached data for {key}")
        except Exception as e:
            logger.error(f"Error writing to cache: {e}")

# Initialize the persistent cache
persistent_cache = PersistentCache()

# API Key dependency for routes that require authentication
async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    # Skip API key verification in development mode
    if os.getenv("NODE_ENV") == "development":
        return True
        
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key header is missing")
    
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    return True

def get_from_cache(cache, key, ttl):
    """Get data from cache if not expired"""
    # First try memory cache
    if key in cache:
        timestamp, data = cache[key]
        if time.time() - timestamp < ttl:
            logger.info(f"Memory cache hit for {key}")
            return data
    
    # Then try persistent cache
    return persistent_cache.get(key, ttl)

def add_to_cache(cache, key, data):
    """Add data to both memory and persistent cache"""
    # Add to memory cache
    cache[key] = (time.time(), data)
    
    # Add to persistent cache
    persistent_cache.set(key, data)
    
    return data

def get_stock_data(symbol: str) -> Dict:
    """
    Fetch stock data from Financial Modeling Prep API
    """
    try:
        # Create a stable key for caching
        cache_key = f"stock_{symbol.lower()}"
        
        # Check cache first
        cached_data = get_from_cache(stock_cache, cache_key, STOCK_CACHE_TTL)
        if cached_data:
            return cached_data
            
        # Get current quote
        quote = fmpsdk.quote(FMP_API_KEY, symbol)
        if not quote or len(quote) == 0:
            logger.warning(f"No valid quote data for {symbol}")
            return None
            
        quote_data = quote[0]  # FMP returns a list
        
        # Get basic profile info
        try:
            profile = fmpsdk.company_profile(FMP_API_KEY, symbol)
            if profile and len(profile) > 0:
                profile_data = profile[0]
            else:
                profile_data = {}
        except Exception as profile_error:
            logger.warning(f"Could not get company profile for {symbol}: {str(profile_error)}")
            profile_data = {}
        
        current_price = quote_data.get('price', 0)
        previous_close = quote_data.get('previousClose', 0)
        
        # Calculate price change
        if previous_close > 0:
            price_change = ((current_price - previous_close) / previous_close) * 100
        else:
            price_change = quote_data.get('changesPercentage', 0)
            
        result = {
            "price": current_price,
            "change": price_change,
            "name": profile_data.get('companyName', quote_data.get('name', ''))
        }
        
        # Cache the result
        return add_to_cache(stock_cache, cache_key, result)
        
    except Exception as e:
        logger.error(f"Error fetching stock data for {symbol}: {str(e)}")
        return None

def get_crypto_data(coin_id: str) -> Dict:
    """
    Fetch cryptocurrency data from CoinGecko API
    """
    try:
        # Create a stable key for caching
        cache_key = f"crypto_{coin_id.lower()}"
        
        # If given a symbol instead of id, try to convert
        if coin_id.upper() in ["BTC", "BITCOIN"]:
            coin_id = "bitcoin"
        elif coin_id.upper() in ["ETH", "ETHEREUM"]:
            coin_id = "ethereum"
        elif coin_id.upper() in ["USDT", "TETHER"]:
            coin_id = "tether"
        elif coin_id.upper() in ["ADA", "CARDANO"]:
            coin_id = "cardano"
        elif coin_id.upper() in ["DOGE", "DOGECOIN"]:
            coin_id = "dogecoin"
            
        # Check cache first
        cached_data = get_from_cache(crypto_cache, cache_key, CRYPTO_CACHE_TTL)
        if cached_data:
            return cached_data
        
        # Get current data from CoinGecko
        coin_data = cg.get_coin_by_id(
            id=coin_id,
            localization='false',
            tickers=False,
            market_data=True,
            community_data=False,
            developer_data=False,
            sparkline=False
        )
        
        if not coin_data or 'market_data' not in coin_data:
            logger.warning(f"No valid data for crypto {coin_id}")
            return None
        
        market_data = coin_data['market_data']
        current_price = market_data['current_price']['usd']
        price_change_24h = market_data['price_change_percentage_24h'] or 0
            
        result = {
            "price": current_price,
            "change": price_change_24h
        }
        
        # Cache the result
        return add_to_cache(crypto_cache, cache_key, result)
        
    except Exception as e:
        logger.error(f"Error fetching crypto data for {coin_id}: {str(e)}")
        return None

def is_crypto(symbol: str) -> bool:
    """Check if a symbol is likely a cryptocurrency"""
    symbol = symbol.lower()
    # Common crypto prefixes/suffixes and keywords
    crypto_indicators = [
        'btc', 'eth', 'usdt', 'xrp', 'ada', 'sol', 'doge', 'dot', 'shib',
        'bitcoin', 'ethereum', 'tether', 'ripple', 'cardano', 'solana',
        'dogecoin', 'polkadot'
    ]
    return any(indicator == symbol or symbol.startswith(indicator) or symbol.endswith(indicator) 
              for indicator in crypto_indicators)

@app.get("/api/stocks")
@app.get("/api/stock")  # Add an alias for singular form
async def get_stocks(request: Request, symbol: str = None):
    """
    Get stock or crypto data - either for a specific symbol or an overview of indices and cryptos
    """
    try:
        # Optionally verify API key in non-development environments
        if os.getenv("NODE_ENV") != "development":
            # Get API key from header
            api_key = request.headers.get("x-api-key")
            if not api_key or api_key != API_KEY:
                raise HTTPException(status_code=401, detail="Invalid or missing API key")
                
        # If a specific symbol is requested
        if symbol:
            # Determine if it's likely a crypto or stock
            data = None
            
            if is_crypto(symbol):
                # Try as cryptocurrency
                data = get_crypto_data(symbol)
            else:
                # Try as stock
                data = get_stock_data(symbol)
                
            # If first attempt fails, try the other type
            if not data and not is_crypto(symbol):
                data = get_crypto_data(symbol)
            elif not data and is_crypto(symbol):
                data = get_stock_data(symbol)
            
            if data:
                return data
                
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")

        # Otherwise return market overview data
        market_data = []
        
        # Process indices
        for symbol, name in INDICES.items():
            data = get_stock_data(symbol)
            if data:
                market_data.append({
                    "symbol": name,
                    "price": round(data["price"], 2),
                    "change": round(data["change"], 2),
                    "type": "index"
                })
        
        # Process crypto
        for coin_id, name in CRYPTO.items():
            data = get_crypto_data(coin_id)
            if data:
                price = data["price"]
                # Format crypto prices
                if price < 1:
                    price = round(price, 4)
                elif price < 100:
                    price = round(price, 2)
                else:
                    price = round(price, 0)
                
                market_data.append({
                    "symbol": name,
                    "price": price,
                    "change": round(data["change"], 2),
                    "type": "crypto"
                })
        
        return market_data
    except HTTPException:
        # Re-raise HTTP exceptions as they contain status codes and details
        raise
    except Exception as e:
        logger.error(f"Error in get_stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a more detailed health check endpoint
@app.get("/api/health")
async def api_health_check():
    """
    Detailed health check endpoint with connection and configuration information.
    This endpoint doesn't require API key verification to make it easier to diagnose issues.
    """
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "api_version": "1.0.0",
        "environment": os.getenv("NODE_ENV", "development"),
        "cors": {
            "allowed_origins": allowed_origins,
        },
        "services": {}
    }
    
    # Check FMP connection
    try:
        start_time = time.time()
        fmp_data = fmpsdk.quote(FMP_API_KEY, "AAPL")
        response_time = time.time() - start_time
        status["services"]["fmp"] = {
            "status": "connected" if fmp_data else "error",
            "response_time_ms": round(response_time * 1000, 2)
        }
    except Exception as e:
        logger.error(f"FMP connection error: {str(e)}")
        status["services"]["fmp"] = {
            "status": "error",
            "error": str(e)
        }
    
    # Check CoinGecko connection
    try:
        start_time = time.time()
        cg_ping = cg.ping()
        response_time = time.time() - start_time
        status["services"]["coingecko"] = {
            "status": "connected" if cg_ping else "error",
            "response_time_ms": round(response_time * 1000, 2)
        }
    except Exception as e:
        logger.error(f"CoinGecko connection error: {str(e)}")
        status["services"]["coingecko"] = {
            "status": "error",
            "error": str(e)
        }
    
    # Add cache information
    status["cache"] = {
        "memory_cache": {
            "stocks": len(stock_cache),
            "crypto": len(crypto_cache)
        },
        "persistent_cache": {
            "directory": persistent_cache.cache_dir,
            "file_count": len([f for f in os.listdir(persistent_cache.cache_dir) 
                              if f.endswith('.json')]) if os.path.exists(persistent_cache.cache_dir) else 0
        }
    }
        
    return status

# Add a new endpoint to check cache status
@app.get("/api/cache-status")
async def cache_status():
    """
    Returns information about the cache status
    """
    try:
        status = {
            "status": "ok",
            "memory_cache": {
                "stocks": len(stock_cache),
                "crypto": len(crypto_cache)
            },
            "persistent_cache": {
                "directory": persistent_cache.cache_dir,
                "files": []
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Get list of cache files
        try:
            cache_files = os.listdir(persistent_cache.cache_dir)
            for file in cache_files:
                if file.endswith('.json'):
                    file_path = os.path.join(persistent_cache.cache_dir, file)
                    size = os.path.getsize(file_path)
                    mtime = os.path.getmtime(file_path)
                    status["persistent_cache"]["files"].append({
                        "name": file,
                        "size_bytes": size,
                        "last_modified": datetime.fromtimestamp(mtime).isoformat()
                    })
        except Exception as e:
            status["persistent_cache"]["error"] = str(e)
            
        return status
    except Exception as e:
        logger.error(f"Error in cache status endpoint: {e}")
        return {"status": "error", "message": str(e)}

# Add a root endpoint for better discovery
@app.get("/")
async def root():
    """
    Root endpoint providing information about available endpoints
    """
    return {
        "service": "Investment Tracker API Service",
        "version": "1.0.0",
        "available_endpoints": [
            "/api/stocks or /api/stock - Get stock data (with optional symbol parameter)",
            "/api/health - API health check",
            "/api/cache-status - Cache information",
        ],
        "documentation": "See the README.md file for more details",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 