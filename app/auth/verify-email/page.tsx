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
    if (!searchParams) return;
    
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
          ({ error } = await supabase.auth.signInWithOtp({
            email: user.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/verify-email?type=signup`
            }
          }));
          break;
        case 'password_reset':
          ({ error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/reset-password`
          }));
          break;
        case 'email_change':
          ({ error } = await supabase.auth.signInWithOtp({
            email: user.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/verify-email?type=email_change`
            }
          }));
          break;
        default:
          ({ error } = await supabase.auth.signInWithOtp({
            email: user.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/verify-email`
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
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8 text-center bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900">
            {verificationType === 'password_reset' ? 'Check Your Email' : 'Verify Your Email'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getVerificationMessage()}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  {verificationType === 'email_change' 
                    ? 'Email changed successfully! Redirecting...'
                    : 'Verification email sent successfully!'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <p className="text-sm text-gray-600">
            Didn't receive the email?{' '}
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="font-medium text-[#6495ED] hover:text-[#4169E1] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#6495ED]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Click here to resend'
              )}
            </button>
          </p>
          
          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-gray-600">
            <Link
              href="/auth/signin"
              className="inline-flex items-center font-medium text-[#6495ED] hover:text-[#4169E1]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Return to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 