import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

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
    ] as const;

    type AllowedField = typeof allowedFields[number];
    
    const validatedUpdates = Object.entries(updates as Record<string, unknown>).reduce<UserSettingsUpdate>((acc, [key, value]) => {
      if (allowedFields.includes(key as AllowedField)) {
        acc[key as keyof UserSettingsUpdate] = value as any;
      }
      return acc;
    }, {});

    const { data, error } = await supabase
      .from('user_settings')
      .update({ 
        ...validatedUpdates,
        updated_at: new Date().toISOString()
      })
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