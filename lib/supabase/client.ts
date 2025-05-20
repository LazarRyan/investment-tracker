import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Your project\'s URL and Key are required to create a Supabase client!\nCheck your Supabase project\'s API settings to find these values\nhttps://supabase.com/dashboard/project/_/settings/api');
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}; 