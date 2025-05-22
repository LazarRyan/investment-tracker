'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setError('No email address found. Please try signing in again.');
        return;
      }

      const { error } = await supabase.auth.resendSignUp({
        email: user.email,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">Verification email sent successfully!</p>
          </div>
        )}
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email?{' '}
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Click here to resend'}
            </button>
          </p>
          <p className="mt-4 text-sm text-gray-500">
            or{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              try signing in again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 