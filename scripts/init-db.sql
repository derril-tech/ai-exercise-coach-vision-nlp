-- Initialize AI Exercise Coach Database
-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create database schema
CREATE SCHEMA IF NOT EXISTS ai_exercise_coach;

-- Set default search path
SET search_path TO ai_exercise_coach, public;

-- Create initial tables (basic structure)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    fitness_level VARCHAR(20) CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    goals TEXT[],
    injuries TEXT[],
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    reps INTEGER,
    duration_seconds INTEGER,
    form_score DECIMAL(3,2),
    tempo_score DECIMAL(3,2),
    rom_score DECIMAL(3,2),
    pose_data JSONB,
    cues_given TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_id ON exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_name ON exercise_sets(exercise_name);

-- Insert sample data for development
INSERT INTO users (email, username, password_hash, first_name, last_name) 
VALUES 
    ('demo@example.com', 'demo_user', '$2b$10$example_hash', 'Demo', 'User'),
    ('coach@example.com', 'ai_coach', '$2b$10$example_hash', 'AI', 'Coach')
ON CONFLICT (email) DO NOTHING;

COMMIT;
