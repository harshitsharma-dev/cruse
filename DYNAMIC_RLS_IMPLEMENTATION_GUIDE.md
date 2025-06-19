# DYNAMIC RLS IMPLEMENTATION GUIDE
## Complete Integration with Flask Backend and Enhanced Admin Management

This guide provides comprehensive instructions for implementing the dynamic Row Level Security system with enhanced admin capabilities, fully integrated with the Flask backend.

## 🎯 SYSTEM OVERVIEW

### Architecture
```
Frontend (React) → final_flask_with_rls.py → sql_ops_rls.py → PostgreSQL (Dynamic RLS)
```

### Key Features
- **Enhanced Admin Management**: Admins can create normal users and manage limited permissions
- **Superadmin Control**: Full system access and user management
- **Restricted Admin Permissions**: Admins can only grant/revoke permissions they possess
- **Role-Based User Creation**: Admins create normal users, superadmins create any role
- **Granular Access Control**: Fleet-level and ship-level permissions
- **Default Access Patterns**: Automatic default permissions for new users
- **API-Driven Management**: Full access control through REST endpoints
- **Session-Based Security**: RLS context maintained throughout requests

### User Role Capabilities

#### Superadmin
- Create/delete users of any role
- Grant/revoke any permissions
- View and manage all users
- Full data access

#### Admin
- Create normal users only (cannot create other admins/superadmins)
- Delete users they created (but not other admins/superadmins)
- Grant/revoke only permissions they themselves possess
- View users they created + themselves
- Data access based on granted permissions

#### User
- View only their own profile
- Data access based on granted permissions
- Cannot manage users or permissions

## 🚀 IMPLEMENTATION STEPS

### Step 1: Database Setup

#### 1.1 Install PostgreSQL and Create Database
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE cruise_analytics;
CREATE USER cruise_app WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE cruise_analytics TO cruise_app;
\q
```

#### 1.2 Create Database Schema
```sql
-- Connect to the database
psql cruise_analytics cruise_app

-- Create tables (from sql_table_reference.txt structure)
CREATE TABLE Roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Roles(id),
    FOREIGN KEY (created_by) REFERENCES Users(id)
);

CREATE TABLE Fleets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE Ships (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    fleet_id INTEGER NOT NULL,
    FOREIGN KEY (fleet_id) REFERENCES Fleets(id)
);

CREATE TABLE Sailings (
    id SERIAL PRIMARY KEY,
    sailing_number TEXT NOT NULL,
    ship_id INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    start_date_dt TIMESTAMP,
    FOREIGN KEY (ship_id) REFERENCES Ships(id)
);

CREATE TABLE Sheets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE Issues (
    id SERIAL PRIMARY KEY,
    sailing_id INTEGER NOT NULL,
    ship_id INTEGER NOT NULL,
    sheet_id INTEGER NOT NULL,
    issues TEXT,
    FOREIGN KEY (sailing_id) REFERENCES Sailings(id),
    FOREIGN KEY (ship_id) REFERENCES Ships(id),
    FOREIGN KEY (sheet_id) REFERENCES Sheets(id)
);

CREATE TABLE Comments (
    id SERIAL PRIMARY KEY,
    sailing_id INTEGER NOT NULL,
    ship_id INTEGER NOT NULL,
    sheet_id INTEGER NOT NULL,
    issues TEXT,
    FOREIGN KEY (sailing_id) REFERENCES Sailings(id),
    FOREIGN KEY (ship_id) REFERENCES Ships(id),
    FOREIGN KEY (sheet_id) REFERENCES Sheets(id)
);

CREATE TABLE Cruise_Ratings (
    id SERIAL PRIMARY KEY,
    "Ship" TEXT,
    "Sailing Number" TEXT,
    "Overall Holiday" REAL,
    "Prior Customer Service" REAL,
    "Flight" REAL,
    "Embarkation/Disembarkation" REAL,
    "Value for Money" REAL,
    "App Booking" REAL,
    "Pre-Cruise Hotel Accomodation" REAL,
    "Cabins" REAL,
    "Cabin Cleanliness" REAL,
    "F&B Quality" REAL,
    "F&B Service" REAL,
    "Bar Service" REAL,
    "Drinks Offerings and Menu" REAL,
    "Entertainment" REAL,
    "Excursions" REAL,
    "Crew Friendliness" REAL,
    "Ship Condition/Cleanliness (Public Areas)" REAL,
    "Sentiment Score" REAL
);

