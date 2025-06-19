# ROW LEVEL SECURITY IMPLEMENTATION GUIDE
## Integration with thelatest.py Flask Backend

This guide provides step-by-step instructions for implementing Row Level Security (RLS) policies in conjunction with the `thelatest.py` Flask backend, ensuring seamless integration between frontend access control, backend authentication, and database security.

## 🎯 OVERVIEW

### System Architecture
```
Frontend (React/TypeScript) → thelatest.py (Flask) → sql_ops.py → PostgreSQL (RLS Policies)
```

### Integration Points
1. **Authentication**: `sailing_auth.yaml` → `/sailing/auth` → `set_user_session()`
2. **Data Access**: Frontend filters → API endpoints → SQLOP functions → RLS filtering
3. **Session Management**: Flask session → PostgreSQL session variables → RLS context

## 🔧 IMPLEMENTATION STEPS

### Step 1: Database Setup and RLS Policies

#### 1.1 Execute RLS Policies
```sql
-- Run the complete rls_policies_thelatest.sql file
\i rls_policies_thelatest.sql
```

#### 1.2 Verify Policy Installation
```sql
-- Check that RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify policies are created
SELECT pol.polname, pol.polcmd, pol.polroles, pol.polqual
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname IN ('Users', 'Ships', 'Sailings', 'Cruise_Ratings', 'Issues');
```

#### 1.3 Test RLS Functions
```sql
-- Test session context functions
SELECT set_user_session(1, 'demo', 'user');
SELECT get_current_user_id(), get_current_user_role(), get_current_username();

-- Test access helper functions
SELECT user_has_ship_access(1, 1);
SELECT * FROM get_user_accessible_ships(1);
```

### Step 2: Backend Integration (thelatest.py)

#### 2.1 Modify sql_ops.py to Support RLS

Create or modify `sql_ops.py` to include RLS session management:

```python
import psycopg2
from psycopg2.extras import RealDictCursor
import os

class DatabaseManager:
    def __init__(self):
        self.connection = None
        self.current_user_id = None
        self.current_user_role = None
    
    def connect(self):
        """Establish database connection"""
        self.connection = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'cruise_analytics'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )
    
    def set_user_session(self, user_id, username, role):
        """Set RLS session context"""
        if not self.connection:
            self.connect()
        
        cursor = self.connection.cursor()
        cursor.execute(
            "SELECT set_user_session(%s, %s, %s)",
            (user_id, username, role)
        )
        self.connection.commit()
        
        self.current_user_id = user_id
        self.current_user_role = role
    
    def clear_user_session(self):
        """Clear RLS session context"""
        if self.connection:
            cursor = self.connection.cursor()
            cursor.execute("SELECT clear_user_session()")
            self.connection.commit()
        
        self.current_user_id = None
        self.current_user_role = None
    
    def fetch_sailings(self, ships=None, start_date=None, end_date=None):
        """Fetch sailings with RLS filtering"""
        cursor = self.connection.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT s.sailing_number, sh.name as ship_name, s.start_date, s.end_date
        FROM Sailings s
        JOIN Ships sh ON s.ship_id = sh.id
        WHERE 1=1
        """
        params = []
        
        if ships:
            query += " AND LOWER(sh.name) = ANY(%s)"
            params.append([ship.lower() for ship in ships])
        
        if start_date:
            query += " AND s.start_date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND s.end_date <= %s"
            params.append(end_date)
        
        cursor.execute(query, params)
        return cursor.fetchall()
    
    def fetch_cruise_ratings(self, sailing_list):
        """Fetch cruise ratings with RLS filtering"""
        cursor = self.connection.cursor(cursor_factory=RealDictCursor)
        
        if sailing_list:
            placeholders = ','.join(['%s'] * len(sailing_list))
            query = f"""
            SELECT * FROM Cruise_Ratings 
            WHERE "Sailing Number" IN ({placeholders})
            """
            cursor.execute(query, sailing_list)
        else:
            cursor.execute("SELECT * FROM Cruise_Ratings")
        
        return cursor.fetchall()
    
    def fetch_issues(self, ships=None, sailing_numbers=None, sheets=None):
        """Fetch issues with RLS filtering"""
        cursor = self.connection.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT i.*, s.sailing_number, sh.name as ship_name, sheet.name as sheet_name
        FROM Issues i
        JOIN Sailings s ON i.sailing_id = s.id
        JOIN Ships sh ON s.ship_id = sh.id
        JOIN Sheets sheet ON i.sheet_id = sheet.id
        WHERE 1=1
        """
        params = []
        
        if sailing_numbers:
            query += " AND s.sailing_number = ANY(%s)"
            params.append(sailing_numbers)
        
        if sheets:
            query += " AND LOWER(sheet.name) = ANY(%s)"
            params.append([sheet.lower() for sheet in sheets])
        
        cursor.execute(query, params)
        return cursor.fetchall()

# Global database manager instance
db_manager = DatabaseManager()
```

