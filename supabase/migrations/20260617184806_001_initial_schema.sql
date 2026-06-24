/*
# VitrineAI - Initial Database Schema

## Overview
Complete schema for VitrineAI SaaS platform - AI-powered content generation for marketplace sellers.

## New Tables

### User & Authentication
1. **profiles** - Extended user profile data
   - `id` (uuid, PK, references auth.users)
   - `full_name` (text)
   - `avatar_url` (text)
   - `role` (text, default 'user' - 'user' or 'admin')
   - `created_at`, `updated_at` (timestamps)

### Subscription Plans
2. **plans** - Available subscription plans
   - `id` (uuid, PK)
   - `name` (text) - 'Teste', 'Profissional', 'Vitalício'
   - `duration_days` (integer) - 30, 90, null (vitalício)
   - `price` (decimal)
   - `credits` (integer) - Credit amount included
   - `features` (jsonb) - Plan features
   - `is_active` (boolean)
   - `sort_order` (integer)

3. **user_subscriptions** - User active subscriptions
   - `id` (uuid, PK)
   - `user_id` (FK to profiles)
   - `plan_id` (FK to plans)
   - `credits_remaining` (integer)
   - `credits_used` (integer)
   - `started_at`, `expires_at` (timestamps)
   - `status` (text) - 'active', 'expired', 'cancelled'

### Credits
4. **credit_transactions** - Track all credit movements
   - `id` (uuid, PK)
   - `user_id` (FK to profiles)
   - `amount` (integer) - positive for additions, negative for usage
   - `type` (text) - 'purchase', 'usage', 'bonus', 'refund'
   - `description` (text)
   - `reference_type` (text) - 'image', 'video', 'model', 'copywriting', 'plan'
   - `reference_id` (uuid)
   - `created_at` (timestamp)

### Content Generation
5. **generated_content** - All AI-generated content
   - `id` (uuid, PK)
   - `user_id` (FK to profiles)
   - `type` (text) - 'image', 'video', 'model', 'copywriting'
   - `product_name` (text)
   - `product_category` (text)
   - `marketplace` (text) - 'shopee', 'mercadolivre', 'amazon', 'tiktok', 'magalu', 'shein'
   - `prompt_used` (text)
   - `result_url` (text) - Storage URL
   - `result_data` (jsonb) - Additional data (title, description, hashtags, etc.)
   - `credits_used` (integer)
   - `status` (text) - 'pending', 'completed', 'failed'
   - `created_at` (timestamp)

### Templates
6. **template_categories** - Categories for templates
   - `id` (uuid, PK)
   - `name` (text)
   - `slug` (text, unique)
   - `icon` (text)
   - `sort_order` (integer)

7. **templates** - Template library
   - `id` (uuid, PK)
   - `category_id` (FK to template_categories)
   - `name` (text)
   - `type` (text) - 'image', 'video', 'copywriting'
   - `thumbnail_url` (text)
   - `prompt_template` (text)
   - `settings` (jsonb) - Default settings
   - `is_premium` (boolean)
   - `is_active` (boolean)
   - `usage_count` (integer)
   - `created_at` (timestamp)

### Trending Products
8. **trending_products** - Dashboard trending data
   - `id` (uuid, PK)
   - `product_name` (text)
   - `category` (text)
   - `marketplace` (text)
   - `trend_score` (integer)
   - `growth_rate` (decimal)
   - `image_url` (text)
   - `data_source` (text)
   - `is_active` (boolean)
   - `published_at` (timestamp)

### Academy
9. **courses** - Academy courses
   - `id` (uuid, PK)
   - `title` (text)
   - `description` (text)
   - `thumbnail_url` (text)
   - `instructor` (text)
   - `duration_minutes` (integer)
   - `lessons_count` (integer)
   - `marketplace_focus` (text) - 'shopee', 'amazon', 'tiktok', 'general'
   - `is_premium` (boolean)
   - `sort_order` (integer)
   - `is_published` (boolean)
   - `created_at` (timestamp)

10. **course_lessons** - Lessons within courses
    - `id` (uuid, PK)
    - `course_id` (FK to courses)
    - `title` (text)
    - `description` (text)
    - `video_url` (text)
    - `duration_minutes` (integer)
    - `sort_order` (integer)
    - `is_published` (boolean)

11. **user_course_progress** - Track user progress
    - `id` (uuid, PK)
    - `user_id` (FK to profiles)
    - `course_id` (FK to courses)
    - `lesson_id` (FK to course_lessons, nullable)
    - `completed_lessons` (integer[])
    - `progress_percent` (integer)
    - `last_watched_at` (timestamp)

### Payments
12. **payments** - Payment records
    - `id` (uuid, PK)
    - `user_id` (FK to profiles)
    - `plan_id` (FK to plans, nullable)
    - `amount` (decimal)
    - `payment_method` (text) - 'pix', 'credit_card', 'boleto'
    - `gateway` (text) - 'mercadopago'
    - `gateway_id` (text) - External payment ID
    - `status` (text) - 'pending', 'paid', 'failed', 'refunded'
    - `credits_added` (integer)
    - `paid_at` (timestamp)
    - `created_at` (timestamp)

### Admin
13. **admin_news** - Admin news/updates
    - `id` (uuid, PK)
    - `title` (text)
    - `content` (text)
    - `type` (text) - 'update', 'feature', 'maintenance'
    - `is_published` (boolean)
    - `published_at` (timestamp)
    - `created_at` (timestamp)

## Security
- All tables have RLS enabled
- Owner-scoped policies for user data
- Admin-only access for admin tables
- Public read for templates, courses, trending products
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin can read all profiles
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  duration_days integer,
  price decimal(10,2) NOT NULL,
  credits integer NOT NULL,
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_select" ON plans;
CREATE POLICY "plans_public_select" ON plans FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "plans_admin_all" ON plans;
CREATE POLICY "plans_admin_all" ON plans FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- USER SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE SET NULL,
  credits_remaining integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_insert_own" ON user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_subscriptions_admin_all" ON user_subscriptions;
CREATE POLICY "user_subscriptions_admin_all" ON user_subscriptions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  description text,
  reference_type text CHECK (reference_type IN ('image', 'video', 'model', 'copywriting', 'plan', 'payment')),
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_transactions_select_own" ON credit_transactions;
CREATE POLICY "credit_transactions_select_own" ON credit_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "credit_transactions_insert_own" ON credit_transactions;
CREATE POLICY "credit_transactions_insert_own" ON credit_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "credit_transactions_admin_all" ON credit_transactions;
CREATE POLICY "credit_transactions_admin_all" ON credit_transactions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- GENERATED CONTENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'video', 'model', 'copywriting')),
  product_name text,
  product_category text,
  marketplace text CHECK (marketplace IN ('shopee', 'mercadolivre', 'amazon', 'tiktok', 'magalu', 'shein', 'general')),
  prompt_used text,
  result_url text,
  result_data jsonb,
  credits_used integer DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_content_user ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_type ON generated_content(type);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_created ON generated_content(created_at DESC);

ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generated_content_select_own" ON generated_content;
CREATE POLICY "generated_content_select_own" ON generated_content FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "generated_content_insert_own" ON generated_content;
CREATE POLICY "generated_content_insert_own" ON generated_content FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "generated_content_update_own" ON generated_content;
CREATE POLICY "generated_content_update_own" ON generated_content FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "generated_content_delete_own" ON generated_content;
CREATE POLICY "generated_content_delete_own" ON generated_content FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "generated_content_admin_all" ON generated_content;
CREATE POLICY "generated_content_admin_all" ON generated_content FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TEMPLATE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_categories_public_select" ON template_categories;
CREATE POLICY "template_categories_public_select" ON template_categories FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "template_categories_admin_all" ON template_categories;
CREATE POLICY "template_categories_admin_all" ON template_categories FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES template_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('image', 'video', 'copywriting')),
  thumbnail_url text,
  preview_url text,
  prompt_template text,
  settings jsonb DEFAULT '{}',
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_public_select" ON templates;
CREATE POLICY "templates_public_select" ON templates FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "templates_admin_all" ON templates;
CREATE POLICY "templates_admin_all" ON templates FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TRENDING PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trending_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  category text,
  marketplace text NOT NULL CHECK (marketplace IN ('shopee', 'mercadolivre', 'amazon', 'tiktok', 'magalu', 'shein', 'general')),
  trend_score integer DEFAULT 0,
  growth_rate decimal(5,2),
  image_url text,
  source_url text,
  data_source text,
  metadata jsonb,
  is_active boolean DEFAULT true,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trending_marketplace ON trending_products(marketplace);
CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_products(trend_score DESC);

ALTER TABLE trending_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trending_products_public_select" ON trending_products;
CREATE POLICY "trending_products_public_select" ON trending_products FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "trending_products_admin_all" ON trending_products;
CREATE POLICY "trending_products_admin_all" ON trending_products FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  instructor text,
  duration_minutes integer DEFAULT 0,
  lessons_count integer DEFAULT 0,
  marketplace_focus text CHECK (marketplace_focus IN ('shopee', 'amazon', 'tiktok', 'mercadolivre', 'general')),
  is_premium boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_public_select" ON courses;
CREATE POLICY "courses_public_select" ON courses FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "courses_admin_all" ON courses;
CREATE POLICY "courses_admin_all" ON courses FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- COURSE LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  duration_minutes integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id);

ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_lessons_select_published" ON course_lessons;
CREATE POLICY "course_lessons_select_published" ON course_lessons FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true AND
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND is_published = true)
  );

DROP POLICY IF EXISTS "course_lessons_admin_all" ON course_lessons;
CREATE POLICY "course_lessons_admin_all" ON course_lessons FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- USER COURSE PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons integer[] DEFAULT '{}',
  progress_percent integer DEFAULT 0,
  last_watched_lesson_id uuid REFERENCES course_lessons(id),
  last_watched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course ON user_course_progress(course_id);

ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_select_own" ON user_course_progress;
CREATE POLICY "user_progress_select_own" ON user_course_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_progress_insert_own" ON user_course_progress;
CREATE POLICY "user_progress_insert_own" ON user_course_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_progress_update_own" ON user_course_progress;
CREATE POLICY "user_progress_update_own" ON user_course_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  gateway text DEFAULT 'mercadopago',
  gateway_id text,
  gateway_data jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  credits_added integer DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments(gateway_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_own" ON payments;
CREATE POLICY "payments_select_own" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_admin_all" ON payments;
CREATE POLICY "payments_admin_all" ON payments FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- ADMIN NEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  type text DEFAULT 'update' CHECK (type IN ('update', 'feature', 'maintenance', 'warning')),
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_news_public_select" ON admin_news;
CREATE POLICY "admin_news_public_select" ON admin_news FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "admin_news_admin_all" ON admin_news;
CREATE POLICY "admin_news_admin_all" ON admin_news FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- SEED DATA: PLANS
-- ============================================
INSERT INTO plans (name, slug, duration_days, price, credits, features, sort_order) VALUES
('Teste', 'teste', 30, 0.00, 10, '["10 créditos gratuitos", "Biblioteca básica de templates", "Geração de imagens simples", "Suporte por email"]', 1),
('Profissional', 'profissional', 90, 97.00, 200, '["200 créditos", "Templates premium", "Vídeos avançados", "Modelos virtuais", "Copywriting profissional", "Suporte prioritário", "Acesso aos trending products"]', 2),
('Vitalício', 'vitalicio', NULL, 297.00, 500, '["500 créditos iniciais", "Acesso permanente", "Todas atualizações futuras", "Todos os templates premium", "Modelos virtuais ilimitados", "Prioridade em novos recursos", "Suporte VIP", "Acesso vitalício à academia"]', 3)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED DATA: TEMPLATE CATEGORIES
-- ============================================
INSERT INTO template_categories (name, slug, icon, sort_order) VALUES
('Moda Feminina', 'moda-feminina', 'sparkles', 1),
('Moda Masculina', 'moda-masculina', 'shirt', 2),
('Eletrônicos', 'eletronicos', 'smartphone', 3),
('Casa e Decoração', 'casa-decoracao', 'home', 4),
('Beleza', 'beleza', 'heart', 5),
('Pet', 'pet', 'paw-print', 6),
('Infantil', 'infantil', 'baby', 7),
('Fitness', 'fitness', 'dumbbell', 8),
('Acessórios', 'acessorios', 'watch', 9),
('Alimentos', 'alimentos', 'utensils', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: COURSES
-- ============================================
INSERT INTO courses (title, description, instructor, marketplace_focus, is_premium, sort_order) VALUES
('Como Vender na Shopee - Do Zero ao Top Seller', 'Aprenda todas as estratégias para se tornar um Top Seller na Shopee. Configure sua loja, otimize anúncios e escala suas vendas.', 'Maria Silva', 'shopee', false, 1),
('Amazon FBA: Guia Completo para Brasileiros', 'Domine o Amazon FBA e comece a vender para o maior mercado consumidor do mundo.', 'João Santos', 'amazon', true, 2),
('TikTok Shop: O Novo Eldorado do E-commerce', 'Descubra como monetizar no TikTok Shop e criar conteúdo viral que converte.', 'Ana Costa', 'tiktok', true, 3),
('Criação de Vídeos Virais', 'Aprenda técnicas comprovadas para criar vídeos que viralizam e geram vendas.', 'Pedro Oliveira', 'general', false, 4),
('Copywriting para Marketplaces', 'Escreva títulos e descrições que vendem. Técnicas avançadas de persuasão.', 'Carla Mendes', 'general', true, 5),
('Mercado Livre: Estratégias Avançadas', 'Técnicas avançadas para dominar o Mercado Livre e aumentar suas conversões.', 'Lucas Ferreira', 'mercadolivre', true, 6)
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_generated_content_updated_at ON generated_content;
CREATE TRIGGER update_generated_content_updated_at
  BEFORE UPDATE ON generated_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_course_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_admin_news_updated_at ON admin_news;
CREATE TRIGGER update_admin_news_updated_at
  BEFORE UPDATE ON admin_news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get user's current credits
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  total_credits integer;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('purchase', 'bonus', 'refund') THEN amount
      WHEN type = 'usage' THEN -amount
      ELSE 0
    END
  ), 0) INTO total_credits
  FROM credit_transactions
  WHERE user_id = p_user_id;
  
  RETURN total_credits;
END;
$$ LANGUAGE plpgsql;