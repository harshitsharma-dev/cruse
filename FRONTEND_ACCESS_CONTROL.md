# CRUISE ANALYTICS FRONTEND ACCESS CONTROL
# Based on Row-Level Security (RLS) Policies
# Apollo Intelligence Dashboard - Role-Based Component Access

## USER ROLES & PERMISSIONS

### 🔴 SUPERADMIN ROLE
**Full System Access - Complete Administrative Control**

**Dashboard Page:**
- ✅ Access to all metrics across all fleets and ships
- ✅ Global analytics and KPI overview
- ✅ System-wide performance metrics
- ✅ All date ranges and historical data

**Rating Summary Page:**
- ✅ All ships, all fleets, all rating categories
- ✅ Complete ratings data across entire system
- ✅ Export functionality for all data
- ✅ Advanced filtering and analytics tools

**Metric Filter Page:**  
- ✅ All available metrics and dimensions
- ✅ Custom metric creation and configuration
- ✅ System-wide metric analysis tools

**Search Page:**
- ✅ Search across all ships, fleets, sailings
- ✅ All activities, shows, and entertainment data
- ✅ Complete guest feedback and comments
- ✅ Advanced search operators and filters

**Issues Page:**
- ✅ All issues across all ships and issue types
- ✅ All issue sheets and categories
- ✅ Complete issue history and trends
- ✅ Issue management and resolution tools

**Profile Page:**
- ✅ Own profile management
- ✅ System preferences and configuration

**Users Page:**
- ✅ Create, edit, delete any user
- ✅ Assign roles and permissions
- ✅ Fleet and ship access management
- ✅ Sheet-level permission control
- ✅ User activity monitoring

---

### 🔵 ADMIN ROLE  
**Operational Access - Full Data View, Limited Management**

**Dashboard Page:**
- ✅ Access to all metrics (read-only operational view)
- ✅ Fleet and ship performance overview
- ✅ Operational KPIs and alerts

**Rating Summary Page:**
- ✅ All ships and fleets rating data
- ✅ Complete ratings analysis tools
- ✅ Export functionality for operational reports

**Metric Filter Page:**
- ✅ All metrics for operational analysis
- ✅ Standard filtering and reporting tools
- ❌ Cannot create or modify metric definitions

**Search Page:**
- ✅ Search across all ships and fleets
- ✅ All guest feedback and operational data
- ✅ Complete search functionality

**Issues Page:**
- ✅ All issues across all ships
- ✅ Complete issue analysis and reporting
- ✅ Operational issue resolution tools

**Profile Page:**
- ✅ Own profile management
- ✅ Personal preferences

**Users Page:**
- ✅ Manage users they created
- ✅ Create and edit regular users (role: 'user')
- ✅ Assign fleet/ship access to managed users
- ❌ Cannot manage other admins or superadmins
- ❌ Cannot modify admin or superadmin permissions

---

### 🟢 USER ROLE
**Limited Access - Restricted to Assigned Data Only**

**Dashboard Page:**
- ✅ Metrics for assigned fleets/ships only
- ✅ Personal performance dashboard
- ❌ Cannot see system-wide or other fleets' data

**Rating Summary Page:**
- ✅ Only ships/fleets they have access to
- ✅ Ratings data within their permission scope
- ✅ Export limited to accessible data only
- ❌ Cannot see ratings for non-assigned ships

**Metric Filter Page:**
- ✅ Metrics for accessible ships/fleets only
- ✅ Standard filtering within permission scope
- ❌ Cannot access metrics for restricted ships/fleets

**Search Page:**
- ✅ Search only within accessible ships/fleets
- ✅ Guest feedback for assigned vessels only
- ❌ Cannot search across entire system
- ❌ Results filtered to permission scope

**Issues Page:**
- ✅ Issues for accessible sailings only
- ✅ Only issue sheets they have explicit access to
- ❌ Cannot see issues for non-assigned ships
- ❌ Sheet-level restrictions apply (e.g., may see "Guest Services" but not "Engineering")

**Profile Page:**
- ✅ View and edit own profile only
- ❌ Cannot access other user profiles

**Users Page:**
- ❌ No access to user management
- ❌ Cannot see other users or permissions

---

## GRANULAR PERMISSION SYSTEM

### Fleet-Level Access
```sql
-- Users can be granted access to entire fleets
UserFleetAccess (user_id, fleet_id)
-- Automatically grants access to all ships in that fleet
```

