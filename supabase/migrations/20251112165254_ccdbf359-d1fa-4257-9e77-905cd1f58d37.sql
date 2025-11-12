-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create product category enum
CREATE TYPE public.product_category AS ENUM ('fresh', 'frozen', 'canned', 'other');

-- Create pricing rule type enum
CREATE TYPE public.rule_type AS ENUM ('expiration_based', 'age_based', 'demand_based', 'manual');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category product_category NOT NULL,
  description TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'kg',
  cost_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(10, 2) DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pricing rules table
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type rule_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  condition_days INTEGER,
  price_adjustment_percent DECIMAL(5, 2),
  applies_to_category product_category,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pricing logs table
CREATE TABLE public.pricing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  rule_id UUID REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock adjustments table
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  adjusted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  profit DECIMAL(10, 2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suppliers"
  ON public.suppliers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pricing_rules
CREATE POLICY "Authenticated users can view pricing rules"
  ON public.pricing_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage pricing rules"
  ON public.pricing_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pricing_logs
CREATE POLICY "Authenticated users can view pricing logs"
  ON public.pricing_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert pricing logs"
  ON public.pricing_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for stock_adjustments
CREATE POLICY "Authenticated users can view stock adjustments"
  ON public.stock_adjustments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert stock adjustments"
  ON public.stock_adjustments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "Authenticated users can view transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, full_name)
  VALUES (NEW.id, NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_expiration ON public.products(expiration_date);
CREATE INDEX idx_pricing_logs_product ON public.pricing_logs(product_id);
CREATE INDEX idx_pricing_logs_created ON public.pricing_logs(created_at);
CREATE INDEX idx_stock_adjustments_product ON public.stock_adjustments(product_id);
CREATE INDEX idx_transactions_product ON public.transactions(product_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);