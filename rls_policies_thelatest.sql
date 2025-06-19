-- ==============================================
-- ROW LEVEL SECURITY POLICIES FOR CRUISE ANALYTICS
-- ==============================================
-- This file contains comprehensive RLS policies for the cruise analytics system
-- Based on thelatest.py Flask backend implementation and sailing_auth.yaml

-- Enable Row Level Security on all tables
ALTER TABLE Fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE Ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE Sailings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE Issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE Cruise_Ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserFleetAccess ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserShipAccess ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserSailingSheetAccess ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- SESSION CONTEXT FUNCTIONS (matches thelatest.py auth flow)
-- ==============================================

-- Function to get current user ID from session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(current_setting('app.user_id', true)::INTEGER, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role (matches sailing_auth.yaml roles)
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
-- USER AND ROLE MANAGEMENT POLICIES
-- ==============================================

-- Users table policies (supports thelatest.py auth endpoint)
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
        -- Only superadmin and admin can create users
        get_current_user_role() IN ('superadmin', 'admin')
    );

CREATE POLICY users_update_policy ON Users
    FOR UPDATE
    USING (
        -- Superadmin can update all users
        get_current_user_role() = 'superadmin' OR
        -- Admin can update users they created
        (get_current_user_role() = 'admin' AND created_by = get_current_user_id()) OR
        -- Users can update themselves (limited fields)
        (get_current_user_role() = 'user' AND id = get_current_user_id())
    );

CREATE POLICY users_delete_policy ON Users
    FOR DELETE
    USING (
        -- Only superadmin can delete users
        get_current_user_role() = 'superadmin'
    );

-- Roles table policies
CREATE POLICY roles_select_policy ON Roles
    FOR SELECT
    USING (
        -- All authenticated users can view roles
        get_current_user_role() IN ('superadmin', 'admin', 'user')
    );

-- ==============================================
-- FLEET AND SHIP ACCESS POLICIES (matches thelatest.py FLEET_DATA)
-- ==============================================

-- Fleets table policies (supports /sailing/fleets endpoint)
CREATE POLICY fleets_select_policy ON Fleets
    FOR SELECT
    USING (
        -- Superadmin can see all fleets
        get_current_user_role() = 'superadmin' OR
        -- Admin and users can see fleets they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         id IN (SELECT fleet_id FROM UserFleetAccess WHERE user_id = get_current_user_id()))
    );

-- Ships table policies (supports /sailing/ships endpoint)
CREATE POLICY ships_select_policy ON Ships
    FOR SELECT
    USING (
        -- Superadmin can see all ships
        get_current_user_role() = 'superadmin' OR
        -- Admin and users can see ships they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         (id IN (SELECT ship_id FROM UserShipAccess WHERE user_id = get_current_user_id()) OR
          fleet_id IN (SELECT fleet_id FROM UserFleetAccess WHERE user_id = get_current_user_id())))
    );

-- ==============================================
-- SAILING AND CRUISE DATA POLICIES (matches SQLOP.fetch_* functions)
-- ==============================================

-- Sailings table policies (supports /sailing/sailing_numbers* endpoints)
CREATE POLICY sailings_select_policy ON Sailings
    FOR SELECT
    USING (
        -- Superadmin can see all sailings
        get_current_user_role() = 'superadmin' OR
        -- Admin and users can see sailings for ships they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         ship_id IN (SELECT ship_id FROM UserShipAccess WHERE user_id = get_current_user_id() 
                     UNION 
                     SELECT s.id FROM Ships s 
                     JOIN UserFleetAccess ufa ON s.fleet_id = ufa.fleet_id 
                     WHERE ufa.user_id = get_current_user_id()))
    );

