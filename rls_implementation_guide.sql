-- ===================================
-- RLS IMPLEMENTATION GUIDE FOR EXISTING FRONTEND
-- ===================================
-- This file provides specific updates needed for the current Apollo Intelligence Dashboard
-- to integrate with the Row-Level Security policies

-- ===================================
-- 1. DATABASE SETUP COMMANDS
-- ===================================

-- First, apply the main RLS policies
-- Run: psql -d cruise_analytics -f rls_policies.sql

-- Create sample data for testing
INSERT INTO Roles (name) VALUES 
('superadmin'), ('admin'), ('user') 
ON CONFLICT (name) DO NOTHING;

-- Sample fleets (if not exists)
INSERT INTO Fleets (id, name) VALUES 
(1, 'Royal Caribbean'),
(2, 'Celebrity Cruises'),
(3, 'Azamara')
ON CONFLICT (id) DO NOTHING;

-- Sample ships (if not exists)  
INSERT INTO Ships (id, name, fleet_id) VALUES
(1, 'Symphony of the Seas', 1),
(2, 'Harmony of the Seas', 1),
(3, 'Celebrity Edge', 2),
(4, 'Celebrity Apex', 2),
(5, 'Azamara Quest', 3)
ON CONFLICT (id) DO NOTHING;

-- Sample users for testing
INSERT INTO Users (id, username, password_hash, role_id, created_by) VALUES
(1, 'superadmin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCODOH4uUUy13VGlv.u5KlhDnNZmXTcjLu', 1, NULL),
(2, 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCODOH4uUUy13VGlv.u5KlhDnNZmXTcjLu', 2, 1),
(3, 'user', '$2b$12$LQv3c1yqBWVHxkd0LHAkCODOH4uUUy13VGlv.u5KlhDnNZmXTcjLu', 3, 2),
(4, 'demo', '$2b$12$LQv3c1yqBWVHxkd0LHAkCODOH4uUUy13VGlv.u5KlhDnNZmXTcjLu', 3, 2),
(5, 'guest', '$2b$12$LQv3c1yqBWVHxkd0LHAkCODOH4uUUy13VGlv.u5KlhDnNZmXTcjLu', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant sample user access to specific fleets
INSERT INTO UserFleetAccess (user_id, fleet_id) VALUES
(3, 1),  -- user has access to Royal Caribbean
(4, 2),  -- demo has access to Celebrity Cruises  
(5, 1)   -- guest has access to Royal Caribbean
ON CONFLICT DO NOTHING;

-- Grant sample sheet access (assuming sheets exist)
INSERT INTO Sheets (id, name) VALUES
(1, 'Guest Services'),
(2, 'Food & Beverage'),
(3, 'Entertainment'),
(4, 'Maintenance'),
(5, 'Safety'),
(6, 'Operations')
ON CONFLICT (id) DO NOTHING;

-- Sample sailing sheet access
INSERT INTO UserSailingSheetAccess (user_id, sailing_id, sheet_id) VALUES
(3, 1, 1), (3, 1, 2), (3, 1, 3),  -- user can see Guest Services, F&B, Entertainment
(4, 2, 1), (4, 2, 3),             -- demo can see Guest Services, Entertainment
(5, 1, 1)                         -- guest can only see Guest Services
ON CONFLICT DO NOTHING;

-- ===================================
-- 2. BACKEND API UPDATES NEEDED
-- ===================================

/*
Update your Flask backend (Latest_flask_comments.py) with these changes:

1. Add session context management after login:
*/

-- In your login endpoint, after successful authentication:
-- cursor.execute("SELECT set_user_context(%s, %s)", (user_id, user_role))

/*
2. Update all database query functions to include context setting:

Example for getShips endpoint:
*/

@app.route('/sailing/getShips', methods=['GET'])
@require_auth
def get_ships():
    try:
        # Set user context for this request
        user_id = session.get('user_id')
        user_role = session.get('user_role')
        
        cursor.execute("SELECT set_user_context(%s, %s)", (user_id, user_role))
        
        # Now regular query - RLS will automatically filter
        cursor.execute("SELECT s.name, f.name as fleet FROM Ships s JOIN Fleets f ON s.fleet_id = f.id")
        ships = cursor.fetchall()
        
        return jsonify({"status": "success", "data": ships})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

/*
3. Add user management endpoints:
*/

@app.route('/admin/users', methods=['GET'])
@require_auth
@require_role(['admin', 'superadmin'])
def get_users():
    # RLS will automatically filter based on user role
    cursor.execute("SELECT id, username, role_id, created_by FROM Users")
    users = cursor.fetchall()
    return jsonify({"status": "success", "data": users})

@app.route('/admin/users/<int:user_id>/fleet-access', methods=['POST'])
@require_auth
@require_role(['admin', 'superadmin'])
def grant_fleet_access(user_id):
    fleet_ids = request.json.get('fleet_ids', [])
    for fleet_id in fleet_ids:
        cursor.execute(
            "INSERT INTO UserFleetAccess (user_id, fleet_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, fleet_id)
        )
    conn.commit()
    return jsonify({"status": "success"})

-- ===================================
-- 3. FRONTEND COMPONENT UPDATES
-- ===================================

/*
Update BasicFilter.tsx to respect user permissions:

1. Update fleet/ship dropdown population:
*/

// In BasicFilter.tsx, modify the ships query to only show accessible ships
const { data: shipsData } = useQuery({
  queryKey: ['ships'],
  queryFn: () => apiService.getShips(), // This will now return filtered results
});

/*
2. Update RatingSummary.tsx to handle filtered data:
*/

// The ratings data will automatically be filtered by RLS
// No changes needed to the component logic

/*
3. Update Issues.tsx to respect sheet access:
*/

// Update the sheets query to only show accessible sheets
const { data: sheetsData } = useQuery({
  queryKey: ['sheets'],
  queryFn: () => apiService.getSheets(), // Will return filtered sheets
});

/*
4. Add User Management Component (for admin/superadmin):
*/

// Create new component: src/pages/UserManagement.tsx
// This should only be accessible to admin/superadmin roles

-- ===================================
-- 4. API SERVICE UPDATES
-- ===================================

/*
Update src/services/api.ts to include user management:
*/

class ApiService {
  // ... existing methods ...

  // User management methods
  async getUsers() {
    const response = await fetch('/admin/users', {
      headers: this.getAuthHeaders(),
    });
    return response.json();
  }

  async createUser(userData: CreateUserRequest) {
    const response = await fetch('/admin/users', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return response.json();
  }

  async grantFleetAccess(userId: number, fleetIds: number[]) {
    const response = await fetch(`/admin/users/${userId}/fleet-access`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ fleet_ids: fleetIds }),
    });
    return response.json();
  }

  async grantShipAccess(userId: number, shipIds: number[]) {
    const response = await fetch(`/admin/users/${userId}/ship-access`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ship_ids: shipIds }),
    });
    return response.json();
  }

  async grantSheetAccess(userId: number, accessData: SheetAccessRequest[]) {
    const response = await fetch(`/admin/users/${userId}/sheet-access`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ access_data: accessData }),
    });
    return response.json();
  }
}