### Ship-Level Access  
```sql
-- Users can be granted access to specific ships
UserShipAccess (user_id, ship_id)
-- More granular than fleet access
```

### Sheet-Level Access (Issues)
```sql
-- Users need explicit permission for each issue sheet type
UserSailingSheetAccess (user_id, sailing_id, sheet_id)
-- Examples: "Guest Complaints", "Maintenance Issues", "Safety Reports"
```

---

## UI COMPONENT BEHAVIOR BY ROLE

### Filter Dropdowns
- **Superadmin/Admin:** All options available
- **User:** Only shows accessible fleets/ships/sheets
- Auto-populated based on user permissions

### Data Tables and Charts
- **Superadmin/Admin:** Complete data sets
- **User:** Filtered to user's accessible data only
- No indication of filtered data (seamless experience)

### Export Functions
- **Superadmin/Admin:** Can export all visible data
- **User:** Export limited to accessible data only
- File names and contents reflect permission scope

### Navigation Menu
- **Superadmin/Admin:** "Users" menu item visible
- **User:** "Users" menu item hidden
- Role-appropriate menu structure

---

## EXAMPLE USER SCENARIOS

### Scenario 1: Regional Fleet Manager (User Role)
**Access:** Celebrity Fleet only
**Can See:**
- Dashboard metrics for Celebrity ships only
- Ratings for Celebrity sailings only  
- Issues for Celebrity ships with "Operations" and "Guest Services" sheets
- Search results limited to Celebrity fleet

**Cannot See:**
- Royal Caribbean or other fleet data
- "Engineering" or "Crew" issue sheets
- System-wide analytics

### Scenario 2: Guest Services Analyst (User Role)  
**Access:** Multiple fleets, Guest Services sheets only
**Can See:**
- All fleets for guest-related metrics
- Ratings data across all accessible ships
- Only "Guest Complaints" and "Guest Services" issue sheets
- Guest feedback search results

**Cannot See:**
- Operational or maintenance issues
- Crew or engineering reports
- Financial or business-sensitive metrics

### Scenario 3: Operations Manager (Admin Role)
**Access:** Full operational view
**Can See:**
- All ship and fleet data for operations
- All issue types for operational awareness
- Complete ratings and guest feedback
- Can manage guest services and operations staff

**Cannot See/Do:**
- Cannot modify system configuration
- Cannot manage other admin accounts
- Cannot access superadmin functions

---

## BACKEND API FILTERING

### Automatic RLS Application
- All API endpoints automatically respect user permissions
- No manual filtering required in application code
- Database-level security enforcement

### API Response Filtering
```javascript
// Example: GET /api/ships
// Superadmin: Returns all ships
// Admin: Returns all ships  
// User: Returns only accessible ships based on UserFleetAccess/UserShipAccess
```

### Error Handling
- Unauthorized access returns 403 Forbidden
- Missing permissions return empty results (not errors)
- Seamless user experience without permission awareness

---

## IMPLEMENTATION CHECKLIST

### Frontend Updates Required:
- [ ] Update filter dropdowns to use user-accessible data only
- [ ] Implement role-based menu visibility
- [ ] Add user management page for admin/superadmin
- [ ] Update export functions to respect permissions
- [ ] Add permission-aware error handling

### Backend Updates Required:  
- [ ] Implement session context setting (set_user_context)
- [ ] Add RLS policies to database
- [ ] Update authentication middleware
- [ ] Create user management API endpoints
- [ ] Test all endpoints with different user roles

### Database Setup:
- [ ] Apply RLS policies from rls_policies.sql
- [ ] Create sample users with different access levels
- [ ] Set up UserFleetAccess, UserShipAccess, UserSailingSheetAccess data
- [ ] Test RLS policy enforcement

---

## SECURITY CONSIDERATIONS

### Session Management
- User context must be set on every database connection
- Session timeout and security validation
- Protection against session hijacking

### Permission Escalation Prevention  
- Users cannot modify their own permissions
- Role changes require superadmin approval
- Audit logging for permission changes

### Data Isolation
- Complete data separation between user scopes
- No data leakage between permission boundaries
- Regular security audits and testing

This comprehensive access control system ensures that each user role has appropriate access to data and functionality while maintaining security and operational efficiency.