-- Cruise_Ratings table policies (supports /sailing/getRatingSmry endpoint)
CREATE POLICY cruise_ratings_select_policy ON Cruise_Ratings
    FOR SELECT
    USING (
        -- Superadmin can see all ratings
        get_current_user_role() = 'superadmin' OR
        -- Admin and users can see ratings for ships they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         LOWER(Ship) IN (SELECT LOWER(s.name) FROM Ships s 
                         JOIN UserShipAccess usa ON s.id = usa.ship_id 
                         WHERE usa.user_id = get_current_user_id()
                         UNION
                         SELECT LOWER(s.name) FROM Ships s 
                         JOIN UserFleetAccess ufa ON s.fleet_id = ufa.fleet_id 
                         WHERE ufa.user_id = get_current_user_id()))
    );

-- ==============================================
-- ISSUES AND SHEETS ACCESS POLICIES (matches thelatest.py SHEET_LIST)
-- ==============================================

-- Sheets table policies (supports /sailing/sheets endpoint)
CREATE POLICY sheets_select_policy ON Sheets
    FOR SELECT
    USING (
        -- All authenticated users can see sheet types
        get_current_user_role() IN ('superadmin', 'admin', 'user')
    );

-- Issues table policies (supports /sailing/getIssuesList endpoint)
CREATE POLICY issues_select_policy ON Issues
    FOR SELECT
    USING (
        -- Superadmin can see all issues
        get_current_user_role() = 'superadmin' OR
        -- Admin and users can see issues for sailings and sheets they have access to
        (get_current_user_role() IN ('admin', 'user') AND 
         sailing_id IN (SELECT s.id FROM Sailings s 
                       WHERE s.ship_id IN (SELECT ship_id FROM UserShipAccess WHERE user_id = get_current_user_id()
                                          UNION 
                                          SELECT sh.id FROM Ships sh 
                                          JOIN UserFleetAccess ufa ON sh.fleet_id = ufa.fleet_id 
                                          WHERE ufa.user_id = get_current_user_id())) AND
         (sheet_id IN (SELECT sheet_id FROM UserSailingSheetAccess 
                      WHERE user_id = get_current_user_id() AND sailing_id = Issues.sailing_id) OR
          get_current_user_role() = 'admin'))
    );

-- ==============================================
-- ACCESS CONTROL TABLE POLICIES
-- ==============================================

-- UserFleetAccess policies
CREATE POLICY user_fleet_access_select_policy ON UserFleetAccess
    FOR SELECT
    USING (
        -- Superadmin can see all access records
        get_current_user_role() = 'superadmin' OR
        -- Admin can see access for users they created
        (get_current_user_role() = 'admin' AND 
         user_id IN (SELECT id FROM Users WHERE created_by = get_current_user_id())) OR
        -- Users can see their own access
        (get_current_user_role() = 'user' AND user_id = get_current_user_id())
    );

CREATE POLICY user_fleet_access_insert_policy ON UserFleetAccess
    FOR INSERT
    WITH CHECK (
        -- Only superadmin and admin can grant fleet access
        get_current_user_role() IN ('superadmin', 'admin')
    );

CREATE POLICY user_fleet_access_delete_policy ON UserFleetAccess
    FOR DELETE
    USING (
        -- Only superadmin and admin can revoke fleet access
        get_current_user_role() IN ('superadmin', 'admin')
    );

-- UserShipAccess policies
CREATE POLICY user_ship_access_select_policy ON UserShipAccess
    FOR SELECT
    USING (
        -- Superadmin can see all access records
        get_current_user_role() = 'superadmin' OR
        -- Admin can see access for users they created
        (get_current_user_role() = 'admin' AND 
         user_id IN (SELECT id FROM Users WHERE created_by = get_current_user_id())) OR
        -- Users can see their own access
        (get_current_user_role() = 'user' AND user_id = get_current_user_id())
    );

CREATE POLICY user_ship_access_insert_policy ON UserShipAccess
    FOR INSERT
    WITH CHECK (
        -- Only superadmin and admin can grant ship access
        get_current_user_role() IN ('superadmin', 'admin')
    );

