-- Row-Level Security (RLS) Setup for AI Exercise Coach
-- This script sets up comprehensive row-level security policies

-- Enable RLS on all user-related tables
ALTER TABLE ai_exercise_coach.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exercise_coach.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exercise_coach.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exercise_coach.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Create additional tables for comprehensive data isolation
CREATE TABLE IF NOT EXISTS ai_exercise_coach.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ai_exercise_coach.users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

CREATE TABLE IF NOT EXISTS ai_exercise_coach.coaching_cues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ai_exercise_coach.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES ai_exercise_coach.workout_sessions(id) ON DELETE CASCADE,
    cue_type VARCHAR(20) NOT NULL CHECK (cue_type IN ('safety', 'form', 'tempo', 'motivation', 'instruction')),
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 10),
    message TEXT NOT NULL,
    tts_text TEXT,
    body_part VARCHAR(50),
    exercise_phase VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_exercise_coach.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ai_exercise_coach.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS ai_exercise_coach.export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ai_exercise_coach.users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('pdf', 'csv', 'json')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_path TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on new tables
ALTER TABLE ai_exercise_coach.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exercise_coach.coaching_cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exercise_coach.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exercise_coach.export_requests ENABLE ROW LEVEL SECURITY;

-- Create application roles
DO $$
BEGIN
    -- Application service role (for backend API)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_coach_app') THEN
        CREATE ROLE ai_coach_app;
    END IF;
    
    -- Worker service role (for Python workers)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_coach_worker') THEN
        CREATE ROLE ai_coach_worker;
    END IF;
    
    -- Analytics role (read-only for reporting)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_coach_analytics') THEN
        CREATE ROLE ai_coach_analytics;
    END IF;
END
$$;

-- Grant basic permissions
GRANT USAGE ON SCHEMA ai_exercise_coach TO ai_coach_app, ai_coach_worker, ai_coach_analytics;

-- Grant table permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai_exercise_coach TO ai_coach_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ai_exercise_coach TO ai_coach_app;

-- Grant limited permissions to worker role
GRANT SELECT, INSERT, UPDATE ON ai_exercise_coach.workout_sessions TO ai_coach_worker;
GRANT SELECT, INSERT, UPDATE ON ai_exercise_coach.exercise_sets TO ai_coach_worker;
GRANT SELECT, INSERT, UPDATE ON ai_exercise_coach.coaching_cues TO ai_coach_worker;
GRANT SELECT ON ai_exercise_coach.users TO ai_coach_worker;
GRANT SELECT ON ai_exercise_coach.user_profiles TO ai_coach_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ai_exercise_coach TO ai_coach_worker;

-- Grant read-only permissions to analytics role
GRANT SELECT ON ALL TABLES IN SCHEMA ai_exercise_coach TO ai_coach_analytics;

-- Create RLS policies for users table
CREATE POLICY users_isolation ON ai_exercise_coach.users
    FOR ALL
    TO ai_coach_app
    USING (id = current_setting('app.current_user_id')::uuid);

