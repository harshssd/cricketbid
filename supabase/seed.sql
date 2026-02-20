-- CricketBid Seed Data
-- This file contains sample data for testing the application

-- Note: This seed data is for development/testing only
-- In production, users will create their own auctions and data

-- Sample auction for demonstration (this would normally be created through the UI)
-- We'll skip inserting actual data here since it requires authenticated users
-- Instead, we'll create some reference data that can be useful

-- Insert default tier color mappings (can be referenced in the app)
CREATE TABLE IF NOT EXISTS public.tier_color_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    description TEXT
);

INSERT INTO public.tier_color_presets (name, color, description) VALUES
('Platinum', '#E5E4E2', 'Premium tier for top players'),
('Gold', '#FFD700', 'High-value players'),
('Silver', '#C0C0C0', 'Mid-tier players'),
('Bronze', '#CD7F32', 'Entry-level players'),
('Diamond', '#B9F2FF', 'Ultra-premium tier'),
('Elite', '#8B00FF', 'Elite performance tier'),
('Rookie', '#32CD32', 'New/emerging players');

-- Team color presets
CREATE TABLE IF NOT EXISTS public.team_color_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    description TEXT
);

INSERT INTO public.team_color_presets (name, primary_color, secondary_color, description) VALUES
('Royal Blue', '#4169E1', '#F0F8FF', 'Classic blue and white combination'),
('Forest Green', '#228B22', '#F0FFF0', 'Natural green theme'),
('Crimson Red', '#DC143C', '#FFF8DC', 'Bold red and cream'),
('Golden Yellow', '#FFD700', '#2F4F4F', 'Bright yellow with dark accents'),
('Purple Majesty', '#8B00FF', '#E6E6FA', 'Royal purple theme'),
('Orange Blast', '#FF4500', '#FFF8DC', 'Energetic orange'),
('Teal Wave', '#008080', '#F0FFFF', 'Cool teal waters'),
('Maroon Power', '#800000', '#F5F5DC', 'Deep maroon strength');

-- Cricket position reference data
CREATE TABLE IF NOT EXISTS public.cricket_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role playing_role NOT NULL,
    display_name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    description TEXT
);

INSERT INTO public.cricket_positions (role, display_name, abbreviation, description) VALUES
('BATSMAN', 'Batsman', 'BAT', 'Specialist in scoring runs'),
('BOWLER', 'Bowler', 'BWL', 'Specialist in taking wickets'),
('ALL_ROUNDER', 'All-Rounder', 'AR', 'Skilled in both batting and bowling'),
('WICKETKEEPER', 'Wicket-Keeper', 'WK', 'Specialist keeper and batsman');

-- Batting style reference
CREATE TABLE IF NOT EXISTS public.batting_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT
);

INSERT INTO public.batting_styles (name, description) VALUES
('Right-hand Bat', 'Right-handed batting stance'),
('Left-hand Bat', 'Left-handed batting stance');

-- Bowling style reference
CREATE TABLE IF NOT EXISTS public.bowling_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT
);

INSERT INTO public.bowling_styles (name, description, category) VALUES
('Right-arm Fast', 'Right-arm fast pace bowling', 'Pace'),
('Left-arm Fast', 'Left-arm fast pace bowling', 'Pace'),
('Right-arm Fast-medium', 'Right-arm medium-fast pace', 'Pace'),
('Left-arm Fast-medium', 'Left-arm medium-fast pace', 'Pace'),
('Right-arm Medium', 'Right-arm medium pace bowling', 'Pace'),
('Left-arm Medium', 'Left-arm medium pace bowling', 'Pace'),
('Right-arm Off-break', 'Right-arm off-spin bowling', 'Spin'),
('Left-arm Orthodox', 'Left-arm orthodox spin', 'Spin'),
('Right-arm Leg-break', 'Right-arm leg-spin bowling', 'Spin'),
('Left-arm Chinaman', 'Left-arm unorthodox spin', 'Spin');

-- Make these tables readable by all authenticated users
ALTER TABLE public.tier_color_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_color_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cricket_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batting_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowling_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reference data readable by all" ON public.tier_color_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reference data readable by all" ON public.team_color_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reference data readable by all" ON public.cricket_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reference data readable by all" ON public.batting_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reference data readable by all" ON public.bowling_styles FOR SELECT TO authenticated USING (true);