CREATE POLICY user_ship_access_delete_policy ON UserShipAccess
    FOR DELETE
    USING (
        -- Only superadmin and admin can revoke ship access
        get_current_user_role() IN ('superadmin', 'admin')
    );

-- UserSailingSheetAccess policies
CREATE POLICY user_sailing_sheet_access_select_policy ON UserSailingSheetAccess
    FOR SELECT
    USING (
        -- Superadmin can see all access records
        get_current_user_role() = 'superadmin' OR
        -- Admin can see access for users they created
        (get_current_user_role() = 'admin' AND 
         user_id IN (SELECT id FROM Users WHERE created_by = get_current_user_id())) OR
        -- Users can see their own access
        (get_current_user_role() = 'user' AND user_id = get_current_user_id())
    );

CREATE POLICY user_sailing_sheet_access_insert_policy ON UserSailingSheetAccess
    FOR INSERT
    WITH CHECK (
        -- Only superadmin and admin can grant sailing sheet access
        get_current_user_role() IN ('superadmin', 'admin')
    );

CREATE POLICY user_sailing_sheet_access_delete_policy ON UserSailingSheetAccess
    FOR DELETE
    USING (
        -- Only superadmin and admin can revoke sailing sheet access
        get_current_user_role() IN ('superadmin', 'admin')
    );

-- ==============================================
-- HELPER FUNCTIONS FOR THELATEST.PY INTEGRATION
-- ==============================================

-- Function to set user session context (called by thelatest.py after /sailing/auth)
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