-- Allow users to see their own profile
CREATE POLICY users_self_select ON ai_exercise_coach.users
    FOR SELECT
    TO ai_coach_app
    USING (id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for user_profiles table
CREATE POLICY user_profiles_isolation ON ai_exercise_coach.user_profiles
    FOR ALL
    TO ai_coach_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for workout_sessions table
CREATE POLICY workout_sessions_isolation ON ai_exercise_coach.workout_sessions
    FOR ALL
    TO ai_coach_app, ai_coach_worker
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for exercise_sets table
CREATE POLICY exercise_sets_isolation ON ai_exercise_coach.exercise_sets
    FOR ALL
    TO ai_coach_app, ai_coach_worker
    USING (
        session_id IN (
            SELECT id FROM ai_exercise_coach.workout_sessions 
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Create RLS policies for user_preferences table
CREATE POLICY user_preferences_isolation ON ai_exercise_coach.user_preferences
    FOR ALL
    TO ai_coach_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for coaching_cues table
CREATE POLICY coaching_cues_isolation ON ai_exercise_coach.coaching_cues
    FOR ALL
    TO ai_coach_app, ai_coach_worker
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for user_achievements table
CREATE POLICY user_achievements_isolation ON ai_exercise_coach.user_achievements
    FOR ALL
    TO ai_coach_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for export_requests table
CREATE POLICY export_requests_isolation ON ai_exercise_coach.export_requests
    FOR ALL
    TO ai_coach_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Allow workers to insert coaching cues for any user (but only read their own)
CREATE POLICY coaching_cues_worker_insert ON ai_exercise_coach.coaching_cues
    FOR INSERT
    TO ai_coach_worker
    WITH CHECK (true);

-- Allow analytics role to read aggregated data (no user-specific data)
CREATE POLICY analytics_aggregated_only ON ai_exercise_coach.workout_sessions
    FOR SELECT
    TO ai_coach_analytics
    USING (false); -- Deny by default, will use specific views

-- Create secure views for analytics
CREATE OR REPLACE VIEW ai_exercise_coach.analytics_session_summary AS
SELECT 
    DATE_TRUNC('day', started_at) as session_date,
    COUNT(*) as total_sessions,
    AVG(total_duration) as avg_duration,
    COUNT(DISTINCT user_id) as unique_users
FROM ai_exercise_coach.workout_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', started_at);

CREATE OR REPLACE VIEW ai_exercise_coach.analytics_exercise_popularity AS
SELECT 
    exercise_name,
    COUNT(*) as total_sets,
    AVG(actual_reps) as avg_reps,
    AVG(form_score) as avg_form_score
FROM ai_exercise_coach.exercise_sets es
JOIN ai_exercise_coach.workout_sessions ws ON es.session_id = ws.id
WHERE ws.started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY exercise_name
ORDER BY total_sets DESC;

-- Grant access to analytics views
GRANT SELECT ON ai_exercise_coach.analytics_session_summary TO ai_coach_analytics;
GRANT SELECT ON ai_exercise_coach.analytics_exercise_popularity TO ai_coach_analytics;

-- Create function to set user context
CREATE OR REPLACE FUNCTION ai_exercise_coach.set_user_context(user_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on context function
GRANT EXECUTE ON FUNCTION ai_exercise_coach.set_user_context(UUID) TO ai_coach_app, ai_coach_worker;

-- Create function to get current user context
CREATE OR REPLACE FUNCTION ai_exercise_coach.get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on get context function
GRANT EXECUTE ON FUNCTION ai_exercise_coach.get_current_user_id() TO ai_coach_app, ai_coach_worker, ai_coach_analytics;

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS ai_exercise_coach.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES ai_exercise_coach.users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on audit log (users can only see their own audit entries)
ALTER TABLE ai_exercise_coach.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_isolation ON ai_exercise_coach.audit_log
    FOR SELECT
    TO ai_coach_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Allow application to insert audit logs for any user
CREATE POLICY audit_log_insert ON ai_exercise_coach.audit_log
    FOR INSERT
    TO ai_coach_app
    WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION ai_exercise_coach.audit_trigger()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO ai_exercise_coach.audit_log (
            user_id, action, table_name, record_id, old_values
        ) VALUES (
            OLD.user_id,
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO ai_exercise_coach.audit_log (
            user_id, action, table_name, record_id, old_values, new_values
        ) VALUES (
            NEW.user_id,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO ai_exercise_coach.audit_log (
            user_id, action, table_name, record_id, new_values
        ) VALUES (
            NEW.user_id,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers on sensitive tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ai_exercise_coach.users
    FOR EACH ROW EXECUTE FUNCTION ai_exercise_coach.audit_trigger();

CREATE TRIGGER audit_workout_sessions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ai_exercise_coach.workout_sessions
    FOR EACH ROW EXECUTE FUNCTION ai_exercise_coach.audit_trigger();

CREATE TRIGGER audit_export_requests_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ai_exercise_coach.export_requests
    FOR EACH ROW EXECUTE FUNCTION ai_exercise_coach.audit_trigger();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON ai_exercise_coach.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_cues_user_id ON ai_exercise_coach.coaching_cues(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_cues_session_id ON ai_exercise_coach.coaching_cues(session_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON ai_exercise_coach.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON ai_exercise_coach.export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON ai_exercise_coach.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON ai_exercise_coach.audit_log(created_at);

-- Create data retention policy function
CREATE OR REPLACE FUNCTION ai_exercise_coach.cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old audit logs (keep 1 year)
    DELETE FROM ai_exercise_coach.audit_log 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
    
    -- Delete old export requests (keep 30 days)
    DELETE FROM ai_exercise_coach.export_requests 
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
    AND status IN ('completed', 'failed');
    
    -- Delete expired coaching cues (keep 7 days)
    DELETE FROM ai_exercise_coach.coaching_cues 
    WHERE created_at < CURRENT_DATE - INTERVAL '7 days';
    
    RAISE NOTICE 'Data cleanup completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function to app role
GRANT EXECUTE ON FUNCTION ai_exercise_coach.cleanup_old_data() TO ai_coach_app;

COMMIT;
