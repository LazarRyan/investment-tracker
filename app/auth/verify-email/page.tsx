'use client';

import Link from 'next/link';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function VerifyEmail() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent you a verification link. Please check your email and click the link to verify your account.
          </p>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email?{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Try signing in again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 