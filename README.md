# Investment Tracker

A comprehensive investment portfolio tracking application built with Next.js, featuring real-time market data, AI-powered analysis, and microservices architecture.

## 🚀 Features

- **Portfolio Management**: Track multiple portfolios with detailed investment records
- **Real-time Market Data**: Live stock and cryptocurrency prices with historical data
- **AI-Powered Analysis**: Investment insights powered by OpenAI GPT
- **Guest Mode**: Try the app without creating an account
- **PDF Reports**: Generate professional portfolio reports
- **Mobile Responsive**: Optimized for all device sizes
- **Real-time Updates**: Live portfolio updates using Supabase subscriptions

## 🏗️ Architecture

This application uses a microservices architecture with three main components:

### Main Application (Next.js)
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Authentication**: Supabase Auth with guest mode support
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Deployment**: Vercel

### Market Data Service (Python)
- **Technology**: FastAPI with FMP API and CoinGecko integration
- **Purpose**: Fetches and stores historical market data
- **Features**: Scheduled data collection, caching, real-time updates
- **Deployment**: Railway

### Analysis Service (Node.js)
- **Technology**: Express.js with OpenAI API integration
- **Purpose**: AI-powered investment analysis and insights
- **Features**: Individual and portfolio-level analysis
- **Deployment**: Railway

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Supabase Client

### Backend Services
- **Market Service**: Python, FastAPI, FMP SDK, CoinGecko API
- **Analysis Service**: Node.js, Express.js, OpenAI API
- **Database**: Supabase (PostgreSQL)

### Deployment
- **Main App**: Vercel
- **Microservices**: Railway
- **Database**: Supabase Cloud

## 📋 Prerequisites

- Node.js 14.x or higher
- Python 3.7+
- npm or yarn
- Supabase account
- FMP API key ([Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/))
- OpenAI API key

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd investment-tracker
```

### 2. Main Application Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Configure your environment variables in .env.local
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# MARKET_SERVICE_URL=your_market_service_url
# ANALYSIS_SERVICE_URL=your_analysis_service_url
# API_KEY=your_api_key

# Run the development server
npm run dev
```

### 3. Market Data Service Setup
```bash
cd market-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Configure your environment variables in .env
# FMP_API_KEY=your_fmp_api_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_service_role_key
# API_KEY=your_api_key

# Run the service
python main.py
```

### 4. Analysis Service Setup
```bash
cd analysis-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your environment variables in .env
# OPENAI_API_KEY=your_openai_api_key
# API_KEY=your_api_key
# ALLOWED_ORIGIN=http://localhost:3000

# Run the service
npm run dev
```

### 5. Database Setup
Run the SQL scripts in the `sql/` directory in your Supabase dashboard:
1. `setup.sql` - Main tables and policies
2. `supabase/migrations/20240521000000_create_historical_prices.sql` - Historical data table

## 🌐 Deployment

### Vercel (Main Application)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Railway (Microservices)
1. Connect your GitHub repository to Railway
2. Create separate services for market-service and analysis-service
3. Configure environment variables for each service
4. Deploy automatically on push

### Environment Variables

#### Main Application (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MARKET_SERVICE_URL=https://your-market-service.railway.app
ANALYSIS_SERVICE_URL=https://your-analysis-service.railway.app
API_KEY=your_secure_api_key
```

#### Market Service (.env)
```env
FMP_API_KEY=your_fmp_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
API_KEY=your_secure_api_key
PORT=8000
NODE_ENV=production
```

#### Analysis Service (.env)
```env
OPENAI_API_KEY=your_openai_api_key
API_KEY=your_secure_api_key
ALLOWED_ORIGIN=https://your-app.vercel.app
PORT=3001
NODE_ENV=production
```

## 📊 API Endpoints

### Market Data Service
- `GET /api/stocks` - Get all market data
- `GET /api/stocks?symbol=AAPL` - Get specific stock data
- `GET /api/health` - Health check
- `GET /api/historical/{symbol}` - Get historical data

### Analysis Service
- `POST /api/analysis` - Generate investment analysis
- `GET /health` - Health check

### Main Application
- `GET /api/market-data` - Proxy to market service
- `GET /api/portfolio-analysis` - Portfolio analysis
- `GET /api/investments` - User investments
- `GET /api/transactions` - User transactions

## 🔒 Security

- Row Level Security (RLS) enabled on all database tables
- API key authentication for microservices
- CORS configuration for cross-origin requests
- Rate limiting on analysis service
- Input validation and sanitization

## 📱 Features

### Portfolio Management
- Create and manage multiple portfolios
- Add/edit/delete investments
- Track purchase prices and dates
- View real-time portfolio value

### Market Data
- Real-time stock and cryptocurrency prices
- Historical price charts
- Market indices tracking
- Automatic data updates

### AI Analysis
- Individual investment analysis
- Portfolio-level insights
- Risk assessment
- Performance recommendations

### Reports
- PDF portfolio reports
- Transaction history
- Performance metrics
- Export capabilities

## 🧪 Testing

```bash
# Run tests for main application
npm test

# Test market service
cd market-service
python test_api.py

# Test analysis service
cd analysis-service
npm test
```

## 📚 Documentation

- [Architecture Documentation](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Task Roadmap](TASKS.md)
- [Market Service README](market-service/README.md)
- [Analysis Service README](analysis-service/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the documentation in the `docs/` folder
2. Review the troubleshooting section in individual service READMEs
3. Check the health endpoints for service status
4. Review logs in Vercel and Railway dashboards

## 🔧 Troubleshooting

### Common Issues

1. **Market data not loading**: Check Railway service logs and FMP API key
2. **Analysis not working**: Verify OpenAI API key and credits
3. **Authentication issues**: Check Supabase configuration
4. **CORS errors**: Verify allowed origins in microservice configurations

### Health Checks
- Main app: Check Vercel deployment logs
- Market service: `GET /api/health`
- Analysis service: `GET /health`
- Database: Check Supabase dashboard

## 🚀 Production URLs

- **Main Application**: Deployed on Vercel
- **Market Data Service**: Deployed on Railway
- **Analysis Service**: Deployed on Railway
- **Database**: Supabase Cloud 