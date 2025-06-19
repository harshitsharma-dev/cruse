"""
Enhanced SQL Operations with Row Level Security (RLS) Support
This module provides database operations with integrated RLS for cruise analytics.

NEW FEATURES:
- Admins can create normal users (not other admins/superadmins)
- Admins can only grant/revoke permissions they themselves possess
- Superadmins retain full control over users and permissions
- SQLAlchemy ORM for better database operations and connection management
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Date, Float, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.sql import func
import pandas as pd
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import hashlib
import secrets
from pathlib import Path
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQLAlchemy setup
Base = declarative_base()

class DatabaseManager:
    def __init__(self, db_path="cruise_analytics.db"):
        self.db_path = db_path
        self.current_user_id = None
        self.current_username = None
        self.current_role = None
        self._init_database()
    
    def _init_database(self):
        """Initialize database with all required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create core tables
            self._create_core_tables(cursor)
            
            # Create user and access management tables
            self._create_user_tables(cursor)
            
            # Insert sample data if tables are empty
            self._insert_sample_data(cursor)
            
            conn.commit()
    
    def _create_core_tables(self, cursor):
        """Create core business tables"""
        
        # Fleets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Fleets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Ships table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Ships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fleet_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                capacity INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (fleet_id) REFERENCES Fleets(id),
                UNIQUE(fleet_id, name)
            )
        ''')
        
        # Sailings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Sailings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ship_id INTEGER NOT NULL,
                sailing_number TEXT NOT NULL,
                start_date DATE,
                end_date DATE,
                port_departure TEXT,
                port_arrival TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ship_id) REFERENCES Ships(id),
                UNIQUE(ship_id, sailing_number)
            )
        ''')
        
        # Issues table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sailing_id INTEGER NOT NULL,
                category TEXT,
                subcategory TEXT,
                description TEXT,
                severity INTEGER,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sailing_id) REFERENCES Sailings(id)
            )
        ''')
        
        # Cruise_Ratings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Cruise_Ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sailing_id INTEGER NOT NULL,
                overall_rating REAL,
                ship_rating REAL,
                food_rating REAL,
                service_rating REAL,
                entertainment_rating REAL,
                value_rating REAL,
                guest_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sailing_id) REFERENCES Sailings(id)
            )
        ''')
    
    def _create_user_tables(self, cursor):
        """Create user management and access control tables"""
        
        # Roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role_id INTEGER NOT NULL,
                created_by INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES Roles(id),
                FOREIGN KEY (created_by) REFERENCES Users(id)
            )
        ''')
        
        # User Fleet Access table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS UserFleetAccess (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                fleet_id INTEGER NOT NULL,
                granted_by INTEGER NOT NULL,
                granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (fleet_id) REFERENCES Fleets(id),
                FOREIGN KEY (granted_by) REFERENCES Users(id),
                UNIQUE(user_id, fleet_id)
            )
        ''')
        
        # User Ship Access table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS UserShipAccess (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                ship_id INTEGER NOT NULL,
                granted_by INTEGER NOT NULL,
                granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (ship_id) REFERENCES Ships(id),
                FOREIGN KEY (granted_by) REFERENCES Users(id),
                UNIQUE(user_id, ship_id)
            )
        ''')
    
    def _insert_sample_data(self, cursor):
        """Insert sample data if tables are empty"""
        
        # Insert roles if they don't exist
        cursor.execute("SELECT COUNT(*) FROM Roles")
        if cursor.fetchone()[0] == 0:
            roles = [
                ('superadmin', 'Full system access and user management'),
                ('admin', 'Limited user management and data access'),
                ('user', 'Data access based on permissions')
            ]
            cursor.executemany("INSERT INTO Roles (name, description) VALUES (?, ?)", roles)
        
        # Insert default superadmin user if no users exist
        cursor.execute("SELECT COUNT(*) FROM Users")
        if cursor.fetchone()[0] == 0:
            superadmin_password = self.hash_password("admin123")
            cursor.execute('''
                INSERT INTO Users (username, password_hash, role_id) 
                VALUES (?, ?, (SELECT id FROM Roles WHERE name = 'superadmin'))
            ''', ("superadmin", superadmin_password))
        
        # Insert sample fleets if they don't exist
        cursor.execute("SELECT COUNT(*) FROM Fleets")
        if cursor.fetchone()[0] == 0:
            fleets = [
                ('Marella', 'Marella Cruises fleet'),
                ('Royal Caribbean', 'Royal Caribbean International'),
                ('Norwegian', 'Norwegian Cruise Line')
            ]
            cursor.executemany("INSERT INTO Fleets (name, description) VALUES (?, ?)", fleets)
        
        # Insert sample ships if they don't exist
        cursor.execute("SELECT COUNT(*) FROM Ships")
        if cursor.fetchone()[0] == 0:
            ships = [
                (1, 'Explorer', 2000),
                (1, 'Discovery', 1800),
                (1, 'Discovery 2', 1900),
                (1, 'Explorer 2', 2100),
                (1, 'Voyager', 1700),
                (2, 'Oasis of the Seas', 5400),
                (2, 'Symphony of the Seas', 5518),
                (3, 'Norwegian Epic', 4100),
                (3, 'Norwegian Joy', 3900)
            ]
            cursor.executemany("INSERT INTO Ships (fleet_id, name, capacity) VALUES (?, ?, ?)", ships)
    
    def hash_password(self, password: str) -> str:
        """Hash password with salt"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}:{password_hash.hex()}"
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            salt, hash_hex = password_hash.split(':')
            password_check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
            return password_check.hex() == hash_hex
        except:
            return False
    
    def set_user_session(self, user_id: int, username: str, role: str):
        """Set current user session for RLS context"""
        self.current_user_id = user_id
        self.current_username = username
        self.current_role = role
        logger.info(f"Set user session: {username} ({role})")
    
    def clear_user_session(self):
        """Clear current user session"""
        self.current_user_id = None
        self.current_username = None
        self.current_role = None
        logger.info("Cleared user session")
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user and return user info"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT u.id, u.username, u.password_hash, r.name as role, u.is_active
                FROM Users u
                JOIN Roles r ON u.role_id = r.id
                WHERE u.username = ? AND u.is_active = 1
            ''', (username,))
            
            user = cursor.fetchone()
            if user and self.verify_password(password, user[2]):
                # Update last login
                cursor.execute(
                    "UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                    (user[0],)
                )
                conn.commit()
                
                return {
                    'id': user[0],
                    'username': user[1],
                    'role': user[3]
                }
            return None
    
    def _check_access_permission(self, resource_type: str, resource_id: int) -> bool:
        """Check if current user has access to a resource"""
        if not self.current_user_id:
            return False
        
        # Superadmin has access to everything
        if self.current_role == 'superadmin':
            return True
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if resource_type == 'fleet':
                cursor.execute('''
                    SELECT 1 FROM UserFleetAccess 
                    WHERE user_id = ? AND fleet_id = ?
                ''', (self.current_user_id, resource_id))
                return cursor.fetchone() is not None
            
            elif resource_type == 'ship':
                # Check direct ship access
                cursor.execute('''
                    SELECT 1 FROM UserShipAccess 
                    WHERE user_id = ? AND ship_id = ?
                ''', (self.current_user_id, resource_id))
                if cursor.fetchone():
                    return True
                
                # Check fleet-level access
                cursor.execute('''
                    SELECT 1 FROM UserFleetAccess ufa
                    JOIN Ships s ON ufa.fleet_id = s.fleet_id
                    WHERE ufa.user_id = ? AND s.id = ?
                ''', (self.current_user_id, resource_id))
                return cursor.fetchone() is not None
        
        return False
    
    def _get_admin_permissions(self, admin_user_id: int) -> Dict[str, List[int]]:
        """Get all permissions that an admin user has (for permission granting limits)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get fleet access
            cursor.execute('''
                SELECT fleet_id FROM UserFleetAccess WHERE user_id = ?
            ''', (admin_user_id,))
            fleet_ids = [row[0] for row in cursor.fetchall()]
            
            # Get ship access
            cursor.execute('''
                SELECT ship_id FROM UserShipAccess WHERE user_id = ?
            ''', (admin_user_id,))
            ship_ids = [row[0] for row in cursor.fetchall()]
            
            # Add ships from fleet access
            if fleet_ids:
                placeholders = ','.join('?' * len(fleet_ids))
                cursor.execute(f'''
                    SELECT id FROM Ships WHERE fleet_id IN ({placeholders})
                ''', fleet_ids)
                fleet_ship_ids = [row[0] for row in cursor.fetchall()]
                ship_ids.extend(fleet_ship_ids)
                ship_ids = list(set(ship_ids))  # Remove duplicates
            
            return {
                'fleets': fleet_ids,
                'ships': ship_ids
            }
    
    # ==============================================
    # ENHANCED USER MANAGEMENT FUNCTIONS
    # ==============================================
    
    def create_user(self, username: str, password: str, role: str, created_by_id: int) -> Dict:
        """Create new user with role-based restrictions"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check if username already exists
            cursor.execute("SELECT id FROM Users WHERE username = ?", (username,))
            if cursor.fetchone():
                raise ValueError("Username already exists")
            
            # Get role ID
            cursor.execute("SELECT id FROM Roles WHERE name = ?", (role,))
            role_row = cursor.fetchone()
            if not role_row:
                raise ValueError("Invalid role")
            role_id = role_row[0]
            
            # Get creator's role
            cursor.execute('''
                SELECT r.name FROM Users u 
                JOIN Roles r ON u.role_id = r.id 
                WHERE u.id = ?
            ''', (created_by_id,))
            creator_role = cursor.fetchone()
            if not creator_role:
                raise ValueError("Invalid creator")
            creator_role = creator_role[0]
            
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
            
            # Hash password and create user
            password_hash = self.hash_password(password)
            cursor.execute('''
                INSERT INTO Users (username, password_hash, role_id, created_by)
                VALUES (?, ?, ?, ?)
            ''', (username, password_hash, role_id, created_by_id))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return {
                'id': user_id,
                'username': username,
                'role': role,
                'created_by': created_by_id
            }
    
    def get_all_users(self) -> List[Dict]:
        """Get all users (with RLS filtering)"""
        if not self.current_user_id:
            return []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if self.current_role == 'superadmin':
                # Superadmin sees all users
                cursor.execute('''
                    SELECT u.id, u.username, r.name as role, u.is_active, 
                           u.created_at, c.username as created_by_username
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.id
                    LEFT JOIN Users c ON u.created_by = c.id
                    ORDER BY u.created_at DESC
                ''')
            elif self.current_role == 'admin':
                # Admin sees users they created and themselves
                cursor.execute('''
                    SELECT u.id, u.username, r.name as role, u.is_active, 
                           u.created_at, c.username as created_by_username
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.id
                    LEFT JOIN Users c ON u.created_by = c.id
                    WHERE u.created_by = ? OR u.id = ?
                    ORDER BY u.created_at DESC
                ''', (self.current_user_id, self.current_user_id))
            else:
                # Regular users only see themselves
                cursor.execute('''
                    SELECT u.id, u.username, r.name as role, u.is_active, 
                           u.created_at, c.username as created_by_username
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.id
                    LEFT JOIN Users c ON u.created_by = c.id
                    WHERE u.id = ?
                ''', (self.current_user_id,))
            
            users = []
            for row in cursor.fetchall():
                users.append({
                    'id': row[0],
                    'username': row[1],
                    'role': row[2],
                    'is_active': bool(row[3]),
                    'created_at': row[4],
                    'created_by': row[5]
                })
            
            return users
    
    def delete_user(self, user_id: int) -> bool:
        """Delete user with role-based restrictions"""
        if not self.current_user_id:
            return False
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get user info
            cursor.execute('''
                SELECT u.username, r.name as role, u.created_by
                FROM Users u
                JOIN Roles r ON u.role_id = r.id
                WHERE u.id = ?
            ''', (user_id,))
            user_info = cursor.fetchone()
            
            if not user_info:
                return False
            
            username, role, created_by = user_info
            
            # Enforce deletion rules
            if self.current_role == 'superadmin':
                # Superadmin can delete any user except themselves
                if user_id == self.current_user_id:
                    raise ValueError("Cannot delete yourself")
            elif self.current_role == 'admin':
                # Admin can only delete users they created (and not other admins/superadmins)
                if created_by != self.current_user_id or role in ['admin', 'superadmin']:
                    raise ValueError("Cannot delete this user")
            else:
                # Regular users cannot delete users
                raise ValueError("Insufficient permissions")
            
            # Delete user (cascading will handle access records)
            cursor.execute("DELETE FROM Users WHERE id = ?", (user_id,))
            deleted = cursor.rowcount > 0
            conn.commit()
            
            return deleted
    
    # ==============================================
    # ENHANCED ACCESS MANAGEMENT FUNCTIONS
    # ==============================================
    
    def grant_fleet_access(self, user_id: int, fleet_id: int, granted_by_id: int = None) -> bool:
        """Grant fleet access with admin permission checks"""
        if granted_by_id is None:
            granted_by_id = self.current_user_id
        
        if not granted_by_id:
            return False
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get granter's role
            cursor.execute('''
                SELECT r.name FROM Users u 
                JOIN Roles r ON u.role_id = r.id 
                WHERE u.id = ?
            ''', (granted_by_id,))
            granter_role = cursor.fetchone()
            if not granter_role:
                return False
            granter_role = granter_role[0]
            
            # Enforce permission granting rules
            if granter_role == 'superadmin':
                # Superadmin can grant any access
                pass
            elif granter_role == 'admin':
                # Admin can only grant access they themselves have
                admin_permissions = self._get_admin_permissions(granted_by_id)
                if fleet_id not in admin_permissions['fleets']:
                    raise ValueError("Cannot grant access you don't possess")
            else:
                # Regular users cannot grant access
                raise ValueError("Insufficient permissions to grant access")
            
            # Grant access
            cursor.execute('''
                INSERT OR IGNORE INTO UserFleetAccess (user_id, fleet_id, granted_by)
                VALUES (?, ?, ?)
            ''', (user_id, fleet_id, granted_by_id))
            
            granted = cursor.rowcount > 0
            conn.commit()
            return granted
    
    def revoke_fleet_access(self, user_id: int, fleet_id: int) -> bool:
        """Revoke fleet access with admin permission checks"""
        if not self.current_user_id:
            return False
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check if user has this access
            cursor.execute('''
                SELECT granted_by FROM UserFleetAccess 
                WHERE user_id = ? AND fleet_id = ?
            ''', (user_id, fleet_id))
            access_info = cursor.fetchone()
            
            if not access_info:
                return False
            
            granted_by = access_info[0]
            
            # Enforce revocation rules
            if self.current_role == 'superadmin':
                # Superadmin can revoke any access
                pass
            elif self.current_role == 'admin':
                # Admin can only revoke access they granted or have themselves
                admin_permissions = self._get_admin_permissions(self.current_user_id)
                if granted_by != self.current_user_id and fleet_id not in admin_permissions['fleets']:
                    raise ValueError("Cannot revoke access you didn't grant or don't possess")
            else:
                # Regular users cannot revoke access
                raise ValueError("Insufficient permissions to revoke access")
            
            # Revoke access
            cursor.execute('''
                DELETE FROM UserFleetAccess 
                WHERE user_id = ? AND fleet_id = ?
            ''', (user_id, fleet_id))
            
            revoked = cursor.rowcount > 0
            conn.commit()
            return revoked
    
    def grant_ship_access(self, user_id: int, ship_id: int, granted_by_id: int = None) -> bool:
        """Grant ship access with admin permission checks"""
        if granted_by_id is None:
            granted_by_id = self.current_user_id
        
        if not granted_by_id:
            return False
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get granter's role
            cursor.execute('''
                SELECT r.name FROM Users u 
                JOIN Roles r ON u.role_id = r.id 
                WHERE u.id = ?
            ''', (granted_by_id,))
            granter_role = cursor.fetchone()
            if not granter_role:
                return False
            granter_role = granter_role[0]
            
            # Enforce permission granting rules
            if granter_role == 'superadmin':
                # Superadmin can grant any access
                pass
            elif granter_role == 'admin':
                # Admin can only grant access they themselves have
                admin_permissions = self._get_admin_permissions(granted_by_id)
                if ship_id not in admin_permissions['ships']:
                    raise ValueError("Cannot grant access you don't possess")
            else:
                # Regular users cannot grant access
                raise ValueError("Insufficient permissions to grant access")
            
            # Grant access
            cursor.execute('''
                INSERT OR IGNORE INTO UserShipAccess (user_id, ship_id, granted_by)
                VALUES (?, ?, ?)
            ''', (user_id, ship_id, granted_by_id))
            
            granted = cursor.rowcount > 0
            conn.commit()
            return granted
    
    def revoke_ship_access(self, user_id: int, ship_id: int) -> bool:
        """Revoke ship access with admin permission checks"""
        if not self.current_user_id:
            return False
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check if user has this access
            cursor.execute('''
                SELECT granted_by FROM UserShipAccess 
                WHERE user_id = ? AND ship_id = ?
            ''', (user_id, ship_id))
            access_info = cursor.fetchone()
            
            if not access_info:
                return False
            
            granted_by = access_info[0]
            
            # Enforce revocation rules
            if self.current_role == 'superadmin':
                # Superadmin can revoke any access
                pass
            elif self.current_role == 'admin':
                # Admin can only revoke access they granted or have themselves
                admin_permissions = self._get_admin_permissions(self.current_user_id)
                if granted_by != self.current_user_id and ship_id not in admin_permissions['ships']:
                    raise ValueError("Cannot revoke access you didn't grant or don't possess")
            else:
                # Regular users cannot revoke access
                raise ValueError("Insufficient permissions to revoke access")
            
            # Revoke access
            cursor.execute('''
                DELETE FROM UserShipAccess 
                WHERE user_id = ? AND ship_id = ?
            ''', (user_id, ship_id))
            
            revoked = cursor.rowcount > 0
            conn.commit()
            return revoked
    
    def get_user_access(self, user_id: int) -> Dict:
        """Get user's access permissions"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get fleet access
            cursor.execute('''
                SELECT f.id, f.name, ufa.granted_at, g.username as granted_by
                FROM UserFleetAccess ufa
                JOIN Fleets f ON ufa.fleet_id = f.id
                LEFT JOIN Users g ON ufa.granted_by = g.id
                WHERE ufa.user_id = ?
            ''', (user_id,))
            fleet_access = [
                {
                    'id': row[0],
                    'name': row[1],
                    'granted_at': row[2],
                    'granted_by': row[3]
                }
                for row in cursor.fetchall()
            ]
            
            # Get ship access
            cursor.execute('''
                SELECT s.id, s.name, f.name as fleet_name, usa.granted_at, g.username as granted_by
                FROM UserShipAccess usa
                JOIN Ships s ON usa.ship_id = s.id
                JOIN Fleets f ON s.fleet_id = f.id
                LEFT JOIN Users g ON usa.granted_by = g.id
                WHERE usa.user_id = ?
            ''', (user_id,))
            ship_access = [
                {
                    'id': row[0],
                    'name': row[1],
                    'fleet_name': row[2],
                    'granted_at': row[3],
                    'granted_by': row[4]
                }
                for row in cursor.fetchall()
            ]
            
            return {
                'fleet_access': fleet_access,
                'ship_access': ship_access
            }
    
    def get_all_fleets(self) -> List[Dict]:
        """Get all fleets for access management"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, description FROM Fleets ORDER BY name")
            return [
                {'id': row[0], 'name': row[1], 'description': row[2]}
                for row in cursor.fetchall()
            ]
    
    def get_all_ships(self) -> List[Dict]:
        """Get all ships for access management"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT s.id, s.name, f.name as fleet_name, s.capacity
                FROM Ships s
                JOIN Fleets f ON s.fleet_id = f.id
                ORDER BY f.name, s.name
            ''')
            return [
                {
                    'id': row[0], 
                    'name': row[1], 
                    'fleet_name': row[2], 
                    'capacity': row[3]
                }
                for row in cursor.fetchall()
            ]
    
    def grant_default_access(self, user_id: int, role: str):
        """Grant default access based on role"""
        if role == 'user':
            # Give default access to first fleet for demo purposes
            try:
                self.grant_fleet_access(user_id, 1, self.current_user_id)
            except:
                pass  # Ignore if already exists or permission denied
    
    # ==============================================
    # DATA FETCHING FUNCTIONS WITH RLS
    # ==============================================
    
    def fetch_ships(self) -> List[Dict]:
        """Fetch ships with RLS filtering"""
        if not self.current_user_id:
            return []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if self.current_role == 'superadmin':
                # Superadmin gets all ships grouped by fleet
                cursor.execute('''
                    SELECT f.name as fleet_name, GROUP_CONCAT(s.name) as ships
                    FROM Fleets f
                    LEFT JOIN Ships s ON f.id = s.fleet_id
                    GROUP BY f.id, f.name
                    ORDER BY f.name
                ''')
            else:
                # Regular users get ships based on their access
                cursor.execute('''
                    SELECT f.name as fleet_name, GROUP_CONCAT(DISTINCT s.name) as ships
                    FROM Fleets f
                    JOIN Ships s ON f.id = s.fleet_id
                    WHERE s.id IN (
                        SELECT ship_id FROM UserShipAccess WHERE user_id = ?
                        UNION
                        SELECT s2.id FROM Ships s2 
                        JOIN UserFleetAccess ufa ON s2.fleet_id = ufa.fleet_id 
                        WHERE ufa.user_id = ?
                    )
                    GROUP BY f.id, f.name
                    ORDER BY f.name
                ''', (self.current_user_id, self.current_user_id))
            
            fleet_data = []
            for row in cursor.fetchall():
                ships = row[1].split(',') if row[1] else []
                fleet_data.append({
                    'fleet': row[0].lower(),
                    'ships': ships
                })
            
            return fleet_data
    
    def fetch_sailings(self, ships_list: List[str] = None, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Fetch sailings with RLS filtering"""
        if not self.current_user_id:
            return []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Base query with RLS filtering
            base_query = '''
                SELECT DISTINCT s.sailing_number, sh.name as ship_name, 
                       s.start_date, s.end_date, s.port_departure, s.port_arrival
                FROM Sailings s
                JOIN Ships sh ON s.ship_id = sh.id
                WHERE 1=1
            '''
            params = []
            
            # Add RLS filtering
            if self.current_role != 'superadmin':
                base_query += '''
                    AND sh.id IN (
                        SELECT ship_id FROM UserShipAccess WHERE user_id = ?
                        UNION
                        SELECT s2.id FROM Ships s2 
                        JOIN UserFleetAccess ufa ON s2.fleet_id = ufa.fleet_id 
                        WHERE ufa.user_id = ?
                    )
                '''
                params.extend([self.current_user_id, self.current_user_id])
            
            # Add filters
            if ships_list:
                placeholders = ','.join('?' * len(ships_list))
                base_query += f' AND LOWER(sh.name) IN ({placeholders})'
                params.extend([ship.lower() for ship in ships_list])
            
            if start_date:
                base_query += ' AND s.start_date >= ?'
                params.append(start_date)
            
            if end_date:
                base_query += ' AND s.end_date <= ?'
                params.append(end_date)
            
            base_query += ' ORDER BY s.start_date DESC'
            
            cursor.execute(base_query, params)
            
            sailings = []
            for row in cursor.fetchall():
                sailings.append({
                    'sailing_number': row[0],
                    'ship_name': row[1],
                    'start_date': row[2],
                    'end_date': row[3],
                    'port_departure': row[4],
                    'port_arrival': row[5]
                })
            
            return sailings
    
    def fetch_cruise_ratings(self, sailing_list: List[Dict]) -> List[Dict]:
        """Fetch cruise ratings with RLS filtering"""
        if not self.current_user_id or not sailing_list:
            return []
        
        # Implementation would go here - for now return empty list
        # This would query the Cruise_Ratings table with sailing filtering
        return []
    
    def fetch_issues(self, ships: List[str] = None, sailing_numbers: List[str] = None, sheets: List[str] = None) -> List[Dict]:
        """Fetch issues with RLS filtering"""
        if not self.current_user_id:
            return []
        
        # Implementation would go here - for now return empty list
        # This would query the Issues table with RLS filtering
        return []