-- Function to check if user has access to specific fleet
CREATE OR REPLACE FUNCTION user_has_fleet_access(p_user_id INTEGER, p_fleet_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM UserFleetAccess 
        WHERE user_id = p_user_id AND fleet_id = p_fleet_id
    ) OR EXISTS (
        SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
        WHERE u.id = p_user_id AND r.name = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to specific ship
CREATE OR REPLACE FUNCTION user_has_ship_access(p_user_id INTEGER, p_ship_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM UserShipAccess 
        WHERE user_id = p_user_id AND ship_id = p_ship_id
    ) OR EXISTS (
        SELECT 1 FROM UserFleetAccess ufa 
        JOIN Ships s ON ufa.fleet_id = s.fleet_id 
        WHERE ufa.user_id = p_user_id AND s.id = p_ship_id
    ) OR EXISTS (
        SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
        WHERE u.id = p_user_id AND r.name = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accessible ships for user (used by SQLOP.fetch_* functions)
CREATE OR REPLACE FUNCTION get_user_accessible_ships(p_user_id INTEGER)
RETURNS TABLE(ship_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT LOWER(s.name)::TEXT
    FROM Ships s
    WHERE EXISTS (
        SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.id 
        WHERE u.id = p_user_id AND r.name = 'superadmin'
    ) OR s.id IN (
        SELECT ship_id FROM UserShipAccess WHERE user_id = p_user_id
        UNION
        SELECT sh.id FROM Ships sh 
        JOIN UserFleetAccess ufa ON sh.fleet_id = ufa.fleet_id 
        WHERE ufa.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DATA SETUP AND INITIALIZATION (matches thelatest.py data)
-- ==============================================

-- Insert default roles (exactly matching sailing_auth.yaml)
INSERT INTO Roles (name) VALUES 
    ('superadmin'),
    ('admin'), 
    ('user')
ON CONFLICT (name) DO NOTHING;

-- Insert fleets (matching thelatest.py FLEET_DATA)
INSERT INTO Fleets (name) VALUES 
    ('marella')
ON CONFLICT (name) DO NOTHING;

-- Insert ships (matching thelatest.py FLEET_DATA ships list exactly)
INSERT INTO Ships (name, fleet_id) VALUES 
    ('explorer', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('discovery', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('discovery 2', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('explorer 2', (SELECT id FROM Fleets WHERE name = 'marella')),
    ('voyager', (SELECT id FROM Fleets WHERE name = 'marella'))
ON CONFLICT (name) DO NOTHING;

-- Insert sheets (matching thelatest.py SHEET_LIST exactly)
INSERT INTO Sheets (name) VALUES 
    ('Ports and Excursions'),
    ('Other Feedback'),
    ('Entertainment'),
    ('Bars'),
    ('Dining'),
    ('What went well'),
    ('What else')
ON CONFLICT (name) DO NOTHING;

-- Insert users from sailing_auth.yaml (with exact password hashes and roles)
INSERT INTO Users (username, password_hash, role_id) VALUES 
    ('admin', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdCpGWzxHEFSMeAqkY9YF9k5U6e3X.O6', 
     (SELECT id FROM Roles WHERE name = 'admin')),
    ('superadmin', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdCpGWzxHEFSMeAqkY9YF9k5U6e3X.O6', 
     (SELECT id FROM Roles WHERE name = 'superadmin')),
    ('demo', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdCpGWzxHEFSMeAqkY9YF9k5U6e3X.O6', 
     (SELECT id FROM Roles WHERE name = 'user')),
    ('guest', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdCpGWzxHEFSMeAqkY9YF9k5U6e3X.O6', 
     (SELECT id FROM Roles WHERE name = 'user'))
ON CONFLICT (username) DO NOTHING;

-- Grant demo and guest users access to all ships in marella fleet (default access)
INSERT INTO UserFleetAccess (user_id, fleet_id) VALUES 
    ((SELECT id FROM Users WHERE username = 'demo'), (SELECT id FROM Fleets WHERE name = 'marella')),
    ((SELECT id FROM Users WHERE username = 'guest'), (SELECT id FROM Fleets WHERE name = 'marella'))
ON CONFLICT (user_id, fleet_id) DO NOTHING;

-- ==============================================
-- COMMENTS AND THELATEST.PY INTEGRATION NOTES
-- ==============================================

/*
RLS POLICY SUMMARY FOR THELATEST.PY BACKEND:

1. AUTHENTICATION FLOW (thelatest.py /sailing/auth):
   - User authenticates with credentials from sailing_auth.yaml
   - Backend calls set_user_session() to establish RLS context
   - All subsequent database queries respect user's access level

2. ROLE HIERARCHY (matches sailing_auth.yaml):
   - superadmin: Full access to all data and user management
   - admin: Can manage users they created, access assigned fleets/ships
   - user: Can only access data for assigned fleets/ships (demo/guest)

3. ENDPOINT ACCESS CONTROL:
   - /sailing/ships: Filtered by accessible ships
   - /sailing/sailing_numbers*: Filtered by accessible ship sailings
   - /sailing/getRatingSmry: SQLOP.fetch_cruise_ratings() respects ship access
   - /sailing/getIssuesList: SQLOP.fetch_issues() respects sailing/sheet access
   - /sailing/semanticSearch: semantic_search() filtered by accessible ships
   - /sailing/getMetricRating: get_sailing_df() respects ship access

4. DATA STRUCTURE ALIGNMENT:
   - Fleet 'marella' with ships: explorer, discovery, discovery 2, explorer 2, voyager
   - Sheets: Ports and Excursions, Other Feedback, Entertainment, Bars, Dining, What went well, What else
   - Users: admin, superadmin, demo, guest (all with password 'admin123')
   - Cruise_Ratings table structure matches thelatest.py METRIC_ATTRIBUTES

5. BACKEND INTEGRATION REQUIREMENTS:
   - sql_ops.py functions must call set_user_session() before queries
   - Filter functions should use get_user_accessible_ships() for access control
   - Case-insensitive ship name matching (LOWER() functions)
   - Session context maintained throughout request lifecycle

6. FILTER LOGIC SUPPORT:
   - Date range filtering on Sailings (start_date, end_date)
   - Ship filtering respects user access permissions
   - Sailing number filtering within accessible ships only
   - Sheet access can be granular per sailing (admin bypasses)
*/
