# Investment App Architecture

## Tech Stack
- **Frontend Framework**: Next.js 14 (React)
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Hooks
- **API Integration**: REST APIs
- **Real-time Updates**: Supabase Subscriptions
- **Analysis Service**: Express.js Microservice with OpenAI Integration

## Project Structure
```
investmentapp/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for investments, transactions
│   │   ├── analysis/      # Analysis route (forwards to microservice)
│   │   ├── investments/   # Investment management endpoints
│   │   ├── settings/      # User settings endpoints
│   │   └── transactions/  # Transaction management endpoints
│   ├── auth/              # Authentication pages (signin, signup, reset)
│   ├── dashboard/         # Main dashboard
│   ├── portfolio/         # Portfolio analysis
│   ├── transactions/      # Transaction management
│   ├── components/        # Shared components
│   └── layout.tsx         # Root layout
├── lib/                   # Utility functions and configurations
│   ├── supabase/         # Supabase client and utilities
│   ├── middleware/       # Auth and API middleware
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript type definitions
├── analysis-service/      # Investment Analysis Microservice
│   ├── src/              # Service source code
│   │   ├── routes/       # API route handlers
│   │   └── index.js      # Service entry point
│   └── package.json      # Service dependencies
├── middleware.ts         # Auth and routing middleware
├── vercel.json          # Vercel deployment configuration
├── next.config.js       # Next.js configuration
└── public/              # Static assets
```

## Key Components

### Authentication
- Complete Supabase Auth integration
- Protected routes with middleware
- Auth forms for:
  - Sign-in
  - Sign-up
  - Password reset
  - Email verification
- Guest mode support
- Session management

### Dashboard
- Portfolio overview with real-time updates
- Investment tracking with market data integration
- Performance metrics and calculations
- Quick actions for common tasks
- Summary cards with key statistics

### Portfolio Management
- Investment addition/removal
- Real-time price updates
- Gain/loss calculations
- Portfolio diversity tracking
- Transaction history
- Performance analytics

### Investment Analysis Service
- Dedicated microservice for analysis
- OpenAI GPT integration
- Secure API key authentication
- Rate limiting and CORS protection
- Deployed on Railway platform
- Express.js with security middleware

### Data Management
- RESTful API endpoints
- Type-safe database queries
- Real-time market data integration
- Transaction logging
- Error handling and validation
- Microservice communication

## Security Considerations
- Environment variables for sensitive data
- Secure authentication flow
- Protected API routes
- Input validation and sanitization
- CORS configuration
- Session management
- Guest mode isolation
- API key authentication for microservice
- Rate limiting for analysis endpoints

## Performance Optimization
- Static page generation where possible
- Dynamic imports for code splitting
- Real-time data updates
- Caching strategies
- Optimized database queries
- Error boundary implementation
- Edge runtime for compatible routes
- Serverless function optimization
- Memory allocation tuning
- Build output optimization

## Deployment Architecture
### Main Application (Vercel)
- Serverless functions for API routes
- Edge runtime for compatible endpoints
- Memory optimization per route type
- Build output optimization
- Security headers configuration
- Regional deployment (IAD1)

### Analysis Service (Railway)
- Dedicated microservice deployment
- Scalable container architecture
- Environment-specific configurations
- Health monitoring
- Automatic deployments

## Development Practices
- TypeScript for type safety
- Component-driven development
- Custom hooks for reusable logic
- Consistent error handling
- Comprehensive logging
- Clean code architecture
- Microservice separation of concerns
- Environment-based configurations 