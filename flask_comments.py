"""
JWT Authentication Summary for Apollo Intelligence API:

PUBLIC ENDPOINTS (No JWT required):
- POST /sailing/auth - User authentication (login)
- GET /sailing/health - Health check endpoint
- OPTIONS /sailing/* - CORS preflight requests

PROTECTED ENDPOINTS (JWT required):
- GET /sailing/fleets - Fleet data
- GET /sailing/sheets - Sheet names  
- GET /sailing/metrics - Available metrics
- GET /sailing/ships - Available ships
- GET /sailing/sailing_numbers - Sailing numbers
- POST /sailing/sailing_numbers_filter - Filter sailing numbers
- POST /sailing/getRatingSmry - Rating summaries
- POST /sailing/getMetricRating - Metric comparisons
- POST /sailing/semanticSearch - Semantic search
- POST /sailing/getIssuesList - Issues list
- POST /sailing/refresh - Token refresh (requires refresh token)
- POST /sailing/logout - Logout (blacklist token)
- GET /sailing/verify - Token verification

ADMIN-ONLY ENDPOINTS (JWT + admin role required):
- GET /sailing/check - Admin check endpoint
- GET /sailing/admin/users - Get all users
- GET /sailing/admin/system-info - System information
- POST /sailing/admin/add-user - Create new user
- POST /sailing/admin/reset-password - Reset user password
- GET /sailing/admin/list-users - List all users

USER MANAGEMENT ENDPOINTS:
- POST /sailing/reset-own-password - Reset own password (JWT required)

SECURITY MODEL:
- All data access requires valid JWT token
- Tokens expire after 1 hour (configurable)
- Refresh tokens valid for 30 days
- Blacklisted tokens are tracked
- Role-based access control for admin endpoints
- CORS configured for frontend domains only
"""

from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from flask_compress import Compress
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, create_refresh_token, get_jwt_identity, get_jwt
from typing import Dict, List
from test_data import *
from navigate_search import *
import util as UT
# from util import get_sailing_mapping, filter_sailings
import pandas as pd
import yaml
from werkzeug.security import check_password_hash, generate_password_hash
from pathlib import Path
import sql_ops as SQLOP
import gzip
import json
import datetime
from functools import wraps

app = Flask(__name__)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = 'your-super-secret-jwt-key-change-in-production'  # Change this in production!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)  # Token expires in 1 hour
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days=30)  # Refresh token expires in 30 days
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']

# Initialize JWT
jwt = JWTManager(app)

