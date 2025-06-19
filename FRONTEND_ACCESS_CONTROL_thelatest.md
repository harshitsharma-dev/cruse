# FRONTEND ACCESS CONTROL DOCUMENTATION
## Based on thelatest.py Backend Implementation

This document outlines the comprehensive access control strategy for the cruise analytics dashboard frontend, aligned with the actual backend implementation in `thelatest.py`, authentication system in `sailing_auth.yaml`, and RLS policies.

## 🔐 AUTHENTICATION SYSTEM

### User Roles (from sailing_auth.yaml)
```yaml
users:
  admin:     # password: admin123, role: admin
  superadmin: # password: admin123, role: superadmin  
  demo:      # password: admin123, role: user
  guest:     # password: admin123, role: user
```

### Authentication Flow
1. **Login Process**: POST `/sailing/auth` with username/password
2. **Backend Validation**: `check_password_hash()` against `sailing_auth.yaml`
3. **Session Context**: Backend calls `set_user_session()` for RLS
4. **Frontend Storage**: Store user info in AuthContext/localStorage
5. **Request Headers**: Include credentials for subsequent API calls

## 🛡️ ROLE-BASED ACCESS MATRIX

| Feature/Endpoint | Superadmin | Admin | User (demo/guest) |
|------------------|------------|--------|-------------------|
| **USER MANAGEMENT** |
| Create Users | ✅ Full | ✅ Limited | ❌ None |
| View Users | ✅ All | ✅ Created by them | ✅ Self only |
| Delete Users | ✅ All | ❌ None | ❌ None |
| **DATA ACCESS** |
| Fleet Access | ✅ All fleets | 🔒 Assigned fleets | 🔒 Assigned fleets |
| Ship Access | ✅ All ships | 🔒 Fleet/ship level | 🔒 Fleet/ship level |
| Sailing Data | ✅ All sailings | 🔒 Accessible ships | 🔒 Accessible ships |
| **ENDPOINTS** |
| `/sailing/fleets` | ✅ All | 🔒 UserFleetAccess | 🔒 UserFleetAccess |
| `/sailing/ships` | ✅ All | 🔒 UserShipAccess | 🔒 UserShipAccess |
| `/sailing/sailing_numbers*` | ✅ All | 🔒 Accessible ships | 🔒 Accessible ships |
| `/sailing/getRatingSmry` | ✅ All | 🔒 SQLOP filtered | 🔒 SQLOP filtered |
| `/sailing/getIssuesList` | ✅ All | 🔒 Sailing/Sheet access | 🔒 Sailing/Sheet access |
| `/sailing/semanticSearch` | ✅ All | 🔒 Ship filtered | 🔒 Ship filtered |
| `/sailing/getMetricRating` | ✅ All | 🔒 Accessible sailings | 🔒 Accessible sailings |

## 🎯 FRONTEND COMPONENT ACCESS CONTROL

### AuthContext Integration
```typescript
interface AuthContextType {
  user: {
    username: string;
    role: 'superadmin' | 'admin' | 'user';
    authenticated: boolean;
  };
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasAccess: (resource: string, action: string) => boolean;
}
```

### Role-Based Component Rendering
```typescript
// Example component access control
const UserManagement = () => {
  const { user } = useAuth();
  
  if (!['superadmin', 'admin'].includes(user.role)) {
    return <UnauthorizedAccess />;
  }
  
  return (
    <div>
      {user.role === 'superadmin' && <DeleteUserButton />}
      {['superadmin', 'admin'].includes(user.role) && <CreateUserButton />}
    </div>
  );
};
```

### Filter Access Control
```typescript
// Filter restrictions based on user access
const FilterContext = () => {
  const { user } = useAuth();
  const [availableShips, setAvailableShips] = useState([]);
  
  useEffect(() => {
    // Ships endpoint automatically filtered by RLS
    api.get('/sailing/ships').then(response => {
      setAvailableShips(response.data.data);
    });
  }, [user]);
  
  // Only show accessible ships in filter
  return availableShips;
};
```

## 🔄 API ENDPOINT BEHAVIOR (thelatest.py)

