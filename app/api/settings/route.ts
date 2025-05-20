import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number => typeof value === 'number';
const isString = (value: unknown): value is string => typeof value === 'string';
const isTheme = (value: unknown): value is UserSettings['theme'] => 
  isString(value) && ['light', 'dark', 'system'].includes(value);
const isPrivacy = (value: unknown): value is UserSettings['portfolio_privacy'] =>
  isString(value) && ['public', 'private'].includes(value);

function validateSettingsUpdate(updates: Record<string, unknown>): UserSettingsUpdate {
  const validated: UserSettingsUpdate = {};
  
  if ('email_notifications' in updates && isBoolean(updates.email_notifications)) {
    validated.email_notifications = updates.email_notifications;
  }
  
  if ('price_alerts' in updates && isBoolean(updates.price_alerts)) {
    validated.price_alerts = updates.price_alerts;
  }
  
  if ('alert_threshold' in updates && isNumber(updates.alert_threshold)) {
    validated.alert_threshold = updates.alert_threshold;
  }
  
  if ('default_currency' in updates && isString(updates.default_currency)) {
    validated.default_currency = updates.default_currency;
  }
  
  if ('theme' in updates && isTheme(updates.theme)) {
    validated.theme = updates.theme;
  }
  
  if ('portfolio_privacy' in updates && isPrivacy(updates.portfolio_privacy)) {
    validated.portfolio_privacy = updates.portfolio_privacy;
  }
  
  return validated;
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
    const validatedUpdates = validateSettingsUpdate(updates);

    // Only proceed if we have valid updates
    if (Object.keys(validatedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

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