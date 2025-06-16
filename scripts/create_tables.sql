-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

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