### Data Filtering Flow
1. **Authentication Check**: All `/sailing/*` routes protected
2. **RLS Context**: `sql_ops.py` functions use session context
3. **Automatic Filtering**: Database queries respect user permissions
4. **Frontend Response**: Pre-filtered data based on access rights

### Key Endpoints and Access Control

#### `/sailing/ships` (Line 448-456)
- **Superadmin**: See all ships from `SAMPLE_DATA`
- **Admin/User**: Only ships with access via RLS policies
- **Frontend**: Ship dropdown auto-populated with accessible ships

#### `/sailing/sailing_numbers_filter` (Line 240-261)
- **Input**: Ships list, date range
- **Backend**: `SQLOP.fetch_sailings()` with RLS filtering
- **Output**: Only sailings for accessible ships

#### `/sailing/getRatingSmry` (Line 264-285)
- **Input**: Ships, dates, sailing numbers
- **Backend**: `SQLOP.fetch_cruise_ratings()` with ship filtering
- **Output**: Ratings only for accessible ships

#### `/sailing/getIssuesList` (Line 560-572)
- **Input**: Sailing numbers, sheets
- **Backend**: `SQLOP.fetch_issues()` + `add_sailing_summaries()`
- **Access**: Respects sailing and sheet-level permissions

#### `/sailing/semanticSearch` (Line 500-559)
- **Input**: Query, ships, dates, sheets, etc.
- **Backend**: `semantic_search()` or `word_search()` with ship filtering
- **Access**: Results filtered by accessible ships only

### Backend Data Structure Matching
```python
# thelatest.py constants used in RLS
FLEET_DATA = [{"fleet": "marella", "ships": ["explorer", "discovery", "discovery 2", "explorer 2", "voyager"]}]
SHEET_LIST = ["Ports and Excursions", "Other Feedback", "Entertainment", "Bars", "Dining", "What went well", "What else"]
METRIC_ATTRIBUTES = ['Overall Holiday', 'Prior Customer Service', 'Flight', ...] # 18 metrics
```

## 🎨 UI/UX ACCESS CONTROL IMPLEMENTATION

### Navigation Menu
```typescript
const Navigation = () => {
  const { user } = useAuth();
  
  return (
    <nav>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/search">Search</NavLink>
      <NavLink to="/issues">Issues</NavLink>
      
      {/* Admin-only sections */}
      {['superadmin', 'admin'].includes(user.role) && (
        <NavLink to="/user-management">User Management</NavLink>
      )}
      
      {/* Superadmin-only sections */}
      {user.role === 'superadmin' && (
        <NavLink to="/system-settings">System Settings</NavLink>
      )}
    </nav>
  );
};
```

### Filter Components
```typescript
const BasicFilter = () => {
  const { filters, updateFilter } = useFilter();
  const { user } = useAuth();
  const [ships, setShips] = useState([]);
  
  useEffect(() => {
    // Backend automatically returns only accessible ships
    fetchShips().then(setShips);
  }, []);
  
  return (
    <div>
      {/* Ship filter shows only accessible ships */}
      <MultiSelect
        options={ships}
        value={filters.ships}
        onChange={(ships) => updateFilter('ships', ships)}
        placeholder="Select Ships"
      />
      
      {/* Date filters available to all users */}
      <DatePicker ... />
    </div>
  );
};
```

### Data Display Components
```typescript
const RatingSummary = () => {
  const { filters } = useFilter();
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState(null);
  
  const fetchRatings = async () => {
    try {
      // Backend filters based on user access automatically
      const response = await api.post('/sailing/getRatingSmry', {
        ships: filters.ships,
        start_date: filters.startDate,
        end_date: filters.endDate,
        sailing_numbers: filters.sailingNumbers
      });
      setRatings(response.data.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied to selected data');
      }
    }
  };
  
  return (
    <div>
      {error && <Alert variant="error">{error}</Alert>}
      {ratings.map(rating => <RatingCard key={rating.id} data={rating} />)}
    </div>
  );
};
```

