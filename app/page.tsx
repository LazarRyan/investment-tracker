'use client';

import { useRouter } from 'next/navigation';
import StockTicker from './components/StockTicker';

const quotes = [
  {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett"
  },
  {
    text: "In investing, what is comfortable is rarely profitable.",
    author: "Robert Arnott"
  }
];

export default function Home() {
  const router = useRouter();

  const handleGuestMode = async () => {
    try {
      const response = await fetch('/api/guest', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to set up guest mode:', error);
        // You might want to show an error message to the user here
        return;
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to set up guest mode:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleGetStarted = () => {
    router.push('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-[#1a1f35] to-[#0f172a]">
      {/* Stock Ticker */}
      <div className="border-b border-gray-800">
      <StockTicker />
      </div>

      {/* Hero Section */}
      <div className="relative isolate">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#6495ED] to-[#4169E1] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        {/* Main content */}
        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Track Your Investments
              <span className="block text-[#6495ED]">with Ease</span>
          </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto">
              Your personal investment dashboard for monitoring performance, analyzing trends, and making informed decisions in real-time.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={handleGetStarted}
                className="rounded-lg bg-[#6495ED] px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#4169E1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6495ED] transition-all relative z-10"
              >
                Get Started
              </button>
              <button
                onClick={handleGuestMode}
                className="rounded-lg bg-white/10 backdrop-blur-sm px-5 py-3 text-base font-semibold text-white hover:bg-white/20 transition-all relative z-10 border border-white/20"
              >
                Try as Guest
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              No account required for guest mode. Your data will not be saved.
            </p>
          </div>
        </div>

        {/* Quotes Section */}
        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 border-t border-white/10">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="grid gap-8 lg:grid-cols-2">
              {quotes.map((quote, index) => (
                <div
                  key={index}
                  className="relative rounded-2xl bg-white/5 p-8 backdrop-blur-sm hover:bg-white/[0.07] transition-colors border border-white/10"
                >
                  {/* Quote mark decoration */}
                  <svg
                    className="absolute h-8 w-8 -top-4 -left-4 text-[#6495ED]/20"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                  <blockquote className="relative">
                    <p className="text-lg font-medium italic text-white leading-relaxed">
                      {quote.text}
                    </p>
                    <footer className="mt-4">
                      <p className="text-base font-semibold text-[#6495ED]">— {quote.author}</p>
                    </footer>
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-[#6495ED]">Investment Tracking</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to manage your portfolio
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Get real-time market data, track your investments, and analyze performance all in one place.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="mx-auto mt-16 max-w-5xl grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="absolute -inset-px bg-gradient-to-r from-[#6495ED]/20 to-transparent rounded-2xl opacity-0 transition group-hover:opacity-100" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6495ED]">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">Real-time Tracking</h3>
                <p className="mt-2 text-gray-300">Monitor your investments with live market data and real-time performance updates.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="absolute -inset-px bg-gradient-to-r from-[#6495ED]/20 to-transparent rounded-2xl opacity-0 transition group-hover:opacity-100" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6495ED]">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">Portfolio Analytics</h3>
                <p className="mt-2 text-gray-300">Gain insights with detailed analytics and performance metrics for your investments.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="absolute -inset-px bg-gradient-to-r from-[#6495ED]/20 to-transparent rounded-2xl opacity-0 transition group-hover:opacity-100" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6495ED]">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">Investment History</h3>
                <p className="mt-2 text-gray-300">Track your investment history and analyze your trading patterns over time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 