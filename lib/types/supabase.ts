export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          price_alerts: boolean
          alert_threshold: number
          default_currency: string
          theme: 'light' | 'dark' | 'system'
          portfolio_privacy: 'public' | 'private'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          price_alerts?: boolean
          alert_threshold?: number
          default_currency?: string
          theme?: 'light' | 'dark' | 'system'
          portfolio_privacy?: 'public' | 'private'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          price_alerts?: boolean
          alert_threshold?: number
          default_currency?: string
          theme?: 'light' | 'dark' | 'system'
          portfolio_privacy?: 'public' | 'private'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 