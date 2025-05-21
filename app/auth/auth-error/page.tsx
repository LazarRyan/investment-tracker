'use client';

import Link from 'next/link';

export const runtime = 'edge';

export default function AuthError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            There was a problem with the authentication process. This could be because:
          </p>
          <ul className="mt-4 text-left text-sm text-gray-600 list-disc pl-5">
            <li>The verification link has expired</li>
            <li>The link has already been used</li>
            <li>There was a technical problem</li>
          </ul>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Please try to{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              sign in again
            </Link>
            {' '}or{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              create a new account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 