# Investment Data API Service

This service provides real-time stock and cryptocurrency data using Financial Modeling Prep (FMP) and CoinGecko APIs. It's built with FastAPI and implements robust caching mechanisms to ensure reliable data delivery.

## Location

This service is located within the `analysis-service/api` directory. It is deployed separately from the Next.js app but maintained within the same repository structure.

## Setup

### Prerequisites

- Python 3.7+
- pip (Python package manager)
- FMP API key (get one from [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/))

### Installation

1. Clone this repository
2. Navigate to the `analysis-service/api` directory
3. Set up a virtual environment:
   ```
   python -m venv venv
   ```
4. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
5. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

### Configuration

Create a `.env` file in the `analysis-service/api` directory with the following variables (or copy from .env.example):

```
PORT=8000
NODE_ENV=development
API_KEY=your_api_key_here
FMP_API_KEY=your_fmp_api_key_here
```

For production, set:
```
NODE_ENV=production
API_KEY=[your-secure-api-key]
FMP_API_KEY=[your-fmp-api-key]
```

### Running the Service

To start the service locally:

```
python main.py
```

Or use the provided run.bat (Windows) script.

For development with auto-reload:
```
uvicorn main:app --reload
```

## API Endpoints

### GET /api/stocks or /api/stock

Fetches market data for multiple stocks and cryptocurrencies. Returns both indices and major cryptocurrencies.

**Response format:**
```json
[
  {
    "symbol": "S&P 500",
    "price": 5123.25,
    "change": 0.75,
    "type": "index"
  },
  {
    "symbol": "Bitcoin",
    "price": 65432.12,
    "change": 2.34,
    "type": "crypto"
  }
]
```

### GET /api/stocks?symbol={symbol} or /api/stock?symbol={symbol}

Fetches market data for a specific stock or cryptocurrency.

**Parameters:**
- `symbol`: Stock or cryptocurrency symbol (e.g., "AAPL", "BTC")

**Response format:**
```json
{
  "price": 191.28,
  "change": 0.83,
  "name": "Apple Inc"
}
```

### GET /api/health

Health check endpoint to verify the service is running. This endpoint does not require API key verification.

**Response format:**
```json
{
  "status": "healthy",
  "timestamp": "2023-05-21T14:07:39.601234",
  "api_version": "1.0.0",
  "environment": "development",
  "cors": {
    "allowed_origins": ["https://example.com", "http://localhost:3000"]
  },
  "services": {
    "fmp": {
      "status": "connected",
      "response_time_ms": 154.02
    },
    "coingecko": {
      "status": "connected",
      "response_time_ms": 139.79
    }
  },
  "cache": {
    "memory_cache": {
      "stocks": 6,
      "crypto": 5
    },
    "persistent_cache": {
      "directory": ".cache",
      "file_count": 11
    }
  }
}
```

### GET /api/cache-status

Returns detailed information about the cache status.

**Response format:**
```json
{
  "status": "ok",
  "memory_cache": {
    "stocks": 6,
    "crypto": 5
  },
  "persistent_cache": {
    "directory": ".cache",
    "files": [
      {
        "name": "stock_aapl.json",
        "size_bytes": 123,
        "last_modified": "2023-05-21T14:07:39.601234"
      }
    ]
  },
  "timestamp": "2023-05-21T14:07:39.601234"
}
```

### GET /

Root endpoint providing information about available endpoints.

**Response format:**
```json
{
  "service": "Investment Tracker API Service",
  "version": "1.0.0",
  "available_endpoints": [
    "/api/stocks or /api/stock - Get stock data (with optional symbol parameter)",
    "/api/health - API health check",
    "/api/cache-status - Cache information"
  ],
  "documentation": "See the README.md file for more details",
  "timestamp": "2023-05-21T14:07:39.601234"
}
```

## Authentication

Endpoints require an API key to be sent in the `x-api-key` header, except for the `/api/health` endpoint which is publicly accessible for status monitoring.

In development mode (`NODE_ENV=development`), the API key check is skipped to make local testing easier.

## Caching

This service implements both memory and persistent caching:

- Stock data is cached for 15 minutes
- Cryptocurrency data is cached for 5 minutes
- Cache persists between service restarts in the `.cache` directory

## Deployment

This service is designed to be deployed separately from the Next.js app. For detailed instructions, see the main DEPLOYMENT.md file.

## Testing

To test the API:

```
python test_api.py
```

This will start a test server on a different port and verify all endpoints are working correctly.

## Troubleshooting

If you encounter any issues, check the logs and ensure:

1. The API key is correctly set in both the client and server
2. CORS is properly configured to allow your client domains
3. FMP and CoinGecko APIs are accessible and your API keys are valid
4. Check the `/api/health` endpoint for service status 