#### 2.2 Modify thelatest.py Authentication Endpoint

Update the `/sailing/auth` endpoint to set RLS context:

```python
@app.route('/sailing/auth', methods=['POST'])
def authenticate():
    try:
        # Get credentials from request
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                "authenticated": False,
                "error": "Username and password required"
            }), 400
        
        # Load auth data
        auth_data = load_auth_data()
        user_data = auth_data['users'].get(username)
        
        # Verify user exists and password matches
        if user_data and check_password_hash(user_data['password'], password):
            # Get user ID from database
            user_id = get_user_id_by_username(username)
            role = user_data.get('role')
            
            # Set RLS session context
            SQLOP.db_manager.set_user_session(user_id, username, role)
            
            # Store in Flask session for subsequent requests
            session['user_id'] = user_id
            session['username'] = username
            session['role'] = role
            
            return jsonify({
                "authenticated": True,
                "user": username,
                "role": role
            })
        
        return jsonify({
            "authenticated": False,
            "error": "Invalid credentials"
        }), 401
        
    except Exception as e:
        return jsonify({
            "authenticated": False,
            "error": f"Authentication failed: {str(e)}"
        }), 500

def get_user_id_by_username(username):
    """Helper function to get user ID from database"""
    cursor = SQLOP.db_manager.connection.cursor()
    cursor.execute("SELECT id FROM Users WHERE username = %s", (username,))
    result = cursor.fetchone()
    return result[0] if result else None

@app.before_request
def set_rls_context():
    """Set RLS context for each request"""
    # Skip for auth endpoint and static files
    if request.endpoint == 'authenticate' or not request.path.startswith('/sailing'):
        return
    
    user_id = session.get('user_id')
    username = session.get('username')
    role = session.get('role')
    
    if user_id and username and role:
        SQLOP.db_manager.set_user_session(user_id, username, role)
    else:
        # Clear session if no valid user
        SQLOP.db_manager.clear_user_session()
```

#### 2.3 Update API Endpoints to Use RLS-Enabled Functions

Modify existing endpoints to use the RLS-enabled sql_ops functions:

```python
@app.route('/sailing/sailing_numbers_filter', methods=['POST'])
def get_sailing_numbers_filter():
    data = request.get_json()
    ships_list = data.get("ships", [])
    start_date = data.get("start_date", None)
    end_date = data.get("end_date", None)
    
    if start_date == "-1":
        start_date = None
    if end_date == "-1":
        end_date = None
    
    # RLS automatically filters accessible sailings
    res = SQLOP.db_manager.fetch_sailings(ships_list, start_date, end_date)
    
    return jsonify({
        "status": "success",
        "data": res
    })

@app.route('/sailing/getRatingSmry', methods=['POST'])
def get_rating_summary():
    data = request.get_json()
    ships = data.get("ships")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    sailing_number_filter = data.get("sailing_numbers", [])
    
    if start_date == "-1":
        start_date = None
    if end_date == "-1":
        end_date = None
    
    if sailing_number_filter == []:
        sailing_list = SQLOP.db_manager.fetch_sailings(ships, start_date, end_date)
        sailing_numbers = [s['sailing_number'] for s in sailing_list]
    else:
        sailing_numbers = sailing_number_filter
    
    # RLS automatically filters accessible ratings
    res = SQLOP.db_manager.fetch_cruise_ratings(sailing_numbers)
    
    return jsonify({
        "status": "success",
        "data": res
    })

@app.route('/sailing/getIssuesList', methods=['POST'])
def get_issues_list():
    data = request.get_json()
    sailing_numbers = data.get("sailing_numbers", None)
    sheets = data.get("sheets", None)
    
    # RLS automatically filters accessible issues
    issues_list = SQLOP.db_manager.fetch_issues(None, sailing_numbers, sheets)
    final_list = add_sailing_summaries(issues_list)
    
    return jsonify({
        "status": "success",
        "data": final_list
    })
```

### Step 3: Frontend Integration

