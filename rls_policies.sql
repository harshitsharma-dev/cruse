-- ===================================
-- CRUISE ANALYTICS ROW-LEVEL SECURITY (RLS) POLICIES
-- ===================================
-- Based on Apollo Intelligence Dashboard Requirements
-- Supports three user roles: superadmin, admin, user
-- ===================================

-- Enable Row Level Security on all relevant tables
ALTER TABLE Fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE Ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE Sailings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE Cruise_Ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserFleetAccess ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserShipAccess ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserSailingSheetAccess ENABLE ROW LEVEL SECURITY;

-- ===================================
-- USER CONTEXT FUNCTIONS
-- ===================================

-- Function to get current user's ID from session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_user_id', true)::INTEGER, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_user_role', true), 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or superadmin
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- FLEET ACCESS POLICIES
-- ===================================

-- FLEETS TABLE POLICIES
-- Superadmin: Full access to all fleets
-- Admin: Access to all fleets (read-only for operational purposes)
-- User: Access only to fleets they are explicitly granted access to

CREATE POLICY "superadmin_fleets_all" ON Fleets
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_fleets_select" ON Fleets
    FOR SELECT TO authenticated
    USING (is_admin_or_above());

CREATE POLICY "user_fleets_select" ON Fleets
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND id IN (
            SELECT fleet_id 
            FROM UserFleetAccess 
            WHERE user_id = get_current_user_id()
        )
    );

-- ===================================
-- SHIP ACCESS POLICIES
-- ===================================

-- SHIPS TABLE POLICIES
-- Superadmin: Full access to all ships
-- Admin: Access to all ships (read-only for operational purposes)
-- User: Access only to ships in their permitted fleets OR explicitly granted ships

CREATE POLICY "superadmin_ships_all" ON Ships
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_ships_select" ON Ships
    FOR SELECT TO authenticated
    USING (is_admin_or_above());

CREATE POLICY "user_ships_select" ON Ships
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND (
            -- Ships in fleets user has access to
            fleet_id IN (
                SELECT fleet_id 
                FROM UserFleetAccess 
                WHERE user_id = get_current_user_id()
            )
            OR
            -- Ships explicitly granted to user
            id IN (
                SELECT ship_id 
                FROM UserShipAccess 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- ===================================
-- SAILING ACCESS POLICIES
-- ===================================

-- SAILINGS TABLE POLICIES
-- Controls access to sailing data based on ship access
-- Users can only see sailings for ships they have access to

CREATE POLICY "superadmin_sailings_all" ON Sailings
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_sailings_select" ON Sailings
    FOR SELECT TO authenticated
    USING (is_admin_or_above());

CREATE POLICY "user_sailings_select" ON Sailings
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND ship_id IN (
            SELECT s.id 
            FROM Ships s
            WHERE s.fleet_id IN (
                SELECT fleet_id 
                FROM UserFleetAccess 
                WHERE user_id = get_current_user_id()
            )
            OR s.id IN (
                SELECT ship_id 
                FROM UserShipAccess 
                WHERE user_id = get_current_user_id()
            )
        )
    );

-- ===================================
-- CRUISE RATINGS ACCESS POLICIES
-- ===================================

-- CRUISE_RATINGS TABLE POLICIES
-- Controls access to ratings data based on ship/fleet access
-- This is the main customer-facing data

CREATE POLICY "superadmin_ratings_all" ON Cruise_Ratings
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_ratings_select" ON Cruise_Ratings
    FOR SELECT TO authenticated
    USING (is_admin_or_above());

CREATE POLICY "user_ratings_select" ON Cruise_Ratings
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND (
            -- Check if user has access to this ship via fleet access
            Ship IN (
                SELECT s.name 
                FROM Ships s 
                JOIN UserFleetAccess ufa ON s.fleet_id = ufa.fleet_id
                WHERE ufa.user_id = get_current_user_id()
            )
            OR
            -- Check if user has direct ship access
            Ship IN (
                SELECT s.name 
                FROM Ships s 
                JOIN UserShipAccess usa ON s.id = usa.ship_id
                WHERE usa.user_id = get_current_user_id()
            )
        )
    );

-- ===================================
-- ISSUES ACCESS POLICIES
-- ===================================

-- ISSUES TABLE POLICIES
-- Controls access to issues data based on sailing and sheet access
-- Users need both sailing access AND sheet access to see issues

CREATE POLICY "superadmin_issues_all" ON Issues
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_issues_select" ON Issues
    FOR SELECT TO authenticated
    USING (is_admin_or_above());

