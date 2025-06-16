-- Final deployment setup for Supabase
-- Run this in your Supabase SQL Editor before deploying

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create measurements table
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  annotated_image_url TEXT,
  reference_object TEXT NOT NULL,
  custom_width DECIMAL(10,3),
  custom_height DECIMAL(10,3),
  target_width DECIMAL(10,3) NOT NULL,
  target_height DECIMAL(10,3) NOT NULL,
  confidence DECIMAL(5,4),
  processing_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own measurements" ON public.measurements;

-- Create policies
CREATE POLICY "Users can manage own profile" ON public.profiles
  USING (auth.uid() = id);

CREATE POLICY "Users can manage own measurements" ON public.measurements
  USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.measurements TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON public.measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON public.measurements(created_at DESC);

SELECT 'Database setup completed for deployment!' as status;
