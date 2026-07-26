-- =========================================
-- Supabase Admin Dashboard Schema
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- Profiles Table (extends auth.users)
-- =========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =========================================
-- Categories Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📦',
    slug TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- =========================================
-- Products Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    discount INTEGER DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    specifications JSONB DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    best_seller BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    offer BOOLEAN DEFAULT FALSE,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON public.products(best_seller);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);

-- =========================================
-- Product Images Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    path TEXT,
    alt_text TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON public.product_images(position);

-- =========================================
-- Orders Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address TEXT,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);

-- =========================================
-- Order Items Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- =========================================
-- Triggers for updated_at
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- Row Level Security Policies
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies (prevent recursion: do NOT query profiles table inside its own policies)
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert categories" ON public.categories
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can update categories" ON public.categories
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can delete categories" ON public.categories
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Products policies (public read, admin write)
CREATE POLICY "Products are viewable by everyone" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert products" ON public.products
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can update products" ON public.products
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can delete products" ON public.products
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Product images policies
CREATE POLICY "Product images are viewable by everyone" ON public.product_images
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert product images" ON public.product_images
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can update product images" ON public.product_images
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can delete product images" ON public.product_images
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Orders policies (admin only)
CREATE POLICY "Only admins can view orders" ON public.orders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can insert orders" ON public.orders
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can update orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can delete orders" ON public.orders
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Order items policies
CREATE POLICY "Only admins can view order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can update order items" ON public.order_items
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only admins can delete order items" ON public.order_items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- =========================================
-- Storage Policies
-- =========================================

-- Create bucket for product images (run this in Supabase Storage UI or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('PRODUCT-IMAGES', 'PRODUCT-IMAGES', true);

-- Storage RLS policies
-- Policy to allow public read access to product images
CREATE POLICY "Public can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'PRODUCT-IMAGES');

-- Policy to allow only admins to upload product images
CREATE POLICY "Only admins can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'PRODUCT-IMAGES' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Policy to allow only admins to update product images
CREATE POLICY "Only admins can update product images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'PRODUCT-IMAGES' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Policy to allow only admins to delete product images
CREATE POLICY "Only admins can delete product images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'PRODUCT-IMAGES' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

UPDATE public.product_images
SET url = REPLACE(url, '/product-images/', '/PRODUCT-IMAGES/')
WHERE url LIKE '%/product-images/%';

-- =========================================
-- Sample Data
-- =========================================

-- Insert sample categories
INSERT INTO public.categories (id, name, description, icon, slug) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Men''s Watches', 'Discover our collection of stylish and affordable men''s watches.', '👔', 'mens-watches'),
    ('22222222-2222-2222-2222-222222222222', 'Women''s Watches', 'Elegant and trendy watches for every occasion.', '👗', 'womens-watches'),
    ('33333333-3333-3333-3333-333333333333', 'Sports Watches', 'Durable and functional sports watches for an active lifestyle.', '🏃', 'sports-watches'),
    ('44444444-4444-4444-4444-444444444444', 'Children''s Watches', 'Fun and colorful watches designed for kids.', '👶', 'childrens-watches'),
    ('55555555-5555-5555-5555-555555555555', 'Smart Watches', 'Discover the latest advanced smart watches.', '⌚', 'smart-watches')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO public.products (id, name, description, price, discount, category_id, specifications, colors, best_seller, featured, offer, stock) VALUES
    ('44444444-4444-4444-4444-444444444444', 'Classic Men''s Watch', 'A timeless classic watch with genuine leather strap and stainless steel case.', 150.00, 20, '11111111-1111-1111-1111-111111111111', '{"Movement": "Quartz", "Case Material": "Stainless Steel", "Water Resistance": "50m", "Band Material": "Genuine Leather", "Case Diameter": "40mm"}'::jsonb, ARRAY['Black', 'Brown', 'Navy'], true, true, true, 10),
    ('55555555-5555-5555-5555-555555555555', 'Elegant Women''s Watch', 'A beautiful and elegant watch designed for women.', 180.00, 0, '22222222-2222-2222-2222-222222222222', '{"Movement": "Quartz", "Case Material": "Rose Gold Plated", "Water Resistance": "30m", "Band Material": "Stainless Steel", "Case Diameter": "28mm"}'::jsonb, ARRAY['Rose Gold', 'Silver', 'Gold'], false, true, false, 15),
    ('66666666-6666-6666-6666-666666666666', 'Sport Chronograph', 'A rugged sports watch with chronograph functions.', 220.00, 15, '33333333-3333-3333-3333-333333333333', '{"Movement": "Quartz Chronograph", "Case Material": "ABS Resin", "Water Resistance": "100m", "Band Material": "Silicone", "Case Diameter": "44mm"}'::jsonb, ARRAY['Black/Orange', 'Black/Green', 'Navy/White'], true, true, true, 8)
ON CONFLICT (id) DO NOTHING;

-- Insert sample orders
INSERT INTO public.orders (id, customer_name, customer_phone, customer_email, shipping_address, total_amount, status, notes) VALUES
    ('77777777-7777-7777-7777-777777777777', 'Ahmed Al-Rashid', '+966501234567', 'ahmed@example.com', 'Riyadh, Saudi Arabia', 450.00, 'pending', 'Please deliver before evening'),
    ('88888888-8888-8888-8888-888888888888', 'Sara Mahmoud', '+966507654321', 'sara@example.com', 'Jeddah, Saudi Arabia', 180.00, 'confirmed', ''),
    ('99999999-9999-9999-9999-999999999999', 'Omar Khalil', '+966509876543', 'omar@example.com', 'Dammam, Saudi Arabia', 320.00, 'processing', 'Gift wrapping required')
ON CONFLICT (id) DO NOTHING;

-- Insert sample order items
INSERT INTO public.order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Classic Men''s Watch', 150.00, 2, 300.00),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'Elegant Women''s Watch', 180.00, 1, 180.00),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'Elegant Women''s Watch', 180.00, 1, 180.00),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'Sport Chronograph', 320.00, 1, 320.00)
ON CONFLICT (id) DO NOTHING;
