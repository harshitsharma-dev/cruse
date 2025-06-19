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

# ==============================================
# SQLAlchemy Models
# ==============================================

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime)
    
    # Relationships
    role = relationship("Role", back_populates="users")
    creator = relationship("User", remote_side=[id])
    fleet_access = relationship("UserFleetAccess", back_populates="user", cascade="all, delete-orphan")
    ship_access = relationship("UserShipAccess", back_populates="user", cascade="all, delete-orphan")

class Fleet(Base):
    __tablename__ = 'fleets'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    ships = relationship("Ship", back_populates="fleet")
    user_access = relationship("UserFleetAccess", back_populates="fleet")

class Ship(Base):
    __tablename__ = 'ships'
    
    id = Column(Integer, primary_key=True)
    fleet_id = Column(Integer, ForeignKey('fleets.id'), nullable=False)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint('fleet_id', 'name', name='_fleet_ship_uc'),)
    
    # Relationships
    fleet = relationship("Fleet", back_populates="ships")
    sailings = relationship("Sailing", back_populates="ship")
    user_access = relationship("UserShipAccess", back_populates="ship")

class Sailing(Base):
    __tablename__ = 'sailings'
    
    id = Column(Integer, primary_key=True)
    ship_id = Column(Integer, ForeignKey('ships.id'), nullable=False)
    sailing_number = Column(String(50), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    port_departure = Column(String(100))
    port_arrival = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint('ship_id', 'sailing_number', name='_ship_sailing_uc'),)
    
    # Relationships
    ship = relationship("Ship", back_populates="sailings")
    issues = relationship("Issue", back_populates="sailing")
    cruise_ratings = relationship("CruiseRating", back_populates="sailing")

class Issue(Base):
    __tablename__ = 'issues'
    
    id = Column(Integer, primary_key=True)
    sailing_id = Column(Integer, ForeignKey('sailings.id'), nullable=False)
    category = Column(String(100))
    subcategory = Column(String(100))
    description = Column(Text)
    severity = Column(Integer)
    status = Column(String(50), default='open')
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    sailing = relationship("Sailing", back_populates="issues")

class CruiseRating(Base):
    __tablename__ = 'cruise_ratings'
    
    id = Column(Integer, primary_key=True)
    sailing_id = Column(Integer, ForeignKey('sailings.id'), nullable=False)
    overall_rating = Column(Float)
    ship_rating = Column(Float)
    food_rating = Column(Float)
    service_rating = Column(Float)
    entertainment_rating = Column(Float)
    value_rating = Column(Float)
    guest_id = Column(String(50))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    sailing = relationship("Sailing", back_populates="cruise_ratings")

class UserFleetAccess(Base):
    __tablename__ = 'user_fleet_access'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    fleet_id = Column(Integer, ForeignKey('fleets.id'), nullable=False)
    granted_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    granted_at = Column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint('user_id', 'fleet_id', name='_user_fleet_uc'),)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="fleet_access")
    fleet = relationship("Fleet", back_populates="user_access")
    granter = relationship("User", foreign_keys=[granted_by])

class UserShipAccess(Base):
    __tablename__ = 'user_ship_access'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    ship_id = Column(Integer, ForeignKey('ships.id'), nullable=False)
    granted_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    granted_at = Column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint('user_id', 'ship_id', name='_user_ship_uc'),)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="ship_access")
    ship = relationship("Ship", back_populates="user_access")
    granter = relationship("User", foreign_keys=[granted_by])

# ==============================================
# Database Manager Class
# ==============================================

