'use client';

import Link from 'next/link';

export const runtime = 'edge';

export default function AuthError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8 text-center bg-white p-8 rounded-lg shadow-md">
        <div>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900">
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
        
        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">What would you like to do?</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/auth/signin"
              className="rounded-md bg-[#6495ED] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4169E1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6495ED] flex items-center justify-center"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center justify-center"
            >
              Create account
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            If you continue to experience issues, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
} 