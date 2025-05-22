import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv
import logging
from tqdm import tqdm
import time
import random
from requests.exceptions import RequestException
from yahooquery import Ticker
import requests
from urllib.parse import urlencode
import json
import backoff

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from root directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(root_dir, '.env')
load_dotenv(dotenv_path)

# Supabase configuration
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    logger.error(f"Supabase credentials not found in {dotenv_path}")
    raise ValueError("Supabase credentials not configured in environment variables")

logger.info("Successfully loaded Supabase credentials")
supabase = create_client(supabase_url, supabase_key)

# Market symbols configuration - with proper Yahoo Finance symbols
INDICES = {
    "SPY": "SPDR S&P 500 ETF",
    "^GSPC": "S&P 500 Index",
    "QQQ": "Invesco QQQ Trust",
    "^IXIC": "NASDAQ Composite",
    "DIA": "SPDR Dow Jones Industrial Average ETF",
    "^DJI": "Dow Jones Industrial Average"
}

# Note: We'll handle crypto separately as it needs different handling
CRYPTO = {
    "bitcoin": "Bitcoin",
    "ethereum": "Ethereum",
    "tether": "Tether",
    "cardano": "Cardano",
    "dogecoin": "Dogecoin"
}

# User agent rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
]

@backoff.on_exception(backoff.expo, 
                     (requests.exceptions.RequestException, RequestException),
                     max_tries=5,
                     max_time=300)
def verify_symbol(symbol: str):
    """
    Verify if a symbol exists and is valid on Yahoo Finance
    """
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json",
            "Referer": "https://finance.yahoo.com"
        }
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
                logger.info(f"Symbol {symbol} verified successfully")
                return True
        elif response.status_code == 429:
            logger.warning(f"Rate limit hit for {symbol}, backing off...")
            raise requests.exceptions.RequestException("Rate limit exceeded")
        
        logger.warning(f"Symbol {symbol} appears to be invalid")
        return False
        
    except Exception as e:
        logger.error(f"Error verifying symbol {symbol}: {e}")
        raise