CREATE POLICY "user_issues_select" ON Issues
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND sailing_id IN (
            -- User has access to the sailing
            SELECT s.id 
            FROM Sailings s
            JOIN Ships sh ON s.ship_id = sh.id
            WHERE sh.fleet_id IN (
                SELECT fleet_id 
                FROM UserFleetAccess 
                WHERE user_id = get_current_user_id()
            )
            OR sh.id IN (
                SELECT ship_id 
                FROM UserShipAccess 
                WHERE user_id = get_current_user_id()
            )
        )
        AND (
            -- User has access to this specific sheet for this sailing
            EXISTS (
                SELECT 1 
                FROM UserSailingSheetAccess ussa
                WHERE ussa.user_id = get_current_user_id()
                AND ussa.sailing_id = Issues.sailing_id
                AND ussa.sheet_id = Issues.sheet_id
            )
            OR
            -- Admin override for operational sheets (if user has admin privileges)
            is_admin_or_above()
        )
    );

-- ===================================
-- USER MANAGEMENT POLICIES
-- ===================================

-- USERS TABLE POLICIES
-- Superadmin: Can see and manage all users
-- Admin: Can see users they created and regular users
-- User: Can only see their own profile

CREATE POLICY "superadmin_users_all" ON Users
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_users_manage" ON Users
    FOR ALL TO authenticated
    USING (
        is_admin_or_above() 
        AND (
            created_by = get_current_user_id()  -- Users they created
            OR role_id IN (SELECT id FROM Roles WHERE name = 'user')  -- All regular users
            OR id = get_current_user_id()  -- Their own profile
        )
    );

CREATE POLICY "user_own_profile" ON Users
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND id = get_current_user_id()
    );

-- ===================================
-- ACCESS CONTROL TABLE POLICIES
-- ===================================

-- USER FLEET ACCESS POLICIES
-- Controls who can see and modify fleet access permissions

CREATE POLICY "superadmin_fleet_access_all" ON UserFleetAccess
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_fleet_access_manage" ON UserFleetAccess
    FOR ALL TO authenticated
    USING (
        is_admin_or_above() 
        AND user_id IN (
            SELECT id FROM Users 
            WHERE created_by = get_current_user_id() 
            OR role_id IN (SELECT id FROM Roles WHERE name = 'user')
        )
    );

CREATE POLICY "user_fleet_access_view" ON UserFleetAccess
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND user_id = get_current_user_id()
    );

-- USER SHIP ACCESS POLICIES
CREATE POLICY "superadmin_ship_access_all" ON UserShipAccess
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_ship_access_manage" ON UserShipAccess
    FOR ALL TO authenticated
    USING (
        is_admin_or_above() 
        AND user_id IN (
            SELECT id FROM Users 
            WHERE created_by = get_current_user_id() 
            OR role_id IN (SELECT id FROM Roles WHERE name = 'user')
        )
    );

CREATE POLICY "user_ship_access_view" ON UserShipAccess
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND user_id = get_current_user_id()
    );

-- USER SAILING SHEET ACCESS POLICIES
CREATE POLICY "superadmin_sheet_access_all" ON UserSailingSheetAccess
    FOR ALL TO authenticated
    USING (is_superadmin());

CREATE POLICY "admin_sheet_access_manage" ON UserSailingSheetAccess
    FOR ALL TO authenticated
    USING (
        is_admin_or_above() 
        AND user_id IN (
            SELECT id FROM Users 
            WHERE created_by = get_current_user_id() 
            OR role_id IN (SELECT id FROM Roles WHERE name = 'user')
        )
    );

CREATE POLICY "user_sheet_access_view" ON UserSailingSheetAccess
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'user' 
        AND user_id = get_current_user_id()
    );

-- ===================================
-- REFERENCE TABLES (No RLS needed typically)
-- ===================================

-- SHEETS TABLE - Generally readable by all authenticated users
-- Users need to know what sheets exist to request access
CREATE POLICY "authenticated_sheets_select" ON Sheets
    FOR SELECT TO authenticated
    USING (true);

-- ROLES TABLE - Readable by admins for user management
CREATE POLICY "admin_roles_select" ON Roles
    FOR SELECT TO authenticated
    USING (is_admin_or_above());

-- ===================================
-- FRONTEND COMPONENT ACCESS CONTROL
-- ===================================

