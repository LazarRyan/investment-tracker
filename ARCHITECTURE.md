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

## Project Structure
```
investmentapp/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for investments, transactions
│   ├── auth/              # Authentication pages (signin, signup, reset)
│   ├── dashboard/         # Main dashboard
│   ├── portfolio/         # Portfolio analysis
│   ├── transactions/      # Transaction management
│   ├── components/        # Shared components
│   └── layout.tsx         # Root layout
├── lib/                   # Utility functions and configurations
│   ├── supabase/         # Supabase client and utilities
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript type definitions
├── middleware.ts         # Auth and routing middleware
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

### Data Management
- RESTful API endpoints
- Type-safe database queries
- Real-time market data integration
- Transaction logging
- Error handling and validation

## Security Considerations
- Environment variables for sensitive data
- Secure authentication flow
- Protected API routes
- Input validation and sanitization
- CORS configuration
- Session management
- Guest mode isolation

## Performance Optimization
- Static page generation where possible
- Dynamic imports for code splitting
- Real-time data updates
- Caching strategies
- Optimized database queries
- Error boundary implementation

## Development Practices
- TypeScript for type safety
- Component-driven development
- Custom hooks for reusable logic
- Consistent error handling
- Comprehensive logging
- Clean code architecture 