def get_stock_data_yfinance(symbol: str, start_date: datetime):
    """
    Fallback method using yfinance
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, interval='1d')
        if not hist.empty:
            logger.info(f"Successfully fetched {len(hist)} data points using yfinance for {symbol}")
            return hist
    except Exception as e:
        logger.error(f"yfinance fetch failed for {symbol}: {e}")
    return pd.DataFrame()

@backoff.on_exception(backoff.expo, 
                     (requests.exceptions.RequestException, RequestException),
                     max_tries=5,
                     max_time=300)
def get_stock_data_direct(symbol: str, start_date: datetime):
    """
    Fetch stock data directly from Yahoo Finance API with improved error handling
    """
    try:
        # Format dates
        start_timestamp = int(start_date.timestamp())
        end_timestamp = int(datetime.now().timestamp())
        
        # Construct URL with parameters
        base_url = "https://query1.finance.yahoo.com/v8/finance/chart/"
        params = {
            "symbol": symbol,
            "period1": start_timestamp,
            "period2": end_timestamp,
            "interval": "1d",
            "includePrePost": False,
            "events": "div,splits"
        }
        
        url = f"{base_url}{symbol}?{urlencode(params)}"
        
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json",
            "Referer": "https://finance.yahoo.com"
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if "chart" not in data or "result" not in data["chart"] or not data["chart"]["result"]:
            logger.warning(f"No data available for {symbol}")
            return pd.DataFrame()
        
        result = data["chart"]["result"][0]
        
        if not result.get("timestamp") or not result.get("indicators", {}).get("quote", [{}])[0].get("close"):
            logger.warning(f"Missing required data for {symbol}")
            return pd.DataFrame()
            
        timestamps = pd.to_datetime(result["timestamp"], unit="s")
        
        df = pd.DataFrame({
            "open": result["indicators"]["quote"][0].get("open", []),
            "high": result["indicators"]["quote"][0].get("high", []),
            "low": result["indicators"]["quote"][0].get("low", []),
            "close": result["indicators"]["quote"][0].get("close", []),
            "volume": result["indicators"]["quote"][0].get("volume", [])
        }, index=timestamps)
        
        df = df.dropna()
        
        if df.empty:
            logger.warning(f"No valid data points for {symbol} after cleaning")
        else:
            logger.info(f"Successfully fetched {len(df)} data points for {symbol}")
            
        return df
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            logger.warning(f"Rate limit hit for {symbol}, backing off...")
            raise
        logger.error(f"HTTP error fetching data for {symbol}: {e}")
        return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error fetching direct data for {symbol}: {e}")
        return pd.DataFrame()

def fetch_stock_data_with_retry(symbol: str, start_date: datetime, max_retries: int = 5):
    """
    Fetch stock data with multiple fallback methods and retries
    """
    methods = [
        (get_stock_data_direct, "direct API"),
        (lambda s, d: Ticker(s).history(start=d.strftime('%Y-%m-%d')), "yahooquery"),
        (get_stock_data_yfinance, "yfinance")
    ]
    
    last_error = None
    for method, method_name in methods:
        try:
            logger.info(f"Attempting to fetch data for {symbol} using {method_name}")
            hist_data = method(symbol, start_date)
            
            if isinstance(hist_data, pd.DataFrame) and not hist_data.empty:
                if isinstance(hist_data.index, pd.MultiIndex):
                    hist_data = hist_data.reset_index()
                    hist_data = hist_data[hist_data['symbol'] == symbol]
                    hist_data = hist_data.set_index('date')
                return hist_data
            
            logger.warning(f"No data returned for {symbol} using {method_name}")
            time.sleep(random.uniform(5, 10))
            
        except Exception as e:
            last_error = e
            logger.warning(f"Method {method_name} failed for {symbol}: {str(e)}")
            time.sleep(random.uniform(10, 20))
    
    if last_error:
        logger.error(f"All methods failed for {symbol}. Last error: {str(last_error)}")
    return pd.DataFrame()

def is_market_hours(timestamp):
    """
    Check if the given timestamp is during market hours (9:30 AM - 4:00 PM ET, weekdays)
    """
    try:
        # First localize to UTC if timestamp is naive
        if timestamp.tzinfo is None:
            timestamp = pd.Timestamp(timestamp).tz_localize('UTC')
        
        # Convert to US/Eastern
        dt = timestamp.tz_convert('US/Eastern')
        return (
            dt.weekday() < 5 and  # Monday = 0, Friday = 4
            dt.hour >= 9 and
            (dt.hour < 16 or (dt.hour == 9 and dt.minute >= 30))
        )
    except Exception as e:
        logger.warning(f"Error checking market hours: {e}")
        return True  # Default to True if we can't determine

def fetch_and_store_stock_data(symbol: str, name: str, start_date: datetime):
    """
    Fetch historical data for a stock/ETF and store it in Supabase
    """
    try:
        hist = fetch_stock_data_with_retry(symbol, start_date)
        
        if hist.empty:
            logger.warning(f"No data found for {symbol}")
            return 0
        
        records = []
        for index, row in hist.iterrows():
            try:
                timestamp = pd.Timestamp(index)
                if timestamp.tzinfo is None:
                    timestamp = timestamp.tz_localize('UTC')
                
                record = {
                    "symbol": symbol,
                    "name": name,
                    "timestamp": timestamp.isoformat(),
                    "price": float(row.get('close', row.get('adjclose', 0))),
                    "change_percentage": float(((row.get('close', 0) - row.get('open', 0)) / row.get('open', 1)) * 100),
                    "is_market_hours": is_market_hours(timestamp)
                }
                records.append(record)
            except Exception as e:
                logger.error(f"Error processing row for {symbol}: {e}")
                continue
        
        if not records:
            logger.warning(f"No valid records to insert for {symbol}")
            return 0
        
        # Insert in smaller batches with longer delays
        batch_size = 25
        total_inserted = 0
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                result = supabase.table("historical_prices").upsert(
                    batch,
                    on_conflict="symbol,timestamp"
                ).execute()
                total_inserted += len(batch)
                logger.debug(f"Inserted batch of {len(batch)} records for {symbol}")
                time.sleep(random.uniform(1, 2))  # Random delay between batches
            except Exception as e:
                logger.error(f"Error inserting batch for {symbol}: {e}")
                time.sleep(random.uniform(2, 4))  # Longer delay after error
        
        return total_inserted
    
    except Exception as e:
        logger.error(f"Error processing {symbol}: {e}")
        return 0

def main():
    # Calculate start date (5 years ago)
    start_date = datetime.now() - timedelta(days=5*365)
    
    logger.info(f"Starting historical data population from {start_date}")
    total_records = 0
    
    # First verify all symbols
    logger.info("Verifying symbols...")
    valid_symbols = {}
    for symbol, name in INDICES.items():
        if verify_symbol(symbol):
            valid_symbols[symbol] = name
        else:
            logger.warning(f"Skipping invalid symbol: {symbol}")
        time.sleep(random.uniform(3, 5))  # Random delay between verifications
    
    if not valid_symbols:
        logger.error("No valid symbols found. Exiting.")
        return
    
    # Process verified symbols with increased delays
    logger.info("Processing verified symbols...")
    for symbol, name in tqdm(valid_symbols.items()):
        logger.info(f"Processing {symbol}...")
        count = fetch_and_store_stock_data(symbol, name, start_date)
        total_records += count
        logger.info(f"Processed {symbol}: {count} records")
        time.sleep(random.uniform(8, 12))  # Random delay between symbols
    
    logger.info(f"\nTotal records inserted: {total_records}")
    logger.info("Historical data population complete!")

if __name__ == "__main__":
    main() 