/*
FRONTEND COMPONENT ACCESS BY ROLE:

SUPERADMIN ACCESS:
- Dashboard: Full access to all metrics and data
- Rating Summary: All ships, all fleets, all ratings data
- Metric Filter: All metrics and filters available
- Search: Can search across all ships, fleets, sailings
- Issues: Can see all issues across all ships and sheets
- Profile: Can manage own profile and see user management
- Users: Full user management - create, edit, delete users and permissions

ADMIN ACCESS:
- Dashboard: Full access to all metrics and data (read-only operational view)
- Rating Summary: All ships, all fleets, all ratings data
- Metric Filter: All metrics and filters available
- Search: Can search across all ships, fleets, sailings
- Issues: Can see all issues across all ships and sheets
- Profile: Can manage own profile
- Users: Can manage users they created and regular users

USER ACCESS:
- Dashboard: Limited to their assigned fleets/ships data only
- Rating Summary: Only ships/fleets they have access to
- Metric Filter: Only metrics for their accessible ships/fleets
- Search: Only search within their accessible ships/fleets/sailings
- Issues: Only issues for sailings they have access to AND sheets they're granted
- Profile: Can only view/edit their own profile
- Users: No access to user management

DATA FILTERING BY ROLE:
- All API endpoints should check user session and apply RLS automatically
- Frontend filters should be populated based on user's accessible data only
- Charts and summaries should only include data user has access to
- Export functions should only export permitted data

SHEET-LEVEL ACCESS FOR USERS:
- Users may have different access to different types of issues/sheets
- For example: Operations staff might see "Maintenance Issues" but not "Guest Complaints"
- Sales team might see "Booking Issues" but not "Crew Issues"
- This granular control is handled via UserSailingSheetAccess table
*/

-- ===================================
-- SESSION MANAGEMENT
-- ===================================

-- Function to set user context (called by backend on authentication)
CREATE OR REPLACE FUNCTION set_user_context(user_id INTEGER, user_role TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
    PERFORM set_config('app.current_user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear user context (called on logout)
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', '', false);
    PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- SAMPLE DATA SETUP
-- ===================================

-- Insert default roles
INSERT INTO Roles (name) VALUES ('superadmin'), ('admin'), ('user') 
ON CONFLICT (name) DO NOTHING;

-- Example: Create sample users with different access levels
-- (These would be created via the application, this is just for reference)

/*
-- Sample Superadmin
INSERT INTO Users (username, password_hash, role_id) 
VALUES ('superadmin', '$2b$10$...', (SELECT id FROM Roles WHERE name = 'superadmin'));

-- Sample Admin  
INSERT INTO Users (username, password_hash, role_id, created_by)
VALUES ('admin', '$2b$10$...', (SELECT id FROM Roles WHERE name = 'admin'), 1);

-- Sample User with limited fleet access
INSERT INTO Users (username, password_hash, role_id, created_by)
VALUES ('user1', '$2b$10$...', (SELECT id FROM Roles WHERE name = 'user'), 2);

-- Grant user1 access to specific fleets
INSERT INTO UserFleetAccess (user_id, fleet_id) 
VALUES ((SELECT id FROM Users WHERE username = 'user1'), 1);

-- Grant user1 access to specific sheets for specific sailings
INSERT INTO UserSailingSheetAccess (user_id, sailing_id, sheet_id)
VALUES ((SELECT id FROM Users WHERE username = 'user1'), 1, 1);
*/

-- ===================================
-- NOTES FOR BACKEND IMPLEMENTATION
-- ===================================

/*
BACKEND REQUIREMENTS:

1. Authentication Middleware:
   - After successful login, call set_user_context(user_id, role)
   - On logout, call clear_user_context()
   - Maintain session state with user context

2. API Endpoints:
   - All database queries will automatically respect RLS policies
   - No need to add WHERE clauses for user filtering - RLS handles it
   - Test each endpoint with different user roles

3. User Management API:
   - POST /users - Create new user (admin+ only)
   - PUT /users/:id - Update user (own profile or managed users)
   - GET /users - List users (based on role permissions)
   - POST /users/:id/fleet-access - Grant fleet access
   - POST /users/:id/ship-access - Grant ship access
   - POST /users/:id/sheet-access - Grant sheet access

4. Data Access Validation:
   - Filter dropdown options based on user access
   - Validate all incoming requests against user permissions
   - Return appropriate error messages for unauthorized access

5. Testing:
   - Test each role's access to each table
   - Test cross-role data access attempts
   - Test permission escalation attempts
   - Test session management and context switching
*/
