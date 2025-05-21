# Investment Data API Service

This service provides real-time stock and cryptocurrency data using Yahoo Finance APIs. It's built with FastAPI and uses both `yfinance` and `yahooquery` libraries to ensure reliable data fetching.

## Setup

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Installation

1. Clone this repository
2. Navigate to the api directory
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

Create a `.env` file in the api directory with the following variables:

```
PORT=8000
NODE_ENV=development
API_KEY=56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d
```

For production, set:
```
NODE_ENV=production
API_KEY=[your-secure-api-key]
```

### Running the Service

To start the service locally:

```
python main.py
```

## API Endpoints

### GET /api/stocks

Fetches market data for multiple stocks and cryptocurrencies.

**Response format:**
```json
[
  {
    "symbol": "NASDAQ",
    "price": 16500.25,
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

### GET /api/stocks?symbol={symbol}

Fetches market data for a specific stock or cryptocurrency.

**Parameters:**
- `symbol`: Stock or cryptocurrency symbol (e.g., "AAPL", "BTC")

**Response format:**
```json
{
  "price": 191.28,
  "change": 0.83
}
```

### GET /health

Health check endpoint to verify the service is running.

**Response format:**
```json
{
  "status": "healthy",
  "timestamp": "2023-05-21T14:07:39.601234"
}
```

## Authentication

All endpoints require an API key to be sent in the `x-api-key` header.

## Deployment

This service is designed to be deployed on Railway, Heroku, or any other platform that supports Python applications.

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Add environment variables in the Railway dashboard:
   - `PORT`
   - `NODE_ENV`
   - `API_KEY`
3. Railway will automatically deploy the service

## Troubleshooting

If you encounter any issues, check the logs and ensure:

1. The API key is correctly set in both the client and server
2. CORS is properly configured to allow your client domains
3. The Yahoo Finance APIs are accessible (they can sometimes be rate-limited)

## Rate Limiting

The Yahoo Finance APIs have rate limits. This service implements fallback mechanisms between `yfinance` and `yahooquery` libraries, but under heavy usage, you might still encounter rate limits. 