# Blacklist for storing revoked tokens (in production, use Redis or database)
blacklisted_tokens = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if token is in blacklist"""
    jti = jwt_payload['jti']
    return jti in blacklisted_tokens

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """Handle expired tokens"""
    return jsonify({
        'authenticated': False,
        'error': 'Token has expired',
        'code': 'token_expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    """Handle invalid tokens"""
    return jsonify({
        'authenticated': False,
        'error': 'Invalid token',
        'code': 'invalid_token'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    """Handle missing tokens"""
    return jsonify({
        'authenticated': False,
        'error': 'Authorization token required',
        'code': 'missing_token'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """Handle revoked tokens"""
    return jsonify({
        'authenticated': False,
        'error': 'Token has been revoked',
        'code': 'token_revoked'
    }), 401

# Enable compression for all responses
compress = Compress()
compress.init_app(app)

# Configure compression settings
app.config['COMPRESS_MIMETYPES'] = [
    'text/html',
    'text/css',
    'text/xml',
    'text/javascript',
    'application/json',
    'application/javascript',
    'application/xml+rss',
    'application/atom+xml',
    'image/svg+xml'
]
app.config['COMPRESS_LEVEL'] = 6  # Good balance between compression and speed
app.config['COMPRESS_MIN_SIZE'] = 500  # Only compress responses larger than 500 bytes

# CORS(app)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://44.243.87.16:8080",  # React dev server
            "http://localhost:8080",
            "http://192.168.48.1:8081",
            "http://172.16.150.127:8081",
            "http://192.168.48.1:8080",
            "http://172.16.150.127:8080",
            "http://44.244.127.80",
            "http://apollo.deepthoughtconsultech.com",
            "apollo.deepthoughtconsultech.com",
            "ag.api.deepthoughtconsultech.com"
        ],
        "supports_credentials": True,
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "Content-Encoding",
            "Cache-Control",
            "Accept",
            "Accept-Encoding",
            "Accept-Language",
            "Origin",
            "User-Agent",
            "X-Requested-With"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "expose_headers": ["Content-Type", "Authorization"]
    }
})

# CORS(app, resources={
#     r"/sailing/*": {
#         "origins": ["http://localhost:8081", "http://localhost:8082", "http://localhost:3000", "http://127.0.0.1:8081"],
#         "methods": ["GET", "POST", "OPTIONS"],
#         "allow_headers": ["Content-Type", "Authorization"],
#         "supports_credentials": True
#     }
# })

# CORS(app, resources={
#     r"/sailing/*": {
#         "origins": ["http://localhost:8081", "http://localhost:8082", "http://localhost:3000", "http://127.0.0.1:8081", "http://192.168.57.157:8081", "http://192.168.57.*:8081"],
#         "methods": ["GET", "POST", "OPTIONS"],
#         "allow_headers": ["Content-Type", "Authorization"],
#         "supports_credentials": True
#     }
# })

METRIC_ATTRIBUTES_OLD = ['Ship overall', 'Ship rooms', 'F&B quality overall',
       'F&B service overall', 'F&B quality main dining', 'Entertainment',
       'Excursions', 'drinks offerings', 'bar service', 'cabin cleanliness',
       'crew friendliness', 'Sentiment analysis', 'Primary issues mentioned',
       'Review']

METRIC_ATTRIBUTES = ['Overall Holiday', 'Prior Customer Service', 'Flight', 'Embarkation/Disembarkation', 'Value for Money', 'App Booking', 'Pre-Cruise Hotel Accomodation', 'Cabins', 'Cabin Cleanliness', 'F&B Quality', 'F&B Service', 'Bar Service', 'Drinks Offerings and Menu', 'Entertainment', 'Excursions', 'Crew Friendliness', 'Ship Condition/Cleanliness (Public Areas)', 'Sentiment Score']

FLEET_DATA=[
        {"fleet":"marella",
         "ships": ["explorer", "discovery", "discovery 2", "explorer 2", "voyager"]
         }
    ]

SHEET_LIST = ["Ports and Excursions", "Other Feedback", "Entertainment",
               "Bars", "Dining", "What went well", "What else"
              ]

# SAILING_LIST_MAPPING, SAILING_NUMBER_LIST = UT.get_sailing_mapping(FLEET_DATA)
# Sample data matching your structure
SAMPLE_DATA = get_summary_data()
# print(SAMPLE_DATA)
AUTH_FILE = Path("sailing_auth.yaml")
def load_auth_data():
    """Load authentication data from YAML file"""
    if not AUTH_FILE.exists():
        raise FileNotFoundError(f"Auth file not found at {AUTH_FILE}")
    
    with open(AUTH_FILE, 'r') as f:
        return yaml.safe_load(f)


SAILING_DATA, SAILING_REASON = load_sailing_data_rate_reason()
# print(SAILING_DATA)
# print(SAILING_REASON)
print(f"Available sailing data keys: {list(SAILING_DATA.keys()) if SAILING_DATA else 'No data'}")
print(f"Sample keys: {list(SAILING_DATA.keys())[:5] if SAILING_DATA else 'No data'}")

# Create ship code mapping based on sailing number patterns
SHIP_CODE_MAPPING = {
    'MEX': 'explorer',  # Based on the sailing numbers we're seeing
    'MD2': 'discovery 2',
    'ME2': 'explorer 2', 
    'MV': 'voyager',
    'MD': 'discovery'
}

def extract_ship_from_sailing_number(sailing_number: str) -> str:
    """Extract ship name from sailing number format like MEX-14-20March-CanarianFlavours"""
    if '-' in sailing_number:
        ship_code = sailing_number.split('-')[0]
        return SHIP_CODE_MAPPING.get(ship_code, ship_code.lower())
    # Handle MDY format
    if sailing_number.upper().startswith('MDY'):
        return 'discovery 2'  # MDY maps to discovery 2
    return sailing_number.lower()

def find_sailing_data_key(sailing_number: str) -> tuple:
    """Find the correct key in SAILING_DATA for a given sailing number"""
    sailing_lower = sailing_number.lower()
    
    print(f"Searching for sailing number: '{sailing_number}' (lowercase: '{sailing_lower}')")
    
    # Extract components from sailing number like MDY-12-19Jan
    if '-' in sailing_number:
        parts = sailing_number.split('-')
        ship_code = parts[0].lower()  # mdy
        
        # Handle different formats
        if len(parts) >= 3:
            date_part1 = parts[1]  # 12
            date_part2 = parts[2]  # 19Jan
            
            # Try to match with SAILING_DATA keys
            for key in SAILING_DATA.keys():
                print(f"Checking key: '{key}'")
                
                # Check if key contains the ship code and date parts
                if ship_code in key:
                    # For MDY-12-19Jan, look for patterns like mdy2-12-19jan_1
                    key_lower = key.lower()
                    
                    # Extract date parts from the sailing number
                    if date_part1 in key_lower and date_part2.lower() in key_lower:
                        print(f"Found match: '{key}' for sailing '{sailing_number}'")
                        
                        # Extract ship name from key
                        ship_part = key.rsplit('_', 1)[0]
                        if '-' in ship_part:
                            ship_name = ship_part.split('-')[0]
                            ship_mapping = {
                                'mdy2': 'discovery 2',
                                'mdy': 'discovery 2',  # Handle both MDY and MDY2
                                'mex': 'explorer',
                                'me2': 'explorer 2',
                                'mv': 'voyager',
                                'md': 'discovery'
                            }
                            actual_ship = ship_mapping.get(ship_name, ship_name)
                            return actual_ship, key
    
    # Fallback: try fuzzy matching
    print(f"No exact match found, trying fuzzy matching...")
    for key in SAILING_DATA.keys():
        key_parts = key.lower().replace('_', '').replace('-', '')
        sailing_parts = sailing_lower.replace('-', '').replace(' ', '')
        
        # Check if key contains significant parts of the sailing number
        if len(sailing_parts) > 3:
            if sailing_parts[:3] in key_parts:  # Check first 3 chars (ship code)
                print(f"Fuzzy match found: '{key}' for sailing '{sailing_number}'")
                ship_part = key.rsplit('_', 1)[0]
                if '-' in ship_part:
                    ship_name = ship_part.split('-')[0]
                    ship_mapping = {
                        'mdy2': 'discovery 2',
                        'mdy': 'discovery 2',
                        'mex': 'explorer',
                        'me2': 'explorer 2',
                        'mv': 'voyager',
                        'md': 'discovery'
                    }
                    actual_ship = ship_mapping.get(ship_name, ship_name)
                    return actual_ship, key
    
    print(f"No match found for sailing number: '{sailing_number}'")
    return None, None

def get_sailing_df(ship: str, sailing_number: str):
    """Helper to get DataFrame for specific sailing"""
    key = f"{ship}_{sailing_number}"
    key = key.lower()
    print(f"Looking for key: '{key}' in SAILING_DATA")
    result = SAILING_DATA.get(key)
    if result is None:
        print(f"Key '{key}' not found. Available keys matching pattern: {[k for k in SAILING_DATA.keys() if sailing_number.lower() in k.lower()]}")
    return result

def get_sailing_df_by_key(key: str):
    """Helper to get DataFrame for specific sailing by exact key"""
    return SAILING_DATA.get(key)

def get_sailing_df_reason_by_key(key: str):
    """Helper to get reason DataFrame for specific sailing by exact key"""
    return SAILING_REASON.get(key)

def get_sailing_df_reason(ship: str, sailing_number: str):
    """Helper to get DataFrame for specific sailing"""
    key = f"{ship}_{sailing_number}"
    key = key.lower()
    return SAILING_REASON.get(key)

# Helper functions
def generate_rating_text(score: float, attribute: str) -> str:
    """Generate realistic rating text based on score"""
    if score >= 8:
        return f"Exceptional {attribute.lower()} experience. Guests rated this {score:.1f}/10"
    elif score >= 6:
        return f"Positive {attribute.lower()} feedback with {score:.1f} rating. Most guests were satisfied"
    elif score >= 4:
        return f"Average {attribute.lower()} rating of {score:.1f}. Some room for improvement"
    else:
        return f"Critical feedback on {attribute.lower()} ({score:.1f}). Needs immediate attention"

def find_sailings(sailings: List[Dict]) -> List[Dict]:
    """Filter sample data based on requested sailings"""
    results = []
    for sailing in sailings:
        ship = sailing.get("shipName")
        number = sailing.get("sailingNumber")
        found = next(
            (item for item in SAMPLE_DATA 
             if item["Ship Name"].lower() == ship.lower() and item["Sailing Number"].lower() == number.lower()),
            None
        )
        if found:
            results.append(found)
    return results

def filter_sailings(data):
    filter_by = data.get("filter_by", "sailing")
    print("in filter_sailings")

    results = []

    if filter_by == "sailing":
        # Get requested sailings if provided
        if "sailings" in data:
            results = find_sailings(data["sailings"])
        else:
            return -1

    elif filter_by == "date":
        # Apply date filters if provided
        if "filters" in data:
            from_date = pd.to_datetime(data["filters"].get("fromDate"))
            to_date = pd.to_datetime(data["filters"].get("toDate"))
            print(from_date, to_date)

            if not from_date or not to_date:
                return -2

            # Filter SAMPLE_DATA by date range
            results = [
                item for item in SAMPLE_DATA
                if pd.to_datetime(item["Start"]) >= from_date and pd.to_datetime(item["End"]) <= to_date
            ]
        else:
            return -3

    else:
        return -4

    # Remove duplicates if both sailings and date filters are applied
    results = {frozenset(item.items()): item for item in results}.values()
    return results

# Role-based access control decorator
def require_role(required_role):
    """Decorator to require specific role for access"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            token_claims = get_jwt()
            user_role = token_claims.get('role', 'user')
            
            # Admin can access everything
            if user_role == 'admin':
                return f(*args, **kwargs)
            
            # Check if user has required role
            if user_role != required_role:
                return jsonify({
                    'error': f'Access denied. Required role: {required_role}',
                    'code': 'insufficient_permissions'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_permission(required_permission):
    """Decorator to require specific permission for access"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            token_claims = get_jwt()
            user_permissions = token_claims.get('permissions', [])
            
            # Check if user has required permission
            if required_permission not in user_permissions:
                return jsonify({
                    'error': f'Access denied. Required permission: {required_permission}',
                    'code': 'insufficient_permissions'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator



# API Endpoints
@app.route('/sailing/check', methods=['GET'])
@require_role('admin')
def get_check():
    return jsonify({
        "status": "success",
        "message": "Admin access confirmed",
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

@app.errorhandler(404)
def not_found(e):
    return {"error": "Not Found"}, 404

@app.before_request
def decompress_request():
    """Handle compressed request bodies"""
    if request.headers.get('Content-Encoding') == 'gzip':
        try:
            # Decompress gzipped request data
            compressed_data = request.get_data()
            if compressed_data:
                decompressed_data = gzip.decompress(compressed_data)
                # Replace the request data with decompressed data
                request._cached_data = decompressed_data
        except Exception as e:
            app.logger.error(f"Failed to decompress request: {str(e)}")
            return jsonify({"error": "Invalid compressed data"}), 400

@app.before_request
def whitelist_sailing_routes():
    path = request.path
    ip = request.remote_addr

    if not path.startswith("/sailing"):
        app.logger.warning(f"Blocked path: {path} | IP: {ip}")
        abort(404, description="")  # empty response body

@app.after_request
def remove_server_header(response):
    """Add compression and security headers"""
    response.headers["Server"] = ""
    
    # Add compression headers for better caching
    if response.status_code == 200 and response.content_length and response.content_length > 500:
        response.headers["Vary"] = "Accept-Encoding"
    
    # Add performance headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response


@app.route('/sailing/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle preflight OPTIONS requests for all sailing routes"""
    response = jsonify({})
    # Allow requests from your network
    origin = request.headers.get('Origin')
    allowed_origins = [
        'http://localhost:8080', 
        'http://127.0.0.1:8080',
        "http://44.243.87.16:8080",
        "http://apollo.deepthoughtconsultech.com",
        "http://172.16.150.127:8080",
        "http://44.244.127.80",
    ]
    if origin and any(origin.startswith(allowed.rsplit(':', 1)[0]) for allowed in allowed_origins):
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', '*')
    
    response.headers.add('Access-Control-Allow-Headers', 
                        'Content-Type,Authorization,Content-Encoding,Cache-Control,Accept,Accept-Encoding,Accept-Language,Origin,User-Agent,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '3600')  # Cache preflight for 1 hour
    response.headers.add('Access-Control-Expose-Headers', 'Content-Type,Authorization')
    return response


@app.route('/sailing/fleets', methods=['GET'])
@jwt_required()
def get_fleets():
    """Endpoint to retrieve fleet names and the ships under each fleet - Requires authentication"""
    return jsonify({
        "status": "success",
        "data": FLEET_DATA
    })

@app.route('/sailing/sheets', methods=['GET'])
@jwt_required()  
def get_sheets():
    """Endpoint to retrieve sheet names - Requires authentication"""
    return jsonify({
        "status": "success",
        "data": SHEET_LIST
    })

@app.route('/sailing/metrics', methods=['GET'])
@jwt_required()
def get_metrics():
    """Endpoint to retrieve various metrics related to sailing - Requires authentication"""
    return jsonify({
        "status": "success",
        "data": METRIC_ATTRIBUTES
    })

@app.route('/sailing/ships', methods=['GET'])
@jwt_required()
def get_ships():
    """Endpoint to get available ships - Requires authentication"""
    SHIPS = []
    for ent in SAMPLE_DATA:
        SHIPS.append(ent["Ship Name"])
    return jsonify({
        "status": "success",
        "data": [{"name": ship, "id": idx+1} for idx, ship in enumerate(SHIPS)]
    })

@app.route('/sailing/sailing_numbers', methods=['GET'])
@jwt_required()
def get_sailing_numbers():
    """Endpoint to retrieve sailing numbers - Requires authentication"""
    sailing_list = SQLOP.fetch_sailings(None,None,None)
    return jsonify({
        "status": "success",
        "data": sailing_list
    })

@app.route('/sailing/sailing_numbers_filter', methods=['POST'])
@jwt_required()
def get_sailing_numbers_filter():
    """Filter sailing numbers - Requires authentication"""
    data = request.get_json()
    # Validate input    
    ships_list = data.get("ships", [])
    start_date = data.get("start_date", None)
    end_date = data.get("end_date", None)
    
    if start_date == "-1":
        start_date = None
    if end_date == "-1":
        end_date = None
      
    res = SQLOP.fetch_sailings(ships_list, start_date, end_date)
    
    return jsonify({
        "status": "success",
        "data": res
    })



@app.route('/sailing/getRatingSmry', methods=['POST'])
@jwt_required()
def get_rating_summary():
    data = request.get_json()
    fleets = data.get("fleets")
    ships = data.get("ships")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    sailing_number_filter = data.get("sailing_numbers", [])
    
    if start_date == "-1":
        start_date = None
    if end_date == "-1":
        end_date = None
    if sailing_number_filter == []:
        sailing_list = SQLOP.fetch_sailings(ships, start_date, end_date)
    else:
        sailing_list = sailing_number_filter

    res = SQLOP.fetch_cruise_ratings(sailing_list)

    return jsonify({
        "status": "success",
        "data": res
    })


# def get_rating_summary_old():
#     """Endpoint for getting full rating summaries"""
#     data = request.get_json()
#     print(data)

#     # Validate input
#     if not data or ("sailings" not in data and "filters" not in data):
#         return jsonify({"error": "Missing sailings or filters parameter"}), 400
    
#     working_data = filter_sailings(data)
#     if working_data == -1:
#         return jsonify({"error": "Sailings must be provided when filtering by sailing"}), 400
#     if working_data == -2:
#         return jsonify({"error": "Both fromDate and toDate must be provided when filtering by date"}), 400
#     if working_data == -3:
#         return jsonify({"error": "Filters must be provided when filtering by date"}), 400
#     if working_data == -4:
#         return jsonify({"error": "Invalid filterBy value. Must be 'sailing' or 'date'"}), 400
# #     working_data = is_empty_or_nan_rating(working_data)
# #     print(working_data)
#     return jsonify({
#         "status": "success",
#         "count": len(working_data),
#         "data": list(working_data)
#     })

import math  # Import the math module for isnan()

def is_empty_or_nan(value):
    """
    Checks if a value is None, NaN, or an empty sequence.

    Args:
        value: The value to check.

    Returns:
        True if the value is None, NaN, or an empty sequence (list, tuple, string, dict), False otherwise.
    """
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    if isinstance(value, (list, tuple, str, dict)):
        return len(value) < 1
    return False #added this

@app.route('/sailing/getMetricRating', methods=['POST'])
@jwt_required()
def get_metric_comparison():
    """Enhanced endpoint with metric value filtering"""
    data = request.get_json()
    print("data", data)
    
    # Validate input
    if not data or "metric" not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    metric = data["metric"]
    filter_below = data.get("filterBelow")
    compare_avg = data.get("compareToAverage", False)
    
    # Modern filter handling - same pattern as getRatingSmry
    ships = data.get("ships", [])
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    sailing_number_filter = data.get("sailing_numbers", [])
    
    if start_date == "-1":
        start_date = None
    if end_date == "-1":
        end_date = None
    
    print(f"Filter parameters: ships={ships}, start_date={start_date}, end_date={end_date}, sailing_numbers={sailing_number_filter}")

    # Validate metric (excluding 'Review')
    if metric not in METRIC_ATTRIBUTES:
        return jsonify({
            "error": "Metric must be a numeric field (not 'Review')",
            "valid_metrics": METRIC_ATTRIBUTES
        }), 400
    
    # Get sailing list using modern approach
    if sailing_number_filter == [] or not sailing_number_filter:
        sailing_list = SQLOP.fetch_sailings(ships, start_date, end_date)
    else:
        sailing_list = sailing_number_filter
    
    print(f"Retrieved sailing_list: {sailing_list}")

    # Prepare response
    results = []
    all_metric_values = []

    for sailing_number in sailing_list:
        print("Processing sailing number:", sailing_number)
        
        # Find the correct ship and key for this sailing number
        ship_name, sailing_key = find_sailing_data_key(str(sailing_number))
        
        if not ship_name or not sailing_key:
            print(f"No data found for sailing number: {sailing_number}")
            results.append({
                "ship": "Unknown",
                "sailingNumber": str(sailing_number),
                "error": "No data found for sailing number"
            })
            continue
        
        print(f"Found ship: '{ship_name}', key: '{sailing_key}' for sailing: '{sailing_number}'")
        
        # Get the actual data using the found key
        df = get_sailing_df_by_key(sailing_key)
        df_reason = get_sailing_df_reason_by_key(sailing_key)
        
        if df is None or metric not in df.columns:
            results.append({
                "ship": ship_name,
                "sailingNumber": str(sailing_number),
                "error": "Data not found" if df is None else f"Metric '{metric}' not found in data"
            })
            continue
        
        # Calculate basic stats
        metric_values = pd.to_numeric(df[metric], errors='coerce').dropna()
        avg_rating = metric_values.mean()
        all_metric_values.extend(metric_values.tolist())
        
        # Get filtered reviews if requested
        filtered_reviews = []
        filtered_metric = []
        if filter_below is not None:
            mask = df[metric].astype(float) <= filter_below
            filtered_reviews = df_reason.loc[mask, metric].tolist()
            for i, rev in enumerate(filtered_reviews):
                if is_empty_or_nan(rev):
                    filtered_reviews[i] = "Please refer to the comment"
            filtered_metric = df.loc[mask, metric].tolist()
        
        results.append({
            "ship": ship_name,
            "sailingNumber": str(sailing_number),
            "metric": metric,
            "averageRating": round(avg_rating, 2),
            "ratingCount": len(metric_values),
            "filteredReviews": filtered_reviews,
            "filteredComments": filtered_reviews,  # Same data as reviews for collapsible display
            "filteredMetric": filtered_metric,
            "filteredCount": len(filtered_reviews)
        })
    
    # Add comparison to overall average if requested
    if compare_avg and all_metric_values:
        overall_avg = sum(all_metric_values) / len(all_metric_values)
        for result in results:
            if "averageRating" in result:
                result["comparisonToOverall"] = round(result["averageRating"] - overall_avg, 2)
    
    return jsonify({
        "status": "success",
        "metric": metric,
        "results": results,
        "filterBelow": filter_below,
        "comparedToAverage": compare_avg
    })

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
            # Create JWT tokens
            access_token = create_access_token(
                identity=username,
                additional_claims={
                    'role': user_data.get('role', 'user'),
                    'permissions': user_data.get('permissions', [])
                }
            )
            refresh_token = create_refresh_token(identity=username)
            
            return jsonify({
                "authenticated": True,
                "user": username,
                "role": user_data.get('role', 'user'),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()
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

@app.route('/sailing/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        current_user = get_jwt_identity()
        
        # Load user data to get role and permissions
        auth_data = load_auth_data()
        user_data = auth_data['users'].get(current_user)
        
        if not user_data:
            return jsonify({
                "authenticated": False,
                "error": "User not found"
            }), 404
        
        # Create new access token
        new_access_token = create_access_token(
            identity=current_user,
            additional_claims={
                'role': user_data.get('role', 'user'),
                'permissions': user_data.get('permissions', [])
            }
        )
        
        return jsonify({
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Token refresh failed: {str(e)}"
        }), 500

@app.route('/sailing/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user and blacklist tokens"""
    try:
        # Get current token's JTI (JWT ID)
        token = get_jwt()
        jti = token['jti']
        
        # Add token to blacklist
        blacklisted_tokens.add(jti)
        
        return jsonify({
            "message": "Successfully logged out"
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Logout failed: {str(e)}"
        }), 500

@app.route('/sailing/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify if the current token is valid"""
    try:
        current_user = get_jwt_identity()
        token_claims = get_jwt()
        
        return jsonify({
            "authenticated": True,
            "user": current_user,
            "role": token_claims.get('role', 'user'),
            "permissions": token_claims.get('permissions', []),
            "expires_at": token_claims.get('exp')
        })
        
    except Exception as e:
        return jsonify({
            "authenticated": False,
            "error": f"Token verification failed: {str(e)}"
        }), 401
    
@app.route('/sailing/semanticSearch', methods=['POST'])
@jwt_required()
def get_semantic_search():
    """Endpoint for semantic search based on user query and filters"""
    data = request.get_json()

    # Validate input
    query = data.get("query")
    fleets = data.get("fleets")
    ships = data.get("ships")
    start_date = data.get("start_date", None)
    end_date = data.get("end_date", None)
    sailing_number_filter = data.get("sailing_numbers", None)
    sheet_names = data.get("sheet_names", [])
    meal_time = data.get("meal_time")
    semantic = data.get("semanticSearch", True)
    # similarity_threshold = data.get("similarity_threshold", 0.7)
    similarity_range = data.get("similarity_score_range", [0,1])
    num_results = data.get("num_results", 10)

    if not query:
        return jsonify({"error": "Search query is mandatory"}), 400

    fleets = [doc.lower() for doc in fleets]
    ships = [doc.lower() for doc in ships]
    sheet_names = [doc.lower() for doc in sheet_names]
    
#     print(start_date, end_date)
    
    if start_date == "-1":
        start_date = None
    if end_date == "-1":
        end_date = None
    if sailing_number_filter == []:
        sailing_number_filter = None
       
    similarity_threshold = similarity_range[0]

    if semantic == True:
        results = semantic_search(query,num_results,similarity_threshold, True, fleets, ships,
                        sheet_names, None, meal_time,
                        start_date, sailing_number_filter )
    else:
        results = word_search(query,num_results, True, fleets, ships,
                        sheet_names, None, meal_time,
                        start_date, sailing_number_filter )
#     print(results)
#     if results == []:
#         return jsonify({
#         "status": "success",
#         "results": "Nothing to show"
#     })
    
    print(results)
    data = results.to_dict(orient='records')
    
    return jsonify({
        "status": "success",
        "results": data
    })


def add_sailing_summaries(issues_list):
    """Add sailing summaries to issues list for better presentation"""
    print(f"[DEBUG] add_sailing_summaries called with: {issues_list}")
    print(f"[DEBUG] Issues list type: {type(issues_list)}")
    print(f"[DEBUG] Issues list length: {len(issues_list) if issues_list else 'None/Empty'}")
    
    if not issues_list:
        print("[DEBUG] No issues found, returning empty structure")
        return {"sailing_summaries": [], "all_issues": [], "total_issues": 0}
    
    # Group issues by sailing
    sailing_groups = {}
    total_issues = 0
    
    for issue in issues_list:
        print(f"[DEBUG] Processing issue: {issue}")
        sailing_key = f"{issue.get('ship_name', 'Unknown')}_{issue.get('sailing_number', 'Unknown')}"
        
        if sailing_key not in sailing_groups:
            sailing_groups[sailing_key] = {
                "ship_name": issue.get('ship_name', 'Unknown'),
                "sailing_number": issue.get('sailing_number', 'Unknown'),
                "start_date": issue.get('start_date', 'Unknown'),
                "end_date": issue.get('end_date', 'Unknown'),
                "issues": [],
                "issue_count": 0,
                "sailing_summary": f"Summary for {issue.get('ship_name', 'Unknown')} sailing {issue.get('sailing_number', 'Unknown')}: {sailing_groups[sailing_key]['issue_count'] if sailing_key in sailing_groups else 0} issues identified"
            }
        
        sailing_groups[sailing_key]["issues"].append({
            "sheet_name": issue.get('sheet_name', 'Unknown'),
            "issues": issue.get('issues', 'No issues found')
        })
        sailing_groups[sailing_key]["issue_count"] += 1
        total_issues += 1
    
    # Update sailing summaries with final issue counts
    for sailing in sailing_groups.values():
        sailing["sailing_summary"] = f"Summary for {sailing['ship_name']} sailing {sailing['sailing_number']}: {sailing['issue_count']} issues identified across {len(sailing['issues'])} categories"
    
    # Convert to list format
    sailing_summaries = list(sailing_groups.values())
    
    result = {
        "sailing_summaries": sailing_summaries,
        "all_issues": issues_list,  # Include raw issues list for detailed view
        "total_issues": total_issues,
        "sailing_count": len(sailing_summaries)
    }
    
    print(f"[DEBUG] Returning result: {result}")
    print(f"[DEBUG] Result keys: {result.keys()}")
    print(f"[DEBUG] all_issues in result: {result.get('all_issues')}")
    
    return result

@app.route('/sailing/getIssuesList', methods=['POST'])
@jwt_required()
def get_issues_list():
    """Endpoint to retrieve a summary of issues based on user input"""
    data = request.get_json()
    print(f"[DEBUG] Issues request data: {data}")
    
#     ships = data.get("ships", None)
    sailing_numbers = data.get("sailing_numbers", None)
    sheets = data.get("sheets", None)
    ships = None
    
    print(f"[DEBUG] Fetching issues with: ships={ships}, sailing_numbers={sailing_numbers}, sheets={sheets}")

    issues_list=SQLOP.fetch_issues(ships,sailing_numbers, sheets)
    print(f"[DEBUG] Raw issues_list from SQLOP.fetch_issues: {issues_list}")
    print(f"[DEBUG] Issues list type: {type(issues_list)}")
    print(f"[DEBUG] Issues list length: {len(issues_list) if issues_list else 'None/Empty'}")
    
    final_list =  add_sailing_summaries(issues_list)
    print(f"[DEBUG] Final list after add_sailing_summaries: {final_list}")
    print(f"[DEBUG] Final list keys: {final_list.keys() if isinstance(final_list, dict) else 'Not a dict'}")

    return jsonify({
        "status": "success",
        "data": final_list
    })

@app.route('/sailing/health', methods=['GET'])
def health_check():
    """Health check endpoint - no authentication required"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "service": "Apollo Intelligence API"
    })

@app.route('/sailing/admin/users', methods=['GET'])
@require_role('admin')
def get_users():
    """Admin endpoint to get all users"""
    try:
        auth_data = load_auth_data()
        users = []
        for username, user_data in auth_data['users'].items():
            users.append({
                'username': username,
                'role': user_data.get('role', 'user'),
                'permissions': user_data.get('permissions', [])
            })
        
        return jsonify({
            "status": "success",
            "data": users
        })
    except Exception as e:
        return jsonify({
            "error": f"Failed to get users: {str(e)}"
        }), 500

@app.route('/sailing/admin/system-info', methods=['GET'])
@require_role('admin')
def get_system_info():
    """Admin endpoint to get system information"""
    return jsonify({
        "status": "success",
        "data": {
            "active_tokens": len(blacklisted_tokens),
            "jwt_secret_configured": bool(app.config.get('JWT_SECRET_KEY')),
            "token_expires_in": str(app.config['JWT_ACCESS_TOKEN_EXPIRES']),
            "refresh_expires_in": str(app.config['JWT_REFRESH_TOKEN_EXPIRES']),
            "compression_enabled": bool(app.config.get('COMPRESS_LEVEL')),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
    })

# ==============================================
# USER MANAGEMENT API ENDPOINTS
# ==============================================

def add_user_to_system(username, password, role='user'):
    """Add a new user to the auth system"""
    auth_file = Path("sailing_auth.yaml")
    
    # Create directory if it doesn't exist
    auth_file.parent.mkdir(exist_ok=True)
    
    # Load existing data or initialize empty structure
    if auth_file.exists():
        with open(auth_file, 'r') as f:
            auth_data = yaml.safe_load(f) or {}
    else:
        auth_data = {}
    
    # Initialize users dictionary if it doesn't exist
    if 'users' not in auth_data:
        auth_data['users'] = {}
    
    # Check if user already exists
    if username in auth_data['users']:
        return False, f"User '{username}' already exists!"
    
    # Validate password length
    if len(password) < 8:
        return False, "Password must be at least 8 characters!"
    
    # Hash the password
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    
    # Add user to data structure
    auth_data['users'][username] = {
        'password': hashed_password,
        'role': role
    }
    
    # Write back to file
    try:
        with open(auth_file, 'w') as f:
            yaml.dump(auth_data, f, sort_keys=False)
        return True, f"Successfully added user '{username}' with role '{role}'"
    except Exception as e:
        return False, f"Error saving user: {str(e)}"

def reset_user_password_system(username, new_password):
    """Reset password for an existing user"""
    auth_file = Path("sailing_auth.yaml")
    
    # Check if auth file exists
    if not auth_file.exists():
        return False, "No users found! Authentication file doesn't exist."
    
    # Load existing data
    try:
        with open(auth_file, 'r') as f:
            auth_data = yaml.safe_load(f) or {}
    except Exception as e:
        return False, f"Error reading auth file: {str(e)}"
    
    # Check if users exist
    if 'users' not in auth_data or not auth_data['users']:
        return False, "No users found in the system!"
    
    # Check if user exists
    if username not in auth_data['users']:
        return False, f"User '{username}' not found!"
    
    # Validate password length
    if len(new_password) < 8:
        return False, "Password must be at least 8 characters!"
    
    # Hash the new password
    hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')
    
    # Update user's password (keep existing role)
    auth_data['users'][username]['password'] = hashed_password
    
    # Write back to file
    try:
        with open(auth_file, 'w') as f:
            yaml.dump(auth_data, f, sort_keys=False)
        return True, f"Successfully reset password for user '{username}'"
    except Exception as e:
        return False, f"Error saving password reset: {str(e)}"

def get_all_users_system():
    """Get list of all users in the system"""
    auth_file = Path("sailing_auth.yaml")
    
    # Check if auth file exists
    if not auth_file.exists():
        return False, "No users found! Authentication file doesn't exist.", []
    
    # Load existing data
    try:
        with open(auth_file, 'r') as f:
            auth_data = yaml.safe_load(f) or {}
    except Exception as e:
        return False, f"Error reading auth file: {str(e)}", []
    
    # Check if users exist
    if 'users' not in auth_data or not auth_data['users']:
        return True, "No users found in the system!", []
    
    # Format user list
    users = []
    for username, user_data in auth_data['users'].items():
        users.append({
            'username': username,
            'role': user_data.get('role', 'user')
        })
    
    return True, f"Found {len(users)} users", users

@app.route('/sailing/admin/add-user', methods=['POST'])
@require_role('admin')
def api_create_user():
    """Admin endpoint to create a new user"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', 'user').strip()
        
        # Validate input
        if not username or not password:
            return jsonify({
                "status": "error",
                "message": "Username and password are required"
            }), 400
        
        # Validate role
        valid_roles = ['user', 'admin', 'superadmin']
        if role not in valid_roles:
            return jsonify({
                "status": "error",
                "message": f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            }), 400
        
        # Add user to system
        success, message = add_user_to_system(username, password, role)
        
        if success:
            return jsonify({
                "status": "success",
                "message": message,
                "user": {
                    "username": username,
                    "role": role
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": message
            }), 400
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to create user: {str(e)}"
        }), 500

@app.route('/sailing/admin/reset-password', methods=['POST'])
@require_role('admin')
def api_reset_password():
    """Admin endpoint to reset a user's password"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        new_password = data.get('new_password', '').strip()
        
        # Validate input
        if not username or not new_password:
            return jsonify({
                "status": "error",
                "message": "Username and new password are required"
            }), 400
        
        # Reset password
        success, message = reset_user_password_system(username, new_password)
        
        if success:
            return jsonify({
                "status": "success",
                "message": message,
                "username": username
            })
        else:
            return jsonify({
                "status": "error",
                "message": message
            }), 400
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to reset password: {str(e)}"
        }), 500

@app.route('/sailing/admin/list-users', methods=['GET'])
@require_role('admin')
def api_list_users():
    """Admin endpoint to list all users"""
    try:
        success, message, users = get_all_users_system()
        
        return jsonify({
            "status": "success" if success else "error",
            "data": users
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to list users: {str(e)}"
        }), 500

@app.route('/sailing/reset-own-password', methods=['POST'])
@jwt_required()
def reset_own_password():
    """Endpoint for users to reset their own password"""
    try:
        data = request.get_json()
        current_password = data.get('current_password', '').strip()
        new_password = data.get('new_password', '').strip()
        
        # Validate input
        if not current_password or not new_password:
            return jsonify({
                "status": "error",
                "message": "Current password and new password are required"
            }), 400
        
        # Get current user from JWT
        current_user = get_jwt_identity()
        
        # Load auth data to verify current password
        auth_data = load_auth_data()
        user_data = auth_data['users'].get(current_user)
        
        if not user_data:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404
        
        # Verify current password
        if not check_password_hash(user_data['password'], current_password):
            return jsonify({
                "status": "error",
                "message": "Current password is incorrect"
            }), 400
        
        # Reset password using the system function
        success, message = reset_user_password_system(current_user, new_password)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "Password updated successfully"
            })
        else:
            return jsonify({
                "status": "error",
                "message": message
            }), 400
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to reset password: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)