class DatabaseManager:
    def __init__(self, database_url: str = None):
        """Initialize database manager with SQLAlchemy"""
        if database_url is None:
            # Default to SQLite for development
            database_url = "sqlite:///cruise_analytics.db"
        
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Session context
        self.current_user_id = None
        self.current_username = None
        self.current_role = None
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize database with all required tables and sample data"""
        # Create all tables
        Base.metadata.create_all(bind=self.engine)
        
        # Insert sample data if tables are empty
        with self.get_session() as session:
            self._insert_sample_data(session)
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    def _insert_sample_data(self, session: Session):
        """Insert sample data if tables are empty"""
        
        # Insert roles if they don't exist
        if session.query(Role).count() == 0:
            roles = [
                Role(name='superadmin', description='Full system access and user management'),
                Role(name='admin', description='Limited user management and data access'),
                Role(name='user', description='Data access based on permissions')
            ]
            session.add_all(roles)
            session.commit()
        
        # Insert default superadmin user if no users exist
        if session.query(User).count() == 0:
            superadmin_role = session.query(Role).filter(Role.name == 'superadmin').first()
            superadmin_password = self.hash_password("admin123")
            
            superadmin_user = User(
                username="superadmin",
                password_hash=superadmin_password,
                role_id=superadmin_role.id
            )
            session.add(superadmin_user)
            session.commit()
        
        # Insert sample fleets if they don't exist
        if session.query(Fleet).count() == 0:
            fleets = [
                Fleet(name='Marella', description='Marella Cruises fleet'),
                Fleet(name='Royal Caribbean', description='Royal Caribbean International'),
                Fleet(name='Norwegian', description='Norwegian Cruise Line')
            ]
            session.add_all(fleets)
            session.commit()
        
        # Insert sample ships if they don't exist
        if session.query(Ship).count() == 0:
            fleets = session.query(Fleet).all()
            fleet_dict = {f.name: f.id for f in fleets}
            
            ships = [
                Ship(fleet_id=fleet_dict['Marella'], name='Explorer', capacity=2000),
                Ship(fleet_id=fleet_dict['Marella'], name='Discovery', capacity=1800),
                Ship(fleet_id=fleet_dict['Marella'], name='Discovery 2', capacity=1900),
                Ship(fleet_id=fleet_dict['Marella'], name='Explorer 2', capacity=2100),
                Ship(fleet_id=fleet_dict['Marella'], name='Voyager', capacity=1700),
                Ship(fleet_id=fleet_dict['Royal Caribbean'], name='Oasis of the Seas', capacity=5400),
                Ship(fleet_id=fleet_dict['Royal Caribbean'], name='Symphony of the Seas', capacity=5518),
                Ship(fleet_id=fleet_dict['Norwegian'], name='Norwegian Epic', capacity=4100),
                Ship(fleet_id=fleet_dict['Norwegian'], name='Norwegian Joy', capacity=3900)
            ]
            session.add_all(ships)
            session.commit()
    
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
        with self.get_session() as session:
            user = session.query(User).filter(
                User.username == username,
                User.is_active == True
            ).first()
            
            if user and self.verify_password(password, user.password_hash):
                # Update last login
                user.last_login = func.now()
                session.commit()
                
                return {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role.name
                }
            return None
    
    def _check_access_permission(self, resource_type: str, resource_id: int) -> bool:
        """Check if current user has access to a resource"""
        if not self.current_user_id:
            return False
        
        # Superadmin has access to everything
        if self.current_role == 'superadmin':
            return True
        
        with self.get_session() as session:
            if resource_type == 'fleet':
                access = session.query(UserFleetAccess).filter(
                    UserFleetAccess.user_id == self.current_user_id,
                    UserFleetAccess.fleet_id == resource_id
                ).first()
                return access is not None
            
            elif resource_type == 'ship':
                # Check direct ship access
                ship_access = session.query(UserShipAccess).filter(
                    UserShipAccess.user_id == self.current_user_id,
                    UserShipAccess.ship_id == resource_id
                ).first()
                if ship_access:
                    return True
                
                # Check fleet-level access
                fleet_access = session.query(UserFleetAccess).join(Ship).filter(
                    UserFleetAccess.user_id == self.current_user_id,
                    Ship.id == resource_id
                ).first()
                return fleet_access is not None
        
        return False
    
    def _get_admin_permissions(self, admin_user_id: int) -> Dict[str, List[int]]:
        """Get all permissions that an admin user has (for permission granting limits)"""
        with self.get_session() as session:
            # Get fleet access
            fleet_access = session.query(UserFleetAccess).filter(
                UserFleetAccess.user_id == admin_user_id
            ).all()
            fleet_ids = [access.fleet_id for access in fleet_access]
            
            # Get ship access
            ship_access = session.query(UserShipAccess).filter(
                UserShipAccess.user_id == admin_user_id
            ).all()
            ship_ids = [access.ship_id for access in ship_access]
            
            # Add ships from fleet access
            if fleet_ids:
                fleet_ships = session.query(Ship).filter(Ship.fleet_id.in_(fleet_ids)).all()
                fleet_ship_ids = [ship.id for ship in fleet_ships]
                ship_ids.extend(fleet_ship_ids)
                ship_ids = list(set(ship_ids))  # Remove duplicates
            
            return {
                'fleets': fleet_ids,
                'ships': ship_ids
            }
    
    # ==============================================
    # ENHANCED USER MANAGEMENT FUNCTIONS
    # ==============================================
    
    def create_user(self, username: str, password: str, role: str) -> Dict:
        """Create new user with role-based restrictions"""
        with self.get_session() as session:
            # Check if username already exists
            existing_user = session.query(User).filter(User.username == username).first()
            if existing_user:
                raise ValueError("Username already exists")
            
            # Get role
            role_obj = session.query(Role).filter(Role.name == role).first()
            if not role_obj:
                raise ValueError("Invalid role")
            
            # Get creator's role
            if self.current_user_id:
                creator = session.query(User).filter(User.id == self.current_user_id).first()
                if not creator:
                    raise ValueError("Invalid creator")
                creator_role = creator.role.name
                
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
            new_user = User(
                username=username,
                password_hash=password_hash,
                role_id=role_obj.id,
                created_by=self.current_user_id
            )
            
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            
            return {
                'id': new_user.id,
                'username': new_user.username,
                'role': role,
                'created_by': self.current_user_id
            }
    
    def get_all_users(self) -> List[Dict]:
        """Get all users (with RLS filtering)"""
        if not self.current_user_id:
            return []
        
        with self.get_session() as session:
            query = session.query(User).join(Role)
            
            if self.current_role == 'superadmin':
                # Superadmin sees all users
                users = query.all()
            elif self.current_role == 'admin':
                # Admin sees users they created and themselves
                users = query.filter(
                    (User.created_by == self.current_user_id) |
                    (User.id == self.current_user_id)
                ).all()
            else:
                # Regular users only see themselves
                users = query.filter(User.id == self.current_user_id).all()
            
            result = []
            for user in users:
                creator_username = None
                if user.creator:
                    creator_username = user.creator.username
                
                result.append({
                    'id': user.id,
                    'username': user.username,
                    'role': user.role.name,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'created_by': creator_username
                })
            
            return result
    
    def delete_user(self, user_id: int) -> bool:
        """Delete user with role-based restrictions"""
        if not self.current_user_id:
            return False
        
        with self.get_session() as session:
            # Get user info
            user = session.query(User).join(Role).filter(User.id == user_id).first()
            if not user:
                return False
            
            username = user.username
            role = user.role.name
            created_by = user.created_by
            
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
            
            # Delete user (SQLAlchemy cascading will handle access records)
            session.delete(user)
            session.commit()
            
            return True
    
    # ==============================================
    # ENHANCED ACCESS MANAGEMENT FUNCTIONS
    # ==============================================
    
    def grant_fleet_access(self, user_id: int, fleet_id: int, granted_by_id: int = None) -> bool:
        """Grant fleet access with admin permission checks"""
        if granted_by_id is None:
            granted_by_id = self.current_user_id
        
        if not granted_by_id:
            return False
        
        with self.get_session() as session:
            # Get granter's role
            granter = session.query(User).join(Role).filter(User.id == granted_by_id).first()
            if not granter:
                return False
            granter_role = granter.role.name
            
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
            
            # Check if access already exists
            existing_access = session.query(UserFleetAccess).filter(
                UserFleetAccess.user_id == user_id,
                UserFleetAccess.fleet_id == fleet_id
            ).first()
            
            if existing_access:
                return False  # Already exists
            
            # Grant access
            new_access = UserFleetAccess(
                user_id=user_id,
                fleet_id=fleet_id,
                granted_by=granted_by_id
            )
            session.add(new_access)
            session.commit()
            
            return True
    
    def revoke_fleet_access(self, user_id: int, fleet_id: int) -> bool:
        """Revoke fleet access with admin permission checks"""
        if not self.current_user_id:
            return False
        
        with self.get_session() as session:
            # Check if user has this access
            access = session.query(UserFleetAccess).filter(
                UserFleetAccess.user_id == user_id,
                UserFleetAccess.fleet_id == fleet_id
            ).first()
            
            if not access:
                return False
            
            # Enforce revocation rules
            if self.current_role == 'superadmin':
                # Superadmin can revoke any access
                pass
            elif self.current_role == 'admin':
                # Admin can only revoke access they granted or have themselves
                admin_permissions = self._get_admin_permissions(self.current_user_id)
                if access.granted_by != self.current_user_id and fleet_id not in admin_permissions['fleets']:
                    raise ValueError("Cannot revoke access you didn't grant or don't possess")
            else:
                # Regular users cannot revoke access
                raise ValueError("Insufficient permissions to revoke access")
            
            # Revoke access
            session.delete(access)
            session.commit()
            
            return True
    
    def grant_ship_access(self, user_id: int, ship_id: int, granted_by_id: int = None) -> bool:
        """Grant ship access with admin permission checks"""
        if granted_by_id is None:
            granted_by_id = self.current_user_id
        
        if not granted_by_id:
            return False
        
        with self.get_session() as session:
            # Get granter's role
            granter = session.query(User).join(Role).filter(User.id == granted_by_id).first()
            if not granter:
                return False
            granter_role = granter.role.name
            
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
            
            # Check if access already exists
            existing_access = session.query(UserShipAccess).filter(
                UserShipAccess.user_id == user_id,
                UserShipAccess.ship_id == ship_id
            ).first()
            
            if existing_access:
                return False  # Already exists
            
            # Grant access
            new_access = UserShipAccess(
                user_id=user_id,
                ship_id=ship_id,
                granted_by=granted_by_id
            )
            session.add(new_access)
            session.commit()
            
            return True
    
    def revoke_ship_access(self, user_id: int, ship_id: int) -> bool:
        """Revoke ship access with admin permission checks"""
        if not self.current_user_id:
            return False
        
        with self.get_session() as session:
            # Check if user has this access
            access = session.query(UserShipAccess).filter(
                UserShipAccess.user_id == user_id,
                UserShipAccess.ship_id == ship_id
            ).first()
            
            if not access:
                return False
            
            # Enforce revocation rules
            if self.current_role == 'superadmin':
                # Superadmin can revoke any access
                pass
            elif self.current_role == 'admin':
                # Admin can only revoke access they granted or have themselves
                admin_permissions = self._get_admin_permissions(self.current_user_id)
                if access.granted_by != self.current_user_id and ship_id not in admin_permissions['ships']:
                    raise ValueError("Cannot revoke access you didn't grant or don't possess")
            else:
                # Regular users cannot revoke access
                raise ValueError("Insufficient permissions to revoke access")
            
            # Revoke access
            session.delete(access)
            session.commit()
            
            return True
    
    def get_user_access(self, user_id: int) -> Dict:
        """Get user's access permissions"""
        with self.get_session() as session:
            # Get fleet access
            fleet_access = session.query(UserFleetAccess).join(Fleet).join(
                User, UserFleetAccess.granted_by == User.id
            ).filter(UserFleetAccess.user_id == user_id).all()
            
            fleet_access_list = [
                {
                    'id': access.fleet.id,
                    'name': access.fleet.name,
                    'granted_at': access.granted_at.isoformat() if access.granted_at else None,
                    'granted_by': access.granter.username
                }
                for access in fleet_access
            ]
            
            # Get ship access
            ship_access = session.query(UserShipAccess).join(Ship).join(Fleet).join(
                User, UserShipAccess.granted_by == User.id
            ).filter(UserShipAccess.user_id == user_id).all()
            
            ship_access_list = [
                {
                    'id': access.ship.id,
                    'name': access.ship.name,
                    'fleet_name': access.ship.fleet.name,
                    'granted_at': access.granted_at.isoformat() if access.granted_at else None,
                    'granted_by': access.granter.username
                }
                for access in ship_access
            ]
            
            return {
                'fleet_access': fleet_access_list,
                'ship_access': ship_access_list
            }
    
    def get_all_fleets(self) -> List[Dict]:
        """Get all fleets for access management"""
        with self.get_session() as session:
            fleets = session.query(Fleet).order_by(Fleet.name).all()
            return [
                {'id': fleet.id, 'name': fleet.name, 'description': fleet.description}
                for fleet in fleets
            ]
    
    def get_all_ships(self) -> List[Dict]:
        """Get all ships for access management"""
        with self.get_session() as session:
            ships = session.query(Ship).join(Fleet).order_by(Fleet.name, Ship.name).all()
            return [
                {
                    'id': ship.id,
                    'name': ship.name,
                    'fleet_name': ship.fleet.name,
                    'capacity': ship.capacity
                }
                for ship in ships
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
        
        with self.get_session() as session:
            if self.current_role == 'superadmin':
                # Superadmin gets all ships grouped by fleet
                fleets = session.query(Fleet).all()
                fleet_data = []
                for fleet in fleets:
                    ships = [ship.name for ship in fleet.ships]
                    fleet_data.append({
                        'fleet': fleet.name.lower(),
                        'ships': ships
                    })
                return fleet_data
            else:
                # Regular users get ships based on their access
                # Get accessible ship IDs through direct access
                accessible_ship_ids = set()
                
                # Direct ship access
                ship_access = session.query(UserShipAccess).filter(
                    UserShipAccess.user_id == self.current_user_id
                ).all()
                accessible_ship_ids.update([access.ship_id for access in ship_access])
                
                # Fleet-level access
                fleet_access = session.query(UserFleetAccess).filter(
                    UserFleetAccess.user_id == self.current_user_id
                ).all()
                for access in fleet_access:
                    fleet_ships = session.query(Ship).filter(Ship.fleet_id == access.fleet_id).all()
                    accessible_ship_ids.update([ship.id for ship in fleet_ships])
                
                # Group by fleet
                fleet_data = {}
                accessible_ships = session.query(Ship).join(Fleet).filter(
                    Ship.id.in_(accessible_ship_ids)
                ).all()
                
                for ship in accessible_ships:
                    fleet_name = ship.fleet.name.lower()
                    if fleet_name not in fleet_data:
                        fleet_data[fleet_name] = []
                    fleet_data[fleet_name].append(ship.name)
                
                return [
                    {'fleet': fleet_name, 'ships': ships}
                    for fleet_name, ships in fleet_data.items()
                ]
    
    def fetch_sailings(self, ships_list: List[str] = None, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Fetch sailings with RLS filtering"""
        if not self.current_user_id:
            return []
        
        with self.get_session() as session:
            query = session.query(Sailing).join(Ship).join(Fleet)
            
            # Add RLS filtering
            if self.current_role != 'superadmin':
                # Get accessible ship IDs
                accessible_ship_ids = set()
                
                # Direct ship access
                ship_access = session.query(UserShipAccess).filter(
                    UserShipAccess.user_id == self.current_user_id
                ).all()
                accessible_ship_ids.update([access.ship_id for access in ship_access])
                
                # Fleet-level access
                fleet_access = session.query(UserFleetAccess).filter(
                    UserFleetAccess.user_id == self.current_user_id
                ).all()
                for access in fleet_access:
                    fleet_ships = session.query(Ship).filter(Ship.fleet_id == access.fleet_id).all()
                    accessible_ship_ids.update([ship.id for ship in fleet_ships])
                
                query = query.filter(Ship.id.in_(accessible_ship_ids))
            
            # Add filters
            if ships_list:
                query = query.filter(Ship.name.in_(ships_list))
            
            if start_date:
                query = query.filter(Sailing.start_date >= start_date)
            
            if end_date:
                query = query.filter(Sailing.end_date <= end_date)
            
            sailings = query.order_by(Sailing.start_date.desc()).all()
            
            result = []
            for sailing in sailings:
                result.append({
                    'sailing_number': sailing.sailing_number,
                    'ship_name': sailing.ship.name,
                    'start_date': sailing.start_date.isoformat() if sailing.start_date else None,
                    'end_date': sailing.end_date.isoformat() if sailing.end_date else None,
                    'port_departure': sailing.port_departure,
                    'port_arrival': sailing.port_arrival
                })
            
            return result
    
    def fetch_cruise_ratings(self, sailing_list: List[Dict]) -> List[Dict]:
        """Fetch cruise ratings with RLS filtering"""
        if not self.current_user_id or not sailing_list:
            return []
        
        # Implementation would query the CruiseRating table with sailing filtering
        # For now return empty list as this would require more complex RLS logic
        return []
    
    def fetch_issues(self, ships: List[str] = None, sailing_numbers: List[str] = None, sheets: List[str] = None) -> List[Dict]:
        """Fetch issues with RLS filtering"""
        if not self.current_user_id:
            return []
        
        # Implementation would query the Issue table with RLS filtering
        # For now return empty list as this would require more complex RLS logic
        return []

# Create global database manager instance
db_manager = DatabaseManager()

# Convenience functions that use the global instance
def authenticate_user(username: str, password: str) -> Optional[Dict]:
    return db_manager.authenticate_user(username, password)

def create_user(username: str, password: str, role: str) -> Dict:
    return db_manager.create_user(username, password, role)

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
