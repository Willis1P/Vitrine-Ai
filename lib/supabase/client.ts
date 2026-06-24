import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          slug: string
          duration_days: number | null
          price: number
          credits: number
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          duration_days?: number | null
          price: number
          credits: number
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          duration_days?: number | null
          price?: number
          credits?: number
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          credits_remaining: number
          credits_used: number
          started_at: string
          expires_at: string | null
          status: 'active' | 'expired' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          credits_remaining?: number
          credits_used?: number
          started_at?: string
          expires_at?: string | null
          status?: 'active' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          credits_remaining?: number
          credits_used?: number
          started_at?: string
          expires_at?: string | null
          status?: 'active' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'purchase' | 'usage' | 'bonus' | 'refund'
          description: string | null
          reference_type: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'purchase' | 'usage' | 'bonus' | 'refund'
          description?: string | null
          reference_type?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'purchase' | 'usage' | 'bonus' | 'refund'
          description?: string | null
          reference_type?: string | null
          reference_id?: string | null
          created_at?: string
        }
      }
      generated_content: {
        Row: {
          id: string
          user_id: string
          type: 'image' | 'video' | 'model' | 'copywriting'
          product_name: string | null
          product_category: string | null
          marketplace: string | null
          prompt_used: string | null
          result_url: string | null
          result_data: Json | null
          credits_used: number
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'image' | 'video' | 'model' | 'copywriting'
          product_name?: string | null
          product_category?: string | null
          marketplace?: string | null
          prompt_used?: string | null
          result_url?: string | null
          result_data?: Json | null
          credits_used?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'image' | 'video' | 'model' | 'copywriting'
          product_name?: string | null
          product_category?: string | null
          marketplace?: string | null
          prompt_used?: string | null
          result_url?: string | null
          result_data?: Json | null
          credits_used?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      template_categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          type: 'image' | 'video' | 'copywriting'
          thumbnail_url: string | null
          preview_url: string | null
          prompt_template: string | null
          settings: Json
          is_premium: boolean
          is_active: boolean
          usage_count: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          type: 'image' | 'video' | 'copywriting'
          thumbnail_url?: string | null
          preview_url?: string | null
          prompt_template?: string | null
          settings?: Json
          is_premium?: boolean
          is_active?: boolean
          usage_count?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          type?: 'image' | 'video' | 'copywriting'
          thumbnail_url?: string | null
          preview_url?: string | null
          prompt_template?: string | null
          settings?: Json
          is_premium?: boolean
          is_active?: boolean
          usage_count?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      trending_products: {
        Row: {
          id: string
          product_name: string
          category: string | null
          marketplace: string
          trend_score: number
          growth_rate: number | null
          image_url: string | null
          source_url: string | null
          data_source: string | null
          metadata: Json | null
          is_active: boolean
          published_at: string
          created_at: string
        }
        Insert: {
          id?: string
          product_name: string
          category?: string | null
          marketplace: string
          trend_score?: number
          growth_rate?: number | null
          image_url?: string | null
          source_url?: string | null
          data_source?: string | null
          metadata?: Json | null
          is_active?: boolean
          published_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          product_name?: string
          category?: string | null
          marketplace?: string
          trend_score?: number
          growth_rate?: number | null
          image_url?: string | null
          source_url?: string | null
          data_source?: string | null
          metadata?: Json | null
          is_active?: boolean
          published_at?: string
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          instructor: string | null
          duration_minutes: number
          lessons_count: number
          marketplace_focus: string | null
          is_premium: boolean
          sort_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          instructor?: string | null
          duration_minutes?: number
          lessons_count?: number
          marketplace_focus?: string | null
          is_premium?: boolean
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          instructor?: string | null
          duration_minutes?: number
          lessons_count?: number
          marketplace_focus?: string | null
          is_premium?: boolean
          sort_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      course_lessons: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          video_url: string | null
          duration_minutes: number
          sort_order: number
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          video_url?: string | null
          duration_minutes?: number
          sort_order?: number
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          video_url?: string | null
          duration_minutes?: number
          sort_order?: number
          is_published?: boolean
          created_at?: string
        }
      }
      user_course_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          completed_lessons: number[]
          progress_percent: number
          last_watched_lesson_id: string | null
          last_watched_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          completed_lessons?: number[]
          progress_percent?: number
          last_watched_lesson_id?: string | null
          last_watched_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          completed_lessons?: number[]
          progress_percent?: number
          last_watched_lesson_id?: string | null
          last_watched_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          amount: number
          payment_method: 'pix' | 'credit_card' | 'boleto'
          gateway: string
          gateway_id: string | null
          gateway_data: Json | null
          status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
          credits_added: number
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          amount: number
          payment_method: 'pix' | 'credit_card' | 'boleto'
          gateway?: string
          gateway_id?: string | null
          gateway_data?: Json | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
          credits_added?: number
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          amount?: number
          payment_method?: 'pix' | 'credit_card' | 'boleto'
          gateway?: string
          gateway_id?: string | null
          gateway_data?: Json | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
          credits_added?: number
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_news: {
        Row: {
          id: string
          title: string
          content: string | null
          type: 'update' | 'feature' | 'maintenance' | 'warning'
          is_published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          type?: 'update' | 'feature' | 'maintenance' | 'warning'
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          type?: 'update' | 'feature' | 'maintenance' | 'warning'
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      get_user_credits: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']
export type GeneratedContent = Database['public']['Tables']['generated_content']['Row']
export type TemplateCategory = Database['public']['Tables']['template_categories']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type TrendingProduct = Database['public']['Tables']['trending_products']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type CourseLesson = Database['public']['Tables']['course_lessons']['Row']
export type UserCourseProgress = Database['public']['Tables']['user_course_progress']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type AdminNews = Database['public']['Tables']['admin_news']['Row']
