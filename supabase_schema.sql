-- Выполните этот SQL в SQL Editor внутри вашего проекта Supabase

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  balance NUMERIC DEFAULT 0,
  language_code TEXT,
  inventory JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица промокодов
CREATE TABLE IF NOT EXISTS promocodes (
  code TEXT PRIMARY KEY,
  reward NUMERIC NOT NULL,
  activations INTEGER DEFAULT 0,
  max_activations INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица использования промокодов (кто какие использовал)
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  code TEXT REFERENCES promocodes(code),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Таблица логов открытий кейсов / игр
CREATE TABLE IF NOT EXISTS opens_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  action_type TEXT,
  amount NUMERIC,
  item_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) - Настраиваем безопасный доступ
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opens_log ENABLE ROW LEVEL SECURITY;

-- Для Telegram WebApp и серверного взаимодействия (Server-Side)
-- Если вы делаете запросы с бэкенда (server.ts) с Service Role Key, 
-- политики (Policies) можно не создавать, так как Service Role игнорирует RLS.
-- Но если запросы идут с клиента, нужно настроить доступ:
CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
