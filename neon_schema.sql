-- ==============================================================================
-- UNIBOX LEAGUE 2026 - NEON POSTGRESQL DATABASE SCHEMA
-- Run this script in your Neon Dashboard: SQL Editor -> New Query -> Run
-- Website: https://neon.tech
-- ==============================================================================

-- 1. Enable UUID Extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    full_name TEXT NOT NULL,
    enrollment_no TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    gender TEXT NOT NULL,
    player_role TEXT NOT NULL,
    batting_style TEXT DEFAULT 'Right Hand Batter',
    bowling_style TEXT DEFAULT 'Right Arm Fast',
    avatar TEXT DEFAULT '🏏',
    certificate_name TEXT,
    certificate_data TEXT,
    photo_data TEXT,
    password_hash TEXT,
    base_price NUMERIC DEFAULT 15,
    sold_price NUMERIC DEFAULT NULL,
    sold_to_team TEXT DEFAULT NULL,
    sold_to_team_id TEXT DEFAULT NULL,
    auction_status TEXT DEFAULT 'Upcoming' NOT NULL,
    status TEXT DEFAULT 'Registered' NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_email ON public.players (email);
CREATE INDEX IF NOT EXISTS idx_players_enrollment ON public.players (enrollment_no);
CREATE INDEX IF NOT EXISTS idx_players_dept ON public.players (department);
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players (status);

-- 3. Create Admin Coordinators Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'Lead Coordinator' NOT NULL
);

-- Seed Default Admin Account (Username: admin | Password: aayush2410)
INSERT INTO public.admins (username, email, password_hash, role)
VALUES ('admin', 'admin@unibox.com', '62b2af84c3dec37c356a9374133e2f141e9e3ba6209f5d6ac58d9d2ab8095163', 'Lead Coordinator')
ON CONFLICT (username) DO NOTHING;

-- 4. Create Tournament Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    logo TEXT NOT NULL,
    color TEXT DEFAULT '#a3e635' NOT NULL,
    total_budget NUMERIC DEFAULT 100 NOT NULL,
    owner_name TEXT,
    owner_email TEXT,
    password_hash TEXT,
    owner_phone TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_owner_email ON public.teams (owner_email);

-- Seed 8 Default University Franchises (100 Points budget each)
INSERT INTO public.teams (id, name, department, logo, color, total_budget)
VALUES 
    ('team-btech', 'B.Tech Titans', 'B.Tech', '⚡', '#38bdf8', 100),
    ('team-bca', 'BCA Blasters', 'BCA', '🏏', '#a3e635', 100),
    ('team-bba', 'BBA Bulls', 'BBA', '🐂', '#fbbf24', 100),
    ('team-mca', 'MCA Mavericks', 'MCA', '🦅', '#34d399', 100),
    ('team-mba', 'MBA Monarchs', 'MBA', '👑', '#c084fc', 100),
    ('team-mtech', 'M.Tech Warriors', 'M.Tech', '🗡️', '#f43f5e', 100),
    ('team-diploma', 'Diploma Defenders', 'Diploma', '🛡️', '#6366f1', 100),
    ('team-phd', 'Ph.D Panthers', 'Ph.D', '🐾', '#ec4899', 100)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    logo = EXCLUDED.logo,
    color = EXCLUDED.color;
