-- ==============================================
-- DYNAMIC ROW LEVEL SECURITY POLICIES FOR CRUISE ANALYTICS
-- ==============================================
-- This file contains comprehensive RLS policies with dynamic access management
-- Superadmin can control all access permissions dynamically
-- Based on final_flask_with_rls.py and sql_ops_rls.py

-- Enable Row Level Security on all tables
ALTER TABLE Fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE Ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE Sailings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE Issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE Comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE Cruise_Ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserFleetAccess ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserShipAccess ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserSailingSheetAccess ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- SESSION CONTEXT FUNCTIONS
-- ==============================================

-- Function to get current user ID from session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(current_setting('app.user_id', true)::INTEGER, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(current_setting('app.user_role', true), 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current username
CREATE OR REPLACE FUNCTION get_current_username()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(current_setting('app.username', true), 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DYNAMIC ACCESS HELPER FUNCTIONS
-- ==============================================

-- Function to check if user has access to specific fleet
CREATE OR REPLACE FUNCTION user_has_fleet_access(p_user_id INTEGER, p_fleet_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Superadmin has access to everything
    IF EXISTS (SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
               WHERE u.id = p_user_id AND r.name = 'superadmin') THEN
        RETURN TRUE;
    END IF;
    
    -- Check explicit fleet access
    RETURN EXISTS (
        SELECT 1 FROM UserFleetAccess 
        WHERE user_id = p_user_id AND fleet_id = p_fleet_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to specific ship
CREATE OR REPLACE FUNCTION user_has_ship_access(p_user_id INTEGER, p_ship_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Superadmin has access to everything
    IF EXISTS (SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
               WHERE u.id = p_user_id AND r.name = 'superadmin') THEN
        RETURN TRUE;
    END IF;
    
    -- Check explicit ship access
    IF EXISTS (SELECT 1 FROM UserShipAccess 
               WHERE user_id = p_user_id AND ship_id = p_ship_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Check fleet-level access
    RETURN EXISTS (
        SELECT 1 FROM UserFleetAccess ufa 
        JOIN Ships s ON ufa.fleet_id = s.fleet_id 
        WHERE ufa.user_id = p_user_id AND s.id = p_ship_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to specific sailing
CREATE OR REPLACE FUNCTION user_has_sailing_access(p_user_id INTEGER, p_sailing_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Superadmin has access to everything
    IF EXISTS (SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
               WHERE u.id = p_user_id AND r.name = 'superadmin') THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has access to the ship this sailing belongs to
    RETURN EXISTS (
        SELECT 1 FROM Sailings s
        WHERE s.id = p_sailing_id 
        AND user_has_ship_access(p_user_id, s.ship_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all accessible ships for a user
CREATE OR REPLACE FUNCTION get_user_accessible_ships(p_user_id INTEGER)
RETURNS TABLE(ship_id INTEGER, ship_name TEXT) AS $$
BEGIN
    -- Superadmin gets all ships
    IF EXISTS (SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
               WHERE u.id = p_user_id AND r.name = 'superadmin') THEN
        RETURN QUERY
        SELECT s.id, s.name
        FROM Ships s;
    ELSE
        -- Regular users get ships based on their access permissions
        RETURN QUERY
        SELECT DISTINCT s.id, s.name
        FROM Ships s
        WHERE s.id IN (
            -- Direct ship access
            SELECT ship_id FROM UserShipAccess WHERE user_id = p_user_id
            UNION
            -- Fleet-level access
            SELECT s2.id FROM Ships s2 
            JOIN UserFleetAccess ufa ON s2.fleet_id = ufa.fleet_id 
            WHERE ufa.user_id = p_user_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- USER AND ROLE MANAGEMENT POLICIES
-- ==============================================

-- Users table policies
CREATE POLICY users_select_policy ON Users
    FOR SELECT
    USING (
        -- Superadmin can see all users
        get_current_user_role() = 'superadmin' OR
        -- Admin can see users they created or themselves
        (get_current_user_role() = 'admin' AND (created_by = get_current_user_id() OR id = get_current_user_id())) OR
        -- Regular users can only see themselves
        (get_current_user_role() = 'user' AND id = get_current_user_id())
    );

CREATE POLICY users_insert_policy ON Users
    FOR INSERT
    WITH CHECK (
        -- Superadmin can create any users
        get_current_user_role() = 'superadmin' OR
        -- Admin can create normal users only
        (get_current_user_role() = 'admin' AND 
         EXISTS (SELECT 1 FROM Roles WHERE id = NEW.role_id AND name = 'user'))
    );

CREATE POLICY users_update_policy ON Users
    FOR UPDATE
    USING (
        -- Superadmin can update all users
        get_current_user_role() = 'superadmin' OR
        -- Users can update themselves (limited fields)
        (get_current_user_role() IN ('admin', 'user') AND id = get_current_user_id())
    );

CREATE POLICY users_delete_policy ON Users
    FOR DELETE
    USING (
        -- Superadmin can delete any user (except themselves)
        (get_current_user_role() = 'superadmin' AND id != get_current_user_id()) OR
        -- Admin can delete users they created (but not other admins/superadmins)
        (get_current_user_role() = 'admin' AND 
         created_by = get_current_user_id() AND
         id NOT IN (SELECT u.id FROM Users u JOIN Roles r ON u.role_id = r.id 
                   WHERE r.name IN ('admin', 'superadmin')))
    );

-- Roles table policies
CREATE POLICY roles_select_policy ON Roles
    FOR SELECT
    USING (
        -- All authenticated users can view roles
        get_current_user_role() IN ('superadmin', 'admin', 'user')
    );

-- ==============================================
-- FLEET AND SHIP ACCESS POLICIES (DYNAMIC)
-- ==============================================

-- Fleets table policies
CREATE POLICY fleets_select_policy ON Fleets
    FOR SELECT
    USING (
        -- Superadmin can see all fleets
        get_current_user_role() = 'superadmin' OR
        -- Others can see fleets they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         user_has_fleet_access(get_current_user_id(), id))
    );

-- Ships table policies
CREATE POLICY ships_select_policy ON Ships
    FOR SELECT
    USING (
        -- Superadmin can see all ships
        get_current_user_role() = 'superadmin' OR
        -- Others can see ships they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         user_has_ship_access(get_current_user_id(), id))
    );

-- ==============================================
-- SAILING AND CRUISE DATA POLICIES (DYNAMIC)
-- ==============================================

-- Sailings table policies
CREATE POLICY sailings_select_policy ON Sailings
    FOR SELECT
    USING (
        -- Superadmin can see all sailings
        get_current_user_role() = 'superadmin' OR
        -- Others can see sailings for ships they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         user_has_ship_access(get_current_user_id(), ship_id))
    );

-- Cruise_Ratings table policies
CREATE POLICY cruise_ratings_select_policy ON Cruise_Ratings
    FOR SELECT
    USING (
        -- Superadmin can see all ratings
        get_current_user_role() = 'superadmin' OR
        -- Others can see ratings for ships they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         LOWER("Ship") IN (SELECT LOWER(ship_name) FROM get_user_accessible_ships(get_current_user_id())))
    );

-- ==============================================
-- ISSUES AND COMMENTS ACCESS POLICIES (DYNAMIC)
-- ==============================================

-- Sheets table policies (all users can see sheet types)
CREATE POLICY sheets_select_policy ON Sheets
    FOR SELECT
    USING (
        get_current_user_role() IN ('superadmin', 'admin', 'user')
    );

-- Issues table policies
CREATE POLICY issues_select_policy ON Issues
    FOR SELECT
    USING (
        -- Superadmin can see all issues
        get_current_user_role() = 'superadmin' OR
        -- Others can see issues for sailings they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         user_has_sailing_access(get_current_user_id(), sailing_id))
    );

-- Comments table policies
CREATE POLICY comments_select_policy ON Comments
    FOR SELECT
    USING (
        -- Superadmin can see all comments
        get_current_user_role() = 'superadmin' OR
        -- Others can see comments for sailings they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         user_has_sailing_access(get_current_user_id(), sailing_id))
    );

-- ==============================================
-- ACCESS CONTROL TABLE POLICIES (DYNAMIC MANAGEMENT)
-- ==============================================

-- UserFleetAccess policies
CREATE POLICY user_fleet_access_select_policy ON UserFleetAccess
    FOR SELECT
    USING (
        -- Superadmin can see all access records
        get_current_user_role() = 'superadmin' OR
        -- Users can see their own access
        (get_current_user_role() IN ('admin', 'user') AND user_id = get_current_user_id())
    );

CREATE POLICY user_fleet_access_insert_policy ON UserFleetAccess
    FOR INSERT
    WITH CHECK (
        -- Superadmin can grant any fleet access
        get_current_user_role() = 'superadmin' OR
        -- Admin can grant fleet access they possess
        (get_current_user_role() = 'admin' AND 
         user_has_fleet_access(get_current_user_id(), fleet_id))
    );

CREATE POLICY user_fleet_access_delete_policy ON UserFleetAccess
    FOR DELETE
    USING (
        -- Superadmin can revoke any fleet access
        get_current_user_role() = 'superadmin' OR
        -- Admin can revoke fleet access they granted or possess
        (get_current_user_role() = 'admin' AND 
         (granted_by = get_current_user_id() OR 
          user_has_fleet_access(get_current_user_id(), fleet_id)))
    );

-- UserShipAccess policies
CREATE POLICY user_ship_access_select_policy ON UserShipAccess
    FOR SELECT
    USING (
        -- Superadmin can see all access records
        get_current_user_role() = 'superadmin' OR
        -- Users can see their own access
        (get_current_user_role() IN ('admin', 'user') AND user_id = get_current_user_id())
    );

CREATE POLICY user_ship_access_insert_policy ON UserShipAccess
    FOR INSERT
    WITH CHECK (
        -- Superadmin can grant any ship access
        get_current_user_role() = 'superadmin' OR
        -- Admin can grant ship access they possess
        (get_current_user_role() = 'admin' AND 
         user_has_ship_access(get_current_user_id(), ship_id))
    );

CREATE POLICY user_ship_access_delete_policy ON UserShipAccess
    FOR DELETE
    USING (
        -- Superadmin can revoke any ship access
        get_current_user_role() = 'superadmin' OR
        -- Admin can revoke ship access they granted or possess
        (get_current_user_role() = 'admin' AND 
         (granted_by = get_current_user_id() OR 
          user_has_ship_access(get_current_user_id(), ship_id)))
    );

-- UserSailingSheetAccess policies
CREATE POLICY user_sailing_sheet_access_select_policy ON UserSailingSheetAccess
    FOR SELECT
    USING (
        -- Superadmin can see all access records
        get_current_user_role() = 'superadmin' OR
        -- Users can see their own access
        (get_current_user_role() IN ('admin', 'user') AND user_id = get_current_user_id())
    );

CREATE POLICY user_sailing_sheet_access_insert_policy ON UserSailingSheetAccess
    FOR INSERT
    WITH CHECK (
        -- Only superadmin can grant sailing sheet access
        get_current_user_role() = 'superadmin'
    );

CREATE POLICY user_sailing_sheet_access_delete_policy ON UserSailingSheetAccess
    FOR DELETE
    USING (
        -- Only superadmin can revoke sailing sheet access
        get_current_user_role() = 'superadmin'
    );

-- ==============================================
-- SESSION MANAGEMENT FUNCTIONS
-- ==============================================

-- Function to set user session context
CREATE OR REPLACE FUNCTION set_user_session(p_user_id INTEGER, p_username TEXT, p_role TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.username', p_username, true);
    PERFORM set_config('app.user_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear user session
CREATE OR REPLACE FUNCTION clear_user_session()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', '', true);
    PERFORM set_config('app.username', '', true);
    PERFORM set_config('app.user_role', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DATA SETUP AND INITIALIZATION
-- ==============================================

-- Insert default roles
INSERT INTO Roles (name) VALUES 
    ('superadmin'),
    ('admin'), 
    ('user')
ON CONFLICT (name) DO NOTHING;

-- Insert fleets (matching Flask app FLEET_DATA)
INSERT INTO Fleets (name) VALUES 
    ('marella')
ON CONFLICT (name) DO NOTHING;

-- Insert ships (matching Flask app FLEET_DATA exactly)
INSERT INTO Ships (name, fleet_id) VALUES 
    ('explorer', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('discovery', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('discovery 2', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('explorer 2', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('voyager', (SELECT id FROM Fleets WHERE name = 'marella'))
ON CONFLICT (name) DO NOTHING;

-- Insert sheets (matching Flask app SHEET_LIST exactly)
INSERT INTO Sheets (name) VALUES 
    ('Ports and Excursions'),
    ('Other Feedback'),
    ('Entertainment'),
    ('Bars'),
    ('Dining'),
    ('What went well'),
    ('What else')
ON CONFLICT (name) DO NOTHING;

-- Create default superadmin user (if not exists from YAML)
INSERT INTO Users (username, password_hash, role_id) VALUES 
    ('superadmin', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdCpGWzxHEFSMeAqkY9YF9k5U6e3X.O6', 
     (SELECT id FROM Roles WHERE name = 'superadmin'))
ON CONFLICT (username) DO NOTHING;

-- ==============================================
-- DYNAMIC ACCESS MANAGEMENT FUNCTIONS
-- ==============================================

-- Function to grant default access based on role
CREATE OR REPLACE FUNCTION grant_default_access(p_user_id INTEGER, p_role TEXT)
RETURNS VOID AS $$
BEGIN
    -- Default access for regular users: marella fleet
    IF p_role = 'user' THEN
        INSERT INTO UserFleetAccess (user_id, fleet_id)
        VALUES (p_user_id, (SELECT id FROM Fleets WHERE name = 'marella'))
        ON CONFLICT (user_id, fleet_id) DO NOTHING;
    END IF;
    
    -- Admin gets marella fleet by default (can be changed by superadmin)
    IF p_role = 'admin' THEN
        INSERT INTO UserFleetAccess (user_id, fleet_id)
        VALUES (p_user_id, (SELECT id FROM Fleets WHERE name = 'marella'))
        ON CONFLICT (user_id, fleet_id) DO NOTHING;
    END IF;
    
    -- Superadmin gets full access automatically (no explicit grants needed)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk grant access (for superadmin convenience)
CREATE OR REPLACE FUNCTION bulk_grant_fleet_access(p_user_ids INTEGER[], p_fleet_id INTEGER)
RETURNS VOID AS $$
DECLARE
    user_id INTEGER;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO UserFleetAccess (user_id, fleet_id)
        VALUES (user_id, p_fleet_id)
        ON CONFLICT (user_id, fleet_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk grant ship access
CREATE OR REPLACE FUNCTION bulk_grant_ship_access(p_user_ids INTEGER[], p_ship_id INTEGER)
RETURNS VOID AS $$
DECLARE
    user_id INTEGER;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO UserShipAccess (user_id, ship_id)
        VALUES (user_id, p_ship_id)
        ON CONFLICT (user_id, ship_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to copy access permissions from one user to another
CREATE OR REPLACE FUNCTION copy_user_access(p_source_user_id INTEGER, p_target_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Copy fleet access
    INSERT INTO UserFleetAccess (user_id, fleet_id)
    SELECT p_target_user_id, fleet_id
    FROM UserFleetAccess
    WHERE user_id = p_source_user_id
    ON CONFLICT (user_id, fleet_id) DO NOTHING;
    
    -- Copy ship access
    INSERT INTO UserShipAccess (user_id, ship_id)
    SELECT p_target_user_id, ship_id
    FROM UserShipAccess
    WHERE user_id = p_source_user_id
    ON CONFLICT (user_id, ship_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- AUDIT AND MONITORING FUNCTIONS
-- ==============================================

-- Function to log access attempts (for monitoring)
CREATE OR REPLACE FUNCTION log_access_attempt(p_user_id INTEGER, p_resource_type TEXT, p_resource_id INTEGER, p_granted BOOLEAN)
RETURNS VOID AS $$
BEGIN
    -- This could insert into an audit log table
    -- For now, just use PostgreSQL log
    PERFORM pg_advisory_lock(1);
    RAISE NOTICE 'ACCESS_LOG: User % attempted % access to % %: %', 
        p_user_id, p_resource_type, p_resource_type, p_resource_id, 
        CASE WHEN p_granted THEN 'GRANTED' ELSE 'DENIED' END;
    PERFORM pg_advisory_unlock(1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- COMMENTS AND DOCUMENTATION
-- ==============================================

/*
DYNAMIC RLS POLICY SUMMARY:

1. SUPERADMIN CONTROL:
   - Superadmin can create/delete users dynamically
   - Superadmin can grant/revoke any access permissions
   - Superadmin has full visibility into all data
   - All access control managed through API endpoints

2. DEFAULT ACCESS PATTERNS:
   - New users get marella fleet access by default
   - Access can be customized per user by superadmin
   - Fleet access grants access to all ships in that fleet
   - Ship access can be granted individually for granular control

3. DYNAMIC FEATURES:
   - Runtime user creation and permission management
   - Bulk access management functions
   - Access copying between users
   - Real-time permission changes without restart

4. INTEGRATION WITH FLASK APP:
   - All endpoints respect RLS policies automatically
   - Session context maintained throughout request lifecycle
   - User management API endpoints for superadmin
   - Fallback to YAML auth with database synchronization

5. SECURITY FEATURES:
   - Role-based policy enforcement
   - Session-based access control
   - Audit logging capabilities
   - Secure function execution with SECURITY DEFINER

6. SCALABILITY:
   - Efficient access checking functions
   - Bulk operations for large user bases
   - Optimized queries for common access patterns
   - Minimal performance impact on data queries
*/
