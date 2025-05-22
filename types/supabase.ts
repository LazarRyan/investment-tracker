export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      portfolios: {
        Row: {
          id: string
          created_at: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          last_updated: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          last_updated?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          last_updated?: string
        }
      }
      transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          portfolio_id: string
          type: 'buy' | 'sell'
          symbol: string
          shares: number
          price: number
          total: number
          date: string
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          portfolio_id: string
          type: 'buy' | 'sell'
          symbol: string
          shares: number
          price: number
          total: number
          date: string
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          portfolio_id?: string
          type?: 'buy' | 'sell'
          symbol?: string
          shares?: number
          price?: number
          total?: number
          date?: string
          notes?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          created_at: string
          theme: 'light' | 'dark' | 'system'
          email_notifications: boolean
          default_portfolio_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          theme?: 'light' | 'dark' | 'system'
          email_notifications?: boolean
          default_portfolio_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          theme?: 'light' | 'dark' | 'system'
          email_notifications?: boolean
          default_portfolio_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 