## 🔒 SECURITY IMPLEMENTATION DETAILS

### Session Management
```typescript
// AuthContext session handling
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/sailing/auth', { username, password });
      
      if (response.data.authenticated) {
        const userData = {
          username: response.data.user,
          role: response.data.role,
          authenticated: true
        };
        
        setUser(userData);
        localStorage.setItem('cruise_auth', JSON.stringify(userData));
        
        // Set default authorization header for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${userData.username}`;
        
        return true;
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('cruise_auth');
    delete api.defaults.headers.common['Authorization'];
  };
  
  // Auto-restore session on app load
  useEffect(() => {
    const stored = localStorage.getItem('cruise_auth');
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${userData.username}`;
    }
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Error Handling for Access Control
```typescript
// API service with access control error handling
const api = axios.create({
  baseURL: 'http://backend-url:5000',
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - show access denied message
      toast.error('Access denied to requested resource');
    } else if (error.response?.status === 404 && error.response?.data?.error === '') {
      // thelatest.py returns empty 404 for blocked paths
      toast.error('Resource not found or access denied');
    }
    return Promise.reject(error);
  }
);
```

## 📊 ACCESS CONTROL TESTING

### User Access Scenarios
```typescript
// Testing different user access levels
const testScenarios = [
  {
    user: 'superadmin',
    expectedAccess: {
      allShips: true,
      allSailings: true,
      userManagement: true,
      systemSettings: true
    }
  },
  {
    user: 'admin',
    expectedAccess: {
      assignedShips: true,
      userCreation: true,
      systemSettings: false
    }
  },
  {
    user: 'demo',
    expectedAccess: {
      marellaFleetOnly: true,
      userManagement: false,
      dataExport: true
    }
  }
];
```

### Frontend Access Validation
```typescript
const validateUserAccess = (user, resource, action) => {
  const permissions = {
    superadmin: ['*'],
    admin: ['user:create', 'user:view:created', 'data:view:assigned'],
    user: ['data:view:assigned', 'profile:update:own']
  };
  
  const userPermissions = permissions[user.role] || [];
  
  return userPermissions.includes('*') || 
         userPermissions.includes(`${resource}:${action}`) ||
         userPermissions.some(p => p.startsWith(`${resource}:`) && p.includes('assigned'));
};
```

## 🚨 SECURITY CONSIDERATIONS

### Frontend Security Measures
1. **Route Guards**: Protect admin routes at router level
2. **Component Guards**: Hide/disable unauthorized UI elements
3. **API Guards**: Handle 403/401 responses gracefully
4. **Input Validation**: Validate user inputs before API calls
5. **Session Timeout**: Auto-logout after inactivity

### Backend Trust Model
- **Primary Security**: Backend RLS policies and authentication
- **Frontend Role**: UI convenience and user experience
- **Data Filtering**: Always done server-side via SQLOP functions
- **Access Validation**: Backend validates all data access requests

### Data Flow Security
```
Frontend Filter Selection → Backend API Call → RLS Policy Check → Database Query → Filtered Results → Frontend Display
```

## 📝 IMPLEMENTATION CHECKLIST

### Authentication
- [x] Login form with username/password
- [x] AuthContext for user state management
- [x] Session persistence in localStorage
- [x] Auto-logout on authentication failure
- [x] Role-based navigation rendering

### Access Control
- [x] Role-based component rendering
- [x] Route protection for admin features
- [x] Error handling for access denied scenarios
- [x] Filter options limited to accessible data
- [x] API response filtering handled by backend

### User Experience
- [x] Graceful degradation for limited access
- [x] Clear error messages for access denial
- [x] Contextual help for different user roles
- [x] Intuitive navigation based on permissions
- [x] Responsive design for all access levels

### Backend Integration
- [x] Proper session management with thelatest.py
- [x] RLS policy alignment with API endpoints
- [x] Error handling for blocked routes
- [x] CORS configuration for frontend domains
- [x] Credential support for authenticated requests

This access control system ensures that the frontend properly respects the backend's authentication and authorization system while providing an intuitive user experience that adapts to each user's permission level.