-- Access Control Tables
CREATE TABLE UserFleetAccess (
    user_id INTEGER NOT NULL,
    fleet_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    PRIMARY KEY (user_id, fleet_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (fleet_id) REFERENCES Fleets(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES Users(id)
);

CREATE TABLE UserShipAccess (
    user_id INTEGER NOT NULL,
    ship_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    PRIMARY KEY (user_id, ship_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (ship_id) REFERENCES Ships(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES Users(id)
);

CREATE TABLE UserSailingSheetAccess (
    user_id INTEGER NOT NULL,
    sailing_id INTEGER NOT NULL,
    sheet_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    PRIMARY KEY (user_id, sailing_id, sheet_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (sailing_id) REFERENCES Sailings(id) ON DELETE CASCADE,
    FOREIGN KEY (sheet_id) REFERENCES Sheets(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES Users(id)
);
```

#### 1.3 Apply RLS Policies
```sql
-- Execute the complete final_rls_policies_dynamic.sql file
\i final_rls_policies_dynamic.sql
```

### Step 2: Backend Configuration

#### 2.1 Environment Setup
```bash
# Install required Python packages
pip install flask flask-cors psycopg2-binary werkzeug pyyaml pandas sqlalchemy

# Create environment file
cat > .env << EOF
DB_HOST=localhost
DB_NAME=cruise_analytics
DB_USER=cruise_app
DB_PASSWORD=secure_password
DB_PORT=5432
FLASK_SECRET_KEY=your-super-secret-key-change-this
EOF
```

#### 2.2 Update Flask Application
```python
# Replace the import in final_flask_with_rls.py
import sql_ops_rls as SQLOP

# Add environment variables loading
import os
from dotenv import load_dotenv
load_dotenv()

# Update secret key
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'fallback-secret-key')
```

### Step 3: Dynamic User Management Setup

#### 3.1 Test Superadmin Access
```python
# Test script: test_superadmin.py
import requests
import json

BASE_URL = 'http://localhost:5000'

def test_superadmin_workflow():
    session = requests.Session()
    
    # 1. Login as superadmin
    auth_response = session.post(f'{BASE_URL}/sailing/auth', json={
        'username': 'superadmin',
        'password': 'admin123'
    })
    
    print("Auth Response:", auth_response.json())
    
    # 2. Create a new user
    create_user_response = session.post(f'{BASE_URL}/sailing/users', json={
        'username': 'test_user',
        'password': 'test123',
        'role': 'user'
    })
    
    print("Create User Response:", create_user_response.json())
    
    # 3. Get all users
    users_response = session.get(f'{BASE_URL}/sailing/users')
    users = users_response.json()['data']
    print("All Users:", users)
    
    # 4. Grant fleet access to the new user
    test_user_id = None
    for user in users:
        if user['username'] == 'test_user':
            test_user_id = user['id']
            break
    
    if test_user_id:
        # Get all fleets
        fleets_response = session.get(f'{BASE_URL}/sailing/admin/fleets')
        fleets = fleets_response.json()['data']
        
        # Grant access to marella fleet
        marella_fleet_id = None
        for fleet in fleets:
            if fleet['name'] == 'marella':
                marella_fleet_id = fleet['id']
                break
        
        if marella_fleet_id:
            grant_response = session.post(f'{BASE_URL}/sailing/users/{test_user_id}/fleet-access', json={
                'fleet_id': marella_fleet_id
            })
            print("Grant Fleet Access Response:", grant_response.json())
    
    # 5. Check user access
    access_response = session.get(f'{BASE_URL}/sailing/users/{test_user_id}/access')
    print("User Access:", access_response.json())

if __name__ == '__main__':
    test_superadmin_workflow()
```

#### 3.2 Test Dynamic Access Control
```python
# Test script: test_dynamic_access.py
import requests

def test_user_access_levels():
    # Test different user access scenarios
    test_users = [
        {'username': 'superadmin', 'password': 'admin123', 'expected_ships': 'all'},
        {'username': 'test_user', 'password': 'test123', 'expected_ships': 'limited'}
    ]
    
    for user_info in test_users:
        session = requests.Session()
        
        # Login
        auth_response = session.post('http://localhost:5000/sailing/auth', json={
            'username': user_info['username'],
            'password': user_info['password']
        })
        
        if auth_response.status_code == 200:
            print(f"\n{user_info['username']} login successful")
            
            # Test ships endpoint
            ships_response = session.get('http://localhost:5000/sailing/ships')
            ships = ships_response.json()['data']
            print(f"Ships accessible: {len(ships)} ships")
            
            # Test sailing numbers
            sailings_response = session.get('http://localhost:5000/sailing/sailing_numbers')
            sailings = sailings_response.json()['data']
            print(f"Sailings accessible: {len(sailings)} sailings")
            
            # Test ratings endpoint
            ratings_response = session.post('http://localhost:5000/sailing/getRatingSmry', json={
                'ships': [ship['name'] for ship in ships[:2]],
                'start_date': '-1',
                'end_date': '-1',
                'sailing_numbers': []
            })
            
            if ratings_response.status_code == 200:
                ratings = ratings_response.json()['data']
                print(f"Ratings accessible: {len(json.loads(ratings)) if isinstance(ratings, str) else len(ratings)} ratings")
        else:
            print(f"{user_info['username']} login failed: {auth_response.json()}")

if __name__ == '__main__':
    test_dynamic_access()
```

### Step 4: Frontend Integration

#### 4.1 Update AuthContext for Dynamic User Management
```typescript
// src/contexts/AuthContext.tsx
interface User {
  id: number;
  username: string;
  role: 'superadmin' | 'admin' | 'user';
  authenticated: boolean;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    switch (permission) {
      case 'manage_users':
        return user.role === 'superadmin';
      case 'view_all_data':
        return user.role === 'superadmin';
      case 'manage_access':
        return user.role === 'superadmin';
      default:
        return true;
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 4.2 Create User Management Components
```typescript
// src/components/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: number;
  username: string;
  role: string;
  created_by_username?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/sailing/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sailing/users', newUser);
      setNewUser({ username: '', password: '', role: 'user' });
      setShowCreateForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/sailing/users/${userId}`);
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create User
        </button>
      </div>

      {/* User List */}
      <div className="grid gap-4">
        {users.map(user => (
          <div key={user.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{user.username}</h3>
              <p className="text-gray-600">Role: {user.role}</p>
              {user.created_by_username && (
                <p className="text-sm text-gray-500">Created by: {user.created_by_username}</p>
              )}
            </div>
            <div className="flex gap-2">
              <AccessManagementButton userId={user.id} username={user.username} />
              <button
                onClick={() => deleteUser(user.id)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <form onSubmit={createUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### 4.3 Create Access Management Component
```typescript
// src/components/AccessManagement.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface AccessManagementProps {
  userId: number;
  username: string;
}

const AccessManagement: React.FC<AccessManagementProps> = ({ userId, username }) => {
  const [showModal, setShowModal] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [allFleets, setAllFleets] = useState<any[]>([]);
  const [allShips, setAllShips] = useState<any[]>([]);

  const fetchUserAccess = async () => {
    try {
      const [accessResponse, fleetsResponse, shipsResponse] = await Promise.all([
        api.get(`/sailing/users/${userId}/access`),
        api.get('/sailing/admin/fleets'),
        api.get('/sailing/admin/ships')
      ]);
      
      setUserAccess(accessResponse.data.data);
      setAllFleets(fleetsResponse.data.data);
      setAllShips(shipsResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch access data:', error);
    }
  };

  const grantFleetAccess = async (fleetId: number) => {
    try {
      await api.post(`/sailing/users/${userId}/fleet-access`, { fleet_id: fleetId });
      fetchUserAccess();
    } catch (error) {
      console.error('Failed to grant fleet access:', error);
    }
  };

  const revokeFleetAccess = async (fleetId: number) => {
    try {
      await api.delete(`/sailing/users/${userId}/fleet-access/${fleetId}`);
      fetchUserAccess();
    } catch (error) {
      console.error('Failed to revoke fleet access:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setShowModal(true);
          fetchUserAccess();
        }}
        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
      >
        Manage Access
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-2/3 max-h-3/4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Manage Access for {username}</h2>
            
            {userAccess && (
              <div className="space-y-6">
                {/* Fleet Access */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Fleet Access</h3>
                  <div className="grid gap-2">
                    {allFleets.map(fleet => {
                      const hasAccess = userAccess.fleet_access.some((fa: any) => fa.id === fleet.id);
                      return (
                        <div key={fleet.id} className="flex justify-between items-center p-2 border rounded">
                          <span>{fleet.name}</span>
                          {hasAccess ? (
                            <button
                              onClick={() => revokeFleetAccess(fleet.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              onClick={() => grantFleetAccess(fleet.id)}
                              className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                            >
                              Grant
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ship Access */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Individual Ship Access</h3>
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {allShips.map(ship => {
                      const hasAccess = userAccess.ship_access.some((sa: any) => sa.id === ship.id);
                      return (
                        <div key={ship.id} className="flex justify-between items-center p-2 border rounded">
                          <span>{ship.name} ({ship.fleet_name})</span>
                          {hasAccess ? (
                            <button className="bg-gray-400 text-white px-3 py-1 rounded text-sm" disabled>
                              Has Access
                            </button>
                          ) : (
                            <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                              Grant Individual
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

### Step 5: Production Deployment

#### 5.1 Database Security Hardening
```sql
-- Create dedicated application database user
CREATE USER cruise_app_prod WITH PASSWORD 'very-secure-password';

-- Grant minimal necessary permissions
GRANT CONNECT ON DATABASE cruise_analytics TO cruise_app_prod;
GRANT USAGE ON SCHEMA public TO cruise_app_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cruise_app_prod;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cruise_app_prod;

-- Grant execute permission on RLS functions only
GRANT EXECUTE ON FUNCTION set_user_session(INTEGER, TEXT, TEXT) TO cruise_app_prod;
GRANT EXECUTE ON FUNCTION clear_user_session() TO cruise_app_prod;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO cruise_app_prod;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO cruise_app_prod;
GRANT EXECUTE ON FUNCTION user_has_fleet_access(INTEGER, INTEGER) TO cruise_app_prod;
GRANT EXECUTE ON FUNCTION user_has_ship_access(INTEGER, INTEGER) TO cruise_app_prod;
GRANT EXECUTE ON FUNCTION get_user_accessible_ships(INTEGER) TO cruise_app_prod;
```

#### 5.2 Environment Configuration
```bash
# Production environment file
cat > .env.production << EOF
DB_HOST=your-production-db-host
DB_NAME=cruise_analytics
DB_USER=cruise_app_prod
DB_PASSWORD=very-secure-password
DB_PORT=5432
FLASK_SECRET_KEY=super-secure-secret-key-for-production
FLASK_ENV=production
EOF
```

#### 5.3 Monitoring and Logging Setup
```python
# Add to final_flask_with_rls.py
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cruise_analytics.log'),
        logging.StreamHandler()
    ]
)

access_logger = logging.getLogger('access_control')

@app.before_request
def log_access_attempts():
    if request.path.startswith('/sailing') and request.method != 'OPTIONS':
        user_info = {
            'user_id': session.get('user_id'),
            'username': session.get('username'),
            'role': session.get('role'),
            'ip': request.remote_addr,
            'endpoint': request.path,
            'method': request.method
        }
        access_logger.info(f"Access attempt: {user_info}")

@app.after_request
def log_data_access(response):
    if request.path.startswith('/sailing') and response.status_code == 200:
        try:
            if response.content_type == 'application/json':
                data = response.get_json()
                if data and 'data' in data:
                    count = len(data['data']) if isinstance(data['data'], list) else 1
                    access_logger.info(f"Data returned: User {session.get('username')} "
                                     f"accessed {count} records from {request.path}")
        except:
            pass    return response
```

## 📋 ENHANCED ADMIN MANAGEMENT

### Admin Role Capabilities

With the enhanced system, admins now have limited user management capabilities:

#### Admin User Creation
```python
# Admins can create normal users only
POST /sailing/users
{
  "username": "newuser",
  "password": "secure_password",
  "role": "user"  // Admin cannot set "admin" or "superadmin"
}

# Response shows created user
{
  "status": "success",
  "data": {
    "id": 5,
    "username": "newuser",
    "role": "user"
  }
}
```

#### Admin Permission Management
```python
# Admin can only grant permissions they possess
# If admin has fleet access to "marella", they can grant it
POST /sailing/users/5/fleet-access
{
  "fleet_id": 1  // Marella fleet
}

# If admin tries to grant access they don't have, error occurs
POST /sailing/users/5/fleet-access
{
  "fleet_id": 2  // Royal Caribbean - admin doesn't have this
}
# Returns: {"error": "Cannot grant access you don't possess"}
```

#### Admin User Deletion
```python
# Admin can delete users they created (not other admins/superadmins)
DELETE /sailing/users/5

# Admin cannot delete other admins or superadmins
DELETE /sailing/users/2  // Another admin
# Returns: {"error": "Cannot delete this user"}
```

### Backend Logic Implementation

The sql_ops_rls.py module enforces these restrictions:

```python
def create_user(self, username: str, password: str, role: str, created_by_id: int):
    # Get creator's role
    creator_role = self.get_user_role(created_by_id)
    
    # Enforce creation rules
    if creator_role == 'superadmin':
        # Superadmin can create any user
        pass
    elif creator_role == 'admin':
        # Admin can only create normal users
        if role in ['superadmin', 'admin']:
            raise ValueError("Admins can only create normal users")
    else:
        # Regular users cannot create users
        raise ValueError("Insufficient permissions to create users")

def grant_fleet_access(self, user_id: int, fleet_id: int, granted_by_id: int):
    granter_role = self.get_user_role(granted_by_id)
    
    if granter_role == 'admin':
        # Admin can only grant access they themselves have
        admin_permissions = self._get_admin_permissions(granted_by_id)
        if fleet_id not in admin_permissions['fleets']:
            raise ValueError("Cannot grant access you don't possess")
```

### RLS Policy Updates

The database policies support admin restrictions:

```sql
-- Users table - Admin can create normal users
CREATE POLICY users_insert_policy ON Users
FOR INSERT
WITH CHECK (
    get_current_user_role() = 'superadmin' OR
    (get_current_user_role() = 'admin' AND 
     EXISTS (SELECT 1 FROM Roles WHERE id = NEW.role_id AND name = 'user'))
);

-- Access management - Admin can grant permissions they have
CREATE POLICY user_fleet_access_insert_policy ON UserFleetAccess
FOR INSERT
WITH CHECK (
    get_current_user_role() = 'superadmin' OR
    (get_current_user_role() = 'admin' AND 
     user_has_fleet_access(get_current_user_id(), fleet_id))
);
```

### Frontend Admin UI

Update the user management interface to reflect admin capabilities:

```typescript
// AdminUserManagement.tsx
const AdminUserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState({
    fleets: [],
    ships: []
  });

  // Admin sees different UI than superadmin
  const canCreateUser = (targetRole: string) => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'admin') return targetRole === 'user';
    return false;
  };

  const canDeleteUser = (targetUser: User) => {
    if (user?.role === 'superadmin') return targetUser.id !== user.id;
    if (user?.role === 'admin') {
      return targetUser.created_by_username === user.username && 
             targetUser.role === 'user';
    }
    return false;
  };

  const canGrantPermission = (permission: Permission) => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'admin') {
      // Check if admin has this permission
      return availablePermissions.fleets.includes(permission.fleet_id) ||
             availablePermissions.ships.includes(permission.ship_id);
    }
    return false;
  };

  return (
    <div className="admin-user-management">
      <h2>User Management</h2>
      
      {/* Create User Form */}
      <CreateUserForm
        availableRoles={user?.role === 'superadmin' 
          ? ['superadmin', 'admin', 'user'] 
          : ['user']}
      />
      
      {/* User List */}
      <UserList
        users={users}
        canDelete={canDeleteUser}
        onDeleteUser={handleDeleteUser}
      />
      
      {/* Permission Management */}
      <PermissionManagement
        users={users}
        availablePermissions={availablePermissions}
        canGrant={canGrantPermission}
      />
    </div>
  );
};
```

## 🔒 SECURITY CONSIDERATIONS

### Enhanced Access Control Validation
- All data access is controlled by RLS policies at the database level
- Frontend role checks are for UX only - security is enforced server-side
- Session management prevents unauthorized access
- Admin permissions are strictly validated before any operation

### Dynamic Access Management with Admin Restrictions
- Superadmin can create/delete users and manage all permissions
- Admin can create normal users and manage only permissions they possess
- Admin cannot escalate privileges or grant access they don't have
- Default access patterns ensure new users have appropriate baseline permissions
- Access changes take effect immediately without requiring restart
- Audit trails track who granted/revoked access permissions

### Data Protection
- RLS policies prevent unauthorized data access even with direct database connection
- Session context is properly isolated between users
- All access attempts are logged for monitoring
- Password hashing with strong algorithms

This implementation provides a complete, secure, and dynamic access control system that allows superadmin to manage all aspects of user access while maintaining strict data security through RLS policies.
