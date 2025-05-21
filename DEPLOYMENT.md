# Deployment Guide for Investment Tracker

This application consists of two main components that need to be deployed:

1. **Main Next.js Application**: The main web application deployed on Vercel
2. **Backend Services**: A combined Node.js and Python service containing:
   - **Analysis Service**: The Node.js Express service for AI-powered investment analysis
   - **Market Data API**: The Python FastAPI service for fetching real-time market data

## 1. Backend Services Deployment

The backend now includes both the Analysis Service and the Market Data API in a single repository structure for easier deployment.

### Option 1: Deploy to Railway

1. Push your code to GitHub
2. Sign up for [Railway](https://railway.app/)
3. Create a new project from your GitHub repository
4. In the deployment settings, specify:
   - Root directory: `/analysis-service`
   - Start command: `npm start`
5. Set the following environment variables:
   - `PORT`: `3001`
   - `NODE_ENV`: `production`
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `API_KEY`: `56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d` (or your custom API key)
   - `ALLOWED_ORIGIN`: `*` (or your specific Vercel domain)
6. You'll need to set up a second Railway service for the Python API:
   - In the same project, create a second service
   - Root directory: `/analysis-service/api`
   - Start command: `python main.py`
   - Environment variables:
     - `PORT`: `8000`
     - `NODE_ENV`: `production`
     - `API_KEY`: `56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d` (or your custom API key)
7. Deploy the services and note the URLs for both services

### Option 2: Deploy to Heroku

1. Navigate to the `/analysis-service` directory
2. Create a `Procfile` with the content: `web: npm start`
3. Initialize a git repository (if not already part of one)
4. Create a Heroku app for the Node.js service: `heroku create investment-analysis-service`
5. Set environment variables:
   ```
   heroku config:set PORT=3001
   heroku config:set NODE_ENV=production
   heroku config:set OPENAI_API_KEY=your_openai_api_key
   heroku config:set API_KEY=56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d
   heroku config:set ALLOWED_ORIGIN=*
   ```
6. Deploy: `git push heroku main`
7. For the Python API service, repeat the process in a new Heroku app but point to the `/analysis-service/api` subdirectory

## 2. Main Application Deployment (Next.js on Vercel)

1. Push your code to GitHub
2. Sign up for [Vercel](https://vercel.com/)
3. Create a new project from your GitHub repository
4. Configure the following environment variables:
   - `ANALYSIS_SERVICE_URL`: The URL of your deployed analysis service (e.g., `https://investment-analysis-service-production.up.railway.app`)
   - `ANALYSIS_SERVICE_API_KEY`: `56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d` (or your custom API key)
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `OPENAI_API_KEY`: Your OpenAI API key
5. Deploy the application
6. After deployment, your application will be available at a URL provided by Vercel

## Verifying the Deployment

1. Visit your Vercel app URL to check if the application loads correctly
2. Test the guest login and stock ticker functionality
3. Test adding and viewing investments
4. Check the browser console for any API errors

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Check that your environment variables are set correctly
   - Verify that both microservices are running
   - Check CORS settings if you see cross-origin errors

2. **Authentication Errors**:
   - Ensure the API keys are consistent across all services
   - Check that your Supabase credentials are correct

3. **Market Data Not Loading**:
   - Verify the Python API service is running
   - Check the logs for rate limit errors from Yahoo Finance
   - Ensure the API endpoints are accessible from your main app

4. **Deployment Fails**:
   - Check for missing dependencies in your requirements.txt or package.json
   - Verify that your environment variables are properly set
   - Check the deployment logs for specific error messages

### Checking Service Health

Use these endpoints to verify your services are running:

- Market Data API: `https://your-api-url/health`
- Analysis Service: `https://your-analysis-service-url/health`

## Updating the Deployment

When you make changes to your code:

1. Push the changes to your GitHub repository
2. Vercel will automatically redeploy the main application
3. For the microservices, you may need to manually trigger a redeploy in Railway or Heroku

## Backup and Recovery

1. Regularly backup your Supabase database
2. Keep your environment variables documented securely
3. Ensure your code is backed up in a version control system 