import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface UserSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  price_alerts: boolean;
  alert_threshold: number;
  default_currency: string;
  theme: 'light' | 'dark' | 'system';
  portfolio_privacy: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Validate the updates
    const allowedFields = [
      'email_notifications',
      'price_alerts',
      'alert_threshold',
      'default_currency',
      'theme',
      'portfolio_privacy'
    ];

    const validatedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (allowedFields.includes(key)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<UserSettings>);

    const { data, error } = await supabase
      .from('user_settings')
      .update(validatedUpdates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
} 