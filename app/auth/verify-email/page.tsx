'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type VerificationType = 'signup' | 'password_reset' | 'email_change' | 'magic_link';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationType, setVerificationType] = useState<VerificationType>('signup');
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Determine the type of verification from URL parameters
    const type = searchParams.get('type') as VerificationType;
    if (type) {
      setVerificationType(type);
    }

    // Handle email change confirmation token if present
    const token = searchParams.get('token');
    if (token) {
      handleEmailConfirmation(token);
    }
  }, [searchParams]);

  const handleEmailConfirmation = async (token: string) => {
    try {
      // First get the user's email
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setError('No email address found. Please try signing in again.');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        type: 'email_change',
        email: user.email,
        token,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/settings'), 2000);
      }
    } catch (err) {
      setError('Failed to verify email change');
    }
  };

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

      let error;
      switch (verificationType) {
        case 'signup':
          ({ error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email,
            options: {
              redirectTo: `${window.location.origin}/auth/verify-email?type=signup`
            }
          }));
          break;
        case 'password_reset':
          ({ error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/reset-password`
          }));
          break;
        case 'email_change':
          ({ error } = await supabase.auth.resend({
            type: 'email_change',
            email: user.email,
            options: {
              redirectTo: `${window.location.origin}/auth/verify-email?type=email_change`
            }
          }));
          break;
        default:
          ({ error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email,
            options: {
              redirectTo: `${window.location.origin}/auth/verify-email`
            }
          }));
      }

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

  const getVerificationMessage = () => {
    switch (verificationType) {
      case 'signup':
        return "We've sent you a verification link. Please check your email and click the link to verify your account.";
      case 'password_reset':
        return "We've sent you a password reset link. Please check your email and click the link to reset your password.";
      case 'email_change':
        return "We've sent you an email confirmation link. Please check your email and click the link to confirm your new email address.";
      case 'magic_link':
        return "We've sent you a magic link. Please check your email and click the link to sign in.";
      default:
        return "Please check your email for the verification link.";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {verificationType === 'password_reset' ? 'Check Your Email' : 'Verify Your Email'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getVerificationMessage()}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {verificationType === 'email_change' 
                ? 'Email changed successfully! Redirecting...'
                : 'Verification email sent successfully!'}
            </p>
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