#### 3.1 Update AuthContext for Session Management

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  username: string;
  role: 'superadmin' | 'admin' | 'user';
  authenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post('/sailing/auth', { username, password });
      
      if (response.data.authenticated) {
        const userData: User = {
          username: response.data.user,
          role: response.data.role,
          authenticated: true
        };
        
        setUser(userData);
        
        // Store in localStorage for persistence
        localStorage.setItem('cruise_auth', JSON.stringify(userData));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cruise_auth');
    // Clear session on backend if needed
    api.post('/sailing/logout').catch(() => {}); // Ignore errors
  };

  // Restore session on app load
  useEffect(() => {
    const storedAuth = localStorage.getItem('cruise_auth');
    if (storedAuth) {
      try {
        const userData = JSON.parse(storedAuth);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('cruise_auth');
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### 3.2 Update API Service for Session Handling

```typescript
// src/services/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  withCredentials: true, // Important for session management
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear local auth and redirect to login
      localStorage.removeItem('cruise_auth');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have access to this data
      console.warn('Access denied to requested resource');
    }
    return Promise.reject(error);
  }
);
```

### Step 4: Testing and Validation

#### 4.1 Unit Tests for RLS Functions

```sql
-- Test script: test_rls_policies.sql

-- Test superadmin access
SELECT set_user_session(
  (SELECT id FROM Users WHERE username = 'superadmin'),
  'superadmin',
  'superadmin'
);

SELECT COUNT(*) as superadmin_ship_count FROM Ships; -- Should see all ships
SELECT COUNT(*) as superadmin_rating_count FROM Cruise_Ratings; -- Should see all ratings

-- Test user access
SELECT set_user_session(
  (SELECT id FROM Users WHERE username = 'demo'),
  'demo',
  'user'
);

SELECT COUNT(*) as demo_ship_count FROM Ships; -- Should see only accessible ships
SELECT COUNT(*) as demo_rating_count FROM Cruise_Ratings; -- Should see only accessible ratings

-- Test access functions
SELECT user_has_ship_access(
  (SELECT id FROM Users WHERE username = 'demo'),
  (SELECT id FROM Ships WHERE name = 'explorer')
) as demo_explorer_access;

-- Test accessible ships function
SELECT * FROM get_user_accessible_ships(
  (SELECT id FROM Users WHERE username = 'demo')
);
```

#### 4.2 Integration Tests for API Endpoints

```python
# test_rls_integration.py
import requests
import json

BASE_URL = 'http://localhost:5000'

def test_authentication_and_access():
    session = requests.Session()
    
    # Test different user logins
    users = [
        {'username': 'superadmin', 'password': 'admin123', 'expected_ships': 5},
        {'username': 'admin', 'password': 'admin123', 'expected_ships': 'varies'},
        {'username': 'demo', 'password': 'admin123', 'expected_ships': 5},  # marella fleet
        {'username': 'guest', 'password': 'admin123', 'expected_ships': 5}   # marella fleet
    ]
    
    for user in users:
        # Login
        auth_response = session.post(f'{BASE_URL}/sailing/auth', json={
            'username': user['username'],
            'password': user['password']
        })
        
        assert auth_response.status_code == 200
        assert auth_response.json()['authenticated'] == True
        
        # Test ships endpoint
        ships_response = session.get(f'{BASE_URL}/sailing/ships')
        ships_data = ships_response.json()['data']
        
        print(f"{user['username']}: {len(ships_data)} ships accessible")
        
        # Test ratings endpoint
        ratings_response = session.post(f'{BASE_URL}/sailing/getRatingSmry', json={
            'ships': [ship['name'] for ship in ships_data[:2]],  # Test first 2 ships
            'start_date': '-1',
            'end_date': '-1',
            'sailing_numbers': []
        })
        
        assert ratings_response.status_code == 200
        print(f"{user['username']}: {len(ratings_response.json()['data'])} ratings accessible")

if __name__ == '__main__':
    test_authentication_and_access()
```

#### 4.3 Frontend Access Control Tests

```typescript
// src/tests/AccessControl.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { UserManagement } from '../pages/UserManagement';

const mockUsers = {
  superadmin: { username: 'superadmin', role: 'superadmin', authenticated: true },
  admin: { username: 'admin', role: 'admin', authenticated: true },
  user: { username: 'demo', role: 'user', authenticated: true }
};

describe('Access Control', () => {
  test('superadmin can access user management', async () => {
    const MockAuthProvider = ({ children }) => (
      <AuthContext.Provider value={{ user: mockUsers.superadmin, login: () => {}, logout: () => {}, loading: false }}>
        {children}
      </AuthContext.Provider>
    );
    
    render(
      <MockAuthProvider>
        <UserManagement />
      </MockAuthProvider>
    );
    
    expect(screen.getByText('Create User')).toBeInTheDocument();
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });
  
  test('regular user cannot access user management', async () => {
    const MockAuthProvider = ({ children }) => (
      <AuthContext.Provider value={{ user: mockUsers.user, login: () => {}, logout: () => {}, loading: false }}>
        {children}
      </AuthContext.Provider>
    );
    
    render(
      <MockAuthProvider>
        <UserManagement />
      </MockAuthProvider>
    );
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
```

### Step 5: Deployment and Monitoring

#### 5.1 Environment Configuration

```bash
# .env file for thelatest.py
DB_HOST=localhost
DB_NAME=cruise_analytics
DB_USER=cruise_app
DB_PASSWORD=secure_password
FLASK_SECRET_KEY=your-secret-key-here
```

#### 5.2 Database User Setup

```sql
-- Create dedicated application user with limited privileges
CREATE USER cruise_app WITH PASSWORD 'secure_password';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE cruise_analytics TO cruise_app;
GRANT USAGE ON SCHEMA public TO cruise_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cruise_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cruise_app;

-- Grant execute permission on RLS functions
GRANT EXECUTE ON FUNCTION set_user_session(INTEGER, TEXT, TEXT) TO cruise_app;
GRANT EXECUTE ON FUNCTION clear_user_session() TO cruise_app;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO cruise_app;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO cruise_app;
GRANT EXECUTE ON FUNCTION get_current_username() TO cruise_app;
GRANT EXECUTE ON FUNCTION user_has_fleet_access(INTEGER, INTEGER) TO cruise_app;
GRANT EXECUTE ON FUNCTION user_has_ship_access(INTEGER, INTEGER) TO cruise_app;
GRANT EXECUTE ON FUNCTION get_user_accessible_ships(INTEGER) TO cruise_app;
```

#### 5.3 Monitoring and Logging

```python
# Add to thelatest.py for RLS monitoring
import logging

logging.basicConfig(level=logging.INFO)
rls_logger = logging.getLogger('rls_access')

@app.before_request
def log_rls_context():
    """Log RLS context for monitoring"""
    if request.path.startswith('/sailing') and request.method != 'OPTIONS':
        user_id = session.get('user_id')
        username = session.get('username')
        role = session.get('role')
        
        rls_logger.info(f"RLS Context - User: {username}, Role: {role}, Endpoint: {request.path}")

@app.after_request
def log_data_access(response):
    """Log data access patterns"""
    if request.path.startswith('/sailing') and response.status_code == 200:
        try:
            data = response.get_json()
            if data and 'data' in data:
                count = len(data['data']) if isinstance(data['data'], list) else 1
                rls_logger.info(f"Data Access - User: {session.get('username')}, "
                              f"Endpoint: {request.path}, Records: {count}")
        except:
            pass
    
    return response
```

## 🔍 TROUBLESHOOTING

### Common Issues and Solutions

#### 1. RLS Policies Not Working
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'Ships';

-- Check session context
SELECT get_current_user_id(), get_current_user_role();

-- If context is not set, ensure set_user_session() is called after authentication
```

#### 2. Frontend Not Respecting Access Control
```typescript
// Check if user context is properly set
const { user } = useAuth();
console.log('Current user:', user);

// Verify API calls include session cookies
console.log('API config:', api.defaults);
```

#### 3. Database Connection Issues
```python
# Check database connection in sql_ops.py
try:
    SQLOP.db_manager.connect()
    print("Database connection successful")
except Exception as e:
    print(f"Database connection failed: {e}")
```

#### 4. Session Management Problems
```python
# Debug session context in thelatest.py
@app.route('/debug/session', methods=['GET'])
def debug_session():
    return jsonify({
        'flask_session': dict(session),
        'rls_context': {
            'user_id': get_current_user_id() if hasattr(request, 'db_cursor') else 'N/A',
            'role': get_current_user_role() if hasattr(request, 'db_cursor') else 'N/A'
        }
    })
```

This implementation guide ensures that RLS policies work seamlessly with the `thelatest.py` backend, providing comprehensive access control while maintaining the existing API structure and functionality.