-- ===================================
-- 5. AUTHENTICATION CONTEXT UPDATES
-- ===================================

/*
Update src/contexts/AuthContext.tsx to include user ID:
*/

interface User {
  id: number;        // Add user ID
  username: string;
  role: string;
  name?: string;
  email?: string;
  fleetAccess?: number[];    // Add fleet access info
  shipAccess?: number[];     // Add ship access info
}

const login = async (username: string, password: string): Promise<boolean> => {
  try {
    // Call real authentication API instead of hardcoded
    const response = await apiService.login({ username, password });
    
    if (response.authenticated && response.user) {
      const userData = {
        id: response.user.id,
        username: response.user.username,
        role: response.user.role,
        name: response.user.name,
        fleetAccess: response.user.fleetAccess,
        shipAccess: response.user.shipAccess
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};

-- ===================================
-- 6. TESTING SCENARIOS
-- ===================================

/*
Test the following scenarios after implementation:

1. Login as 'superadmin':
   - Should see all data across all components
   - Should have access to Users page
   - Should be able to create/manage all users

2. Login as 'admin':
   - Should see all operational data
   - Should have access to Users page
   - Should only manage users they created

3. Login as 'user':
   - Should only see Royal Caribbean data (based on sample access)
   - Should not see Users page
   - Should only see assigned issue sheets

4. Login as 'demo':
   - Should only see Celebrity Cruises data
   - Should have limited sheet access
   - Should not see Users page

5. Login as 'guest':
   - Should only see Royal Caribbean data
   - Should only see Guest Services issues
   - Should not see Users page

6. Test unauthorized access:
   - Try accessing /admin/users as regular user (should fail)
   - Try viewing other fleet data as restricted user (should be empty)
   - Try accessing restricted issue sheets (should not appear)
*/

-- ===================================
-- 7. MIGRATION SCRIPT
-- ===================================

/*
Create migration script to apply RLS to existing database:

1. Backup existing database
2. Apply RLS policies
3. Create user access mappings
4. Test with sample users
5. Update application configuration
6. Deploy and test
*/

-- Migration commands:
-- pg_dump cruise_analytics > backup_before_rls.sql
-- psql cruise_analytics < rls_policies.sql  
-- psql cruise_analytics < rls_implementation_guide.sql

-- ===================================
-- 8. MONITORING AND MAINTENANCE  
-- ===================================

/*
Add these monitoring queries for ongoing maintenance:

1. Check user access distribution:
*/
SELECT 
    u.username,
    r.name as role,
    COUNT(DISTINCT ufa.fleet_id) as fleet_count,
    COUNT(DISTINCT usa.ship_id) as ship_count,
    COUNT(DISTINCT ussa.sheet_id) as sheet_count
FROM Users u
JOIN Roles r ON u.role_id = r.id
LEFT JOIN UserFleetAccess ufa ON u.id = ufa.user_id
LEFT JOIN UserShipAccess usa ON u.id = usa.user_id  
LEFT JOIN UserSailingSheetAccess ussa ON u.id = ussa.user_id
GROUP BY u.id, u.username, r.name;

/*
2. Audit access attempts:
*/
-- Add logging table for access attempts
CREATE TABLE AccessLog (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    table_name TEXT,
    action TEXT,
    success BOOLEAN,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- ===================================
-- IMPLEMENTATION PRIORITY
-- ===================================

/*
Recommended implementation order:

1. HIGH PRIORITY:
   - Apply RLS policies to database
   - Update backend authentication to set user context
   - Test basic data filtering with sample users

2. MEDIUM PRIORITY:
   - Update frontend components to handle filtered data
   - Add user management interface for admin users
   - Update API service with user management methods

3. LOW PRIORITY:
   - Add comprehensive logging and monitoring
   - Create advanced permission management tools
   - Add bulk user import/export functionality

This phased approach ensures core security is implemented first,
followed by user experience improvements.
*/
