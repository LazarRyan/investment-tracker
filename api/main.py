from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from yahooquery import Ticker
from typing import List, Dict, Union
from datetime import datetime, timedelta
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom headers and session setup for Yahoo Finance
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
}

session = requests.Session()
session.headers.update(HEADERS)
yf.pdr_override()

INDICES = {
    "^IXIC": "NASDAQ",
    "^DJI": "DOW",
    "^GSPC": "S&P 500",
    "^FTSE": "FTSE 100",
    "^N225": "Nikkei 225",
    "^GDAXI": "DAX"
}

CRYPTO = {
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "USDT-USD": "Tether",
    "ADA-USD": "Cardano",
    "DOGE-USD": "Dogecoin"
}

def get_stock_data(symbol: str) -> Dict:
    try:
        # Try yahooquery first
        ticker = Ticker(symbol)
        info = ticker.summary_detail
        
        if symbol not in info:
            raise Exception("No data from yahooquery")
            
        summary = info[symbol]
        
        # Get historical data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=2)
        hist = ticker.history(start=start_date.strftime('%Y-%m-%d'), end=end_date.strftime('%Y-%m-%d'))
        
        if hist.empty:
            raise Exception("No historical data from yahooquery")
            
        current_price = float(hist['close'].iloc[-1])
        previous_close = float(hist['close'].iloc[0]) if len(hist) > 1 else current_price
        
    except Exception as yahooquery_error:
        logger.warning(f"Yahooquery failed for {symbol}, trying yfinance. Error: {str(yahooquery_error)}")
        try:
            # Fallback to yfinance
            stock = yf.Ticker(symbol, session=session)
            hist = stock.history(period="2d", interval="1d")
            
            if len(hist) < 1:
                logger.error(f"No historical data for {symbol}")
                return None
                
            current_price = float(hist['Close'].iloc[-1])
            previous_close = float(hist['Close'].iloc[0]) if len(hist) > 1 else current_price
            
        except Exception as yf_error:
            logger.error(f"Both data sources failed for {symbol}. YFinance error: {str(yf_error)}")
            return None
    
    try:
        if current_price > 0 and previous_close > 0:
            price_change = ((current_price - previous_close) / previous_close) * 100
            return {
                "price": current_price,
                "change": price_change
            }
    except Exception as e:
        logger.error(f"Error calculating price change for {symbol}: {str(e)}")
        
    return None

def get_crypto_data(symbol: str) -> Dict:
    try:
        # Add -USD suffix if not already present
        if not symbol.endswith('-USD'):
            crypto_symbol = f"{symbol}-USD"
        else:
            crypto_symbol = symbol
            
        # Try yahooquery first
        ticker = Ticker(crypto_symbol)
        info = ticker.summary_detail
        
        if crypto_symbol not in info:
            # Try alternative suffix
            crypto_symbol = f"{symbol.split('-')[0]}-USDT"
            ticker = Ticker(crypto_symbol)
            info = ticker.summary_detail
            
            if crypto_symbol not in info:
                raise Exception("No data from yahooquery")
        
        # Get historical data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=2)
        hist = ticker.history(start=start_date.strftime('%Y-%m-%d'), end=end_date.strftime('%Y-%m-%d'))
        
        if hist.empty:
            raise Exception("No historical data from yahooquery")
            
        current_price = float(hist['close'].iloc[-1])
        previous_close = float(hist['close'].iloc[0]) if len(hist) > 1 else current_price
        
    except Exception as yahooquery_error:
        logger.warning(f"Yahooquery failed for {symbol}, trying yfinance. Error: {str(yahooquery_error)}")
        try:
            # Fallback to yfinance
            crypto = yf.Ticker(symbol, session=session)
            hist = crypto.history(period="2d", interval="1d")
            
            if len(hist) < 1:
                logger.error(f"No historical data for crypto {symbol}")
                return None
                
            current_price = float(hist['Close'].iloc[-1])
            previous_close = float(hist['Close'].iloc[0]) if len(hist) > 1 else current_price
            
        except Exception as yf_error:
            logger.error(f"Both data sources failed for {symbol}. YFinance error: {str(yf_error)}")
            return None
    
    try:
        if current_price > 0 and previous_close > 0:
            price_change = ((current_price - previous_close) / previous_close) * 100
            return {
                "price": current_price,
                "change": price_change
            }
    except Exception as e:
        logger.error(f"Error calculating price change for {symbol}: {str(e)}")
        
    return None

@app.get("/api/stocks")
async def get_stocks(symbol: str = None) -> Union[Dict, List[Dict]]:
    try:
        # If a specific symbol is requested
        if symbol:
            data = get_stock_data(symbol)
            if data:
                return data
            # Try crypto if stock data not found
            data = get_crypto_data(symbol)
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
        for symbol, name in CRYPTO.items():
            data = get_crypto_data(symbol)
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
    except Exception as e:
        logger.error(f"Error in get_stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 