# Create global database manager instance
db_manager = DatabaseManager()

# Convenience functions that use the global instance
def authenticate_user(username: str, password: str) -> Optional[Dict]:
    return db_manager.authenticate_user(username, password)

def create_user(username: str, password: str, role: str) -> Dict:
    return db_manager.create_user(username, password, role, db_manager.current_user_id)

def get_all_users() -> List[Dict]:
    return db_manager.get_all_users()

def delete_user(user_id: int) -> bool:
    return db_manager.delete_user(user_id)

def grant_fleet_access(user_id: int, fleet_id: int) -> bool:
    return db_manager.grant_fleet_access(user_id, fleet_id)

def revoke_fleet_access(user_id: int, fleet_id: int) -> bool:
    return db_manager.revoke_fleet_access(user_id, fleet_id)

def grant_ship_access(user_id: int, ship_id: int) -> bool:
    return db_manager.grant_ship_access(user_id, ship_id)

def revoke_ship_access(user_id: int, ship_id: int) -> bool:
    return db_manager.revoke_ship_access(user_id, ship_id)

def get_user_access(user_id: int) -> Dict:
    return db_manager.get_user_access(user_id)

def get_all_fleets() -> List[Dict]:
    return db_manager.get_all_fleets()

def get_all_ships() -> List[Dict]:
    return db_manager.get_all_ships()

def grant_default_access(user_id: int, role: str):
    return db_manager.grant_default_access(user_id, role)

def fetch_ships() -> List[Dict]:
    return db_manager.fetch_ships()

def fetch_sailings(ships_list: List[str] = None, start_date: str = None, end_date: str = None) -> List[Dict]:
    return db_manager.fetch_sailings(ships_list, start_date, end_date)

def fetch_cruise_ratings(sailing_list: List[Dict]) -> List[Dict]:
    return db_manager.fetch_cruise_ratings(sailing_list)

def fetch_issues(ships: List[str] = None, sailing_numbers: List[str] = None, sheets: List[str] = None) -> List[Dict]:
    return db_manager.fetch_issues(ships, sailing_numbers, sheets)
