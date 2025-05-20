'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserSettings {
  email_notifications: boolean;
  price_alerts: boolean;
  alert_threshold: number;
  default_currency: string;
  theme: 'light' | 'dark' | 'system';
  portfolio_privacy: 'public' | 'private';
}

interface UserProfile {
  email: string;
  created_at: string;
  last_sign_in: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    price_alerts: true,
    alert_threshold: 5,
    default_currency: 'USD',
    theme: 'system',
    portfolio_privacy: 'private'
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            email: user.email || '',
            created_at: user.created_at,
            last_sign_in: new Date().toISOString() // This should come from actual last sign in data
          });
          
          // Fetch user settings from your API
          const response = await fetch('/api/settings');
          if (response.ok) {
            const data = await response.json();
            setSettings(data);
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user settings');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [supabase.auth]);

  const handleSettingChange = async (
    key: keyof UserSettings,
    value: string | number | boolean
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    try {
      // Update settings in the backend
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) throw new Error('Failed to update settings');
      
      setSuccessMessage('Settings updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete account');

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6495ED]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-8 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Account Information */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Account Information</h3>
              <div className="mt-5 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(profile?.created_at || '').toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Sign In</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(profile?.last_sign_in || '').toLocaleDateString()}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Notifications</h3>
              <div className="mt-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                    <p className="text-sm text-gray-500">Receive updates about your investments via email</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('email_notifications', !settings.email_notifications)}
                    className={`${
                      settings.email_notifications ? 'bg-[#6495ED]' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6495ED] focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        settings.email_notifications ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Price Alerts</label>
                    <p className="text-sm text-gray-500">Get notified when stocks hit your target price</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('price_alerts', !settings.price_alerts)}
                    className={`${
                      settings.price_alerts ? 'bg-[#6495ED]' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6495ED] focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        settings.price_alerts ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">Alert Threshold (%)</label>
                  <p className="text-sm text-gray-500">Minimum price change to trigger an alert</p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.alert_threshold}
                    onChange={(e) => handleSettingChange('alert_threshold', Number(e.target.value))}
                    className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#6495ED] sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Preferences</h3>
              <div className="mt-5 space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-900">Default Currency</label>
                  <select
                    value={settings.default_currency}
                    onChange={(e) => handleSettingChange('default_currency', e.target.value)}
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#6495ED] sm:text-sm sm:leading-6"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#6495ED] sm:text-sm sm:leading-6"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">Portfolio Privacy</label>
                  <select
                    value={settings.portfolio_privacy}
                    onChange={(e) => handleSettingChange('portfolio_privacy', e.target.value)}
                    className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#6495ED] sm:text-sm sm:leading-6"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-red-800">Danger Zone</h3>
              <div className="mt-5">
                <button
                  onClick={handleDeleteAccount}
                  className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Delete Account
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 