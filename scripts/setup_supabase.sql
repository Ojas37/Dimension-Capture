-- This script sets up the complete Supabase database for DimensionSnap
-- Run this in your Supabase SQL Editor

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
  processing_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create measurement_objects table for multiple objects per measurement
CREATE TABLE IF NOT EXISTS public.measurement_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE,
  object_name TEXT DEFAULT 'Object',
  width_cm DECIMAL(10,3) NOT NULL,
  height_cm DECIMAL(10,3) NOT NULL,
  width_px INTEGER,
  height_px INTEGER,
  bbox_x INTEGER,
  bbox_y INTEGER,
  bbox_width INTEGER,
  bbox_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can insert own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can update own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can view own measurement objects" ON public.measurement_objects;
DROP POLICY IF EXISTS "Users can insert own measurement objects" ON public.measurement_objects;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for measurements
CREATE POLICY "Users can view own measurements" ON public.measurements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements" ON public.measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements" ON public.measurements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements" ON public.measurements
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for measurement_objects
CREATE POLICY "Users can view own measurement objects" ON public.measurement_objects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.measurements 
      WHERE measurements.id = measurement_objects.measurement_id 
      AND measurements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own measurement objects" ON public.measurement_objects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.measurements 
      WHERE measurements.id = measurement_objects.measurement_id 
      AND measurements.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON public.measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON public.measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurement_objects_measurement_id ON public.measurement_objects(measurement_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample reference objects data (optional)
CREATE TABLE IF NOT EXISTS public.reference_objects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  width_cm DECIMAL(10,3) NOT NULL,
  height_cm DECIMAL(10,3) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for reference objects
ALTER TABLE public.reference_objects ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read reference objects
CREATE POLICY "Anyone can view reference objects" ON public.reference_objects
  FOR SELECT USING (is_active = true);

-- Insert default reference objects
INSERT INTO public.reference_objects (id, name, width_cm, height_cm, description) VALUES
  ('credit-card', 'Credit/Debit Card', 8.56, 5.398, 'Standard credit card dimensions'),
  ('us-quarter', 'US Quarter', 2.426, 2.426, 'US quarter coin diameter'),
  ('business-card', 'Business Card', 8.89, 5.08, 'Standard business card dimensions'),
  ('iphone-14', 'iPhone 14', 14.67, 7.15, 'iPhone 14 dimensions'),
  ('a4-paper', 'A4 Paper', 29.7, 21.0, 'A4 paper dimensions')
ON CONFLICT (id) DO NOTHING;

-- Create a view for measurement statistics (optional)
CREATE OR REPLACE VIEW public.user_measurement_stats AS
SELECT 
  user_id,
  COUNT(*) as total_measurements,
  AVG(confidence) as avg_confidence,
  AVG(processing_time) as avg_processing_time,
  MIN(created_at) as first_measurement,
  MAX(created_at) as last_measurement
FROM public.measurements
GROUP BY user_id;

-- Enable RLS for the view
ALTER VIEW public.user_measurement_stats SET (security_invoker = true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.measurements TO anon, authenticated;
GRANT ALL ON public.measurement_objects TO anon, authenticated;
GRANT SELECT ON public.reference_objects TO anon, authenticated;
GRANT SELECT ON public.user_measurement_stats TO authenticated;

-- Success message
SELECT 'Supabase database setup completed successfully!' as status;
