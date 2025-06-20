from flask import Flask, request, jsonify, abort, session
from flask_cors import CORS
from typing import Dict, List
from test_data import *
from navigate_search import *
import util as UT
import pandas as pd
import yaml
from werkzeug.security import check_password_hash, generate_password_hash
from pathlib import Path
import sql_ops_rls as SQLOP

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

CORS(app, resources={
    r"/*": {
        "origins": [
            "http://44.243.87.16:8080",
            "http://localhost:8080",
            "http://localhost:3000",  # Add your new port here
            "http://192.168.48.1:8081",
            "http://172.16.150.127:8081",
            "http://192.168.48.1:8080",
            "http://172.16.150.127:8080"
        ],
        "supports_credentials": True
    }
})

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

# Sample data matching your structure
SAMPLE_DATA = get_summary_data()

AUTH_FILE = Path("sailing_auth.yaml")
def load_auth_data():
    """Load authentication data from YAML file"""
    if not AUTH_FILE.exists():
        raise FileNotFoundError(f"Auth file not found at {AUTH_FILE}")
    
    with open(AUTH_FILE, 'r') as f:
        return yaml.safe_load(f)

SAILING_DATA, SAILING_REASON = load_sailing_data_rate_reason()

def get_sailing_df(ship: str, sailing_number: str):
    """Helper to get DataFrame for specific sailing"""
    key = f"{ship}_{sailing_number}"
    key = key.lower()
    return SAILING_DATA.get(key)

def get_sailing_df_reason(ship: str, sailing_number: str):
    """Helper to get DataFrame for specific sailing"""
    key = f"{ship}_{sailing_number}"
    key = key.lower()
    return SAILING_REASON.get(key)

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
        if "sailings" in data:
            results = find_sailings(data["sailings"])
        else:
            return -1

    elif filter_by == "date":
        if "filters" in data:
            from_date = pd.to_datetime(data["filters"].get("fromDate"))
            to_date = pd.to_datetime(data["filters"].get("toDate"))
            print(from_date, to_date)

            if not from_date or not to_date:
                return -2

            results = [
                item for item in SAMPLE_DATA
                if pd.to_datetime(item["Start"]) >= from_date and pd.to_datetime(item["End"]) <= to_date
            ]
        else:
            return -3
    else:
        return -4

    results = {frozenset(item.items()): item for item in results}.values()
    return results

import math

def is_empty_or_nan(value):
    """Check if a value is None, NaN, or empty"""
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    if isinstance(value, (list, tuple, str, dict)):
        return len(value) < 1
    return False

def require_role(allowed_roles):
    """Decorator to require specific roles"""
    def decorator(f):
        def wrapped(*args, **kwargs):
            if 'role' not in session:
                return jsonify({"error": "Authentication required"}), 401
            
            if session['role'] not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            
            return f(*args, **kwargs)
        wrapped.__name__ = f.__name__
        return wrapped
    return decorator

# ==============================================
# AUTHENTICATION AND SESSION MANAGEMENT
# ==============================================

@app.before_request
def set_rls_context():
    """Set RLS context for each request"""
    # Skip for auth endpoint and static files
    if request.endpoint in ['authenticate', 'handle_options'] or not request.path.startswith('/sailing'):
        return
    
    user_id = session.get('user_id')
    username = session.get('username')
    role = session.get('role')
    
    if user_id and username and role:
        SQLOP.db_manager.set_user_session(user_id, username, role)
    else:
        # Clear session if no valid user
        SQLOP.db_manager.clear_user_session()

# API Endpoints
@app.route('/sailing/check', methods=['GET'])
def get_check():
    return ("hi how are you")

@app.errorhandler(404)
def not_found(e):
    return {"error": "Not Found"}, 404

@app.before_request
def whitelist_sailing_routes():
    path = request.path
    ip = request.remote_addr

    if not path.startswith("/sailing"):
        app.logger.warning(f"Blocked path: {path} | IP: {ip}")
        abort(404, description="")

@app.after_request
def remove_server_header(response):
    response.headers["Server"] = ""
    return response

@app.route('/sailing/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle preflight OPTIONS requests for all sailing routes"""
    response = jsonify({})
    origin = request.headers.get('Origin')
    allowed_origins = [
        'http://localhost:8080', 
        'http://127.0.0.1:8080',
        "http://44.243.87.16:8080",
    ]
    if origin and any(origin.startswith(allowed.rsplit(':', 1)[0]) for allowed in allowed_origins):
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
    
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/sailing/auth', methods=['POST'])
def authenticate():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                "authenticated": False,
                "error": "Username and password required"
            }), 400
        
        # Try database first, then fallback to YAML
        db_user = SQLOP.get_user_by_username(username)
        
        if db_user and check_password_hash(db_user['password_hash'] if 'password_hash' in db_user else '', password):
            # Database user
            user_id = db_user['id']
            role = db_user['role']
            
            # Set Flask session
            session['user_id'] = user_id
            session['username'] = username
            session['role'] = role
            
            # Set RLS session context
            SQLOP.db_manager.set_user_session(user_id, username, role)
            
            return jsonify({
                "authenticated": True,
                "user": username,
                "role": role
            })
        else:
            # Fallback to YAML auth
            auth_data = load_auth_data()
            user_data = auth_data['users'].get(username)
            
            if user_data and check_password_hash(user_data['password'], password):
                # For YAML users, create or get from database
                try:
                    db_user = SQLOP.get_user_by_username(username)
                    if not db_user:
                        # Create user in database
                        db_user = SQLOP.create_user(username, user_data['password'], user_data['role'])
                        SQLOP.grant_default_access(db_user['id'], user_data['role'])
                    
                    user_id = db_user['id']
                    role = user_data.get('role')
                    
                    session['user_id'] = user_id
                    session['username'] = username
                    session['role'] = role
                    
                    SQLOP.db_manager.set_user_session(user_id, username, role)
                    
                    return jsonify({
                        "authenticated": True,
                        "user": username,
                        "role": role
                    })
                except Exception as e:
                    print(f"Error creating user: {e}")
                    return jsonify({
                        "authenticated": False,
                        "error": "Authentication system error"
                    }), 500
        
        return jsonify({
            "authenticated": False,
            "error": "Invalid credentials"
        }), 401
        
    except Exception as e:
        return jsonify({
            "authenticated": False,
            "error": f"Authentication failed: {str(e)}"
        }), 500

@app.route('/sailing/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
    SQLOP.db_manager.clear_user_session()
    session.clear()
    return jsonify({"success": True})

# ==============================================
# USER MANAGEMENT ENDPOINTS (SUPERADMIN ONLY)
# ==============================================

@app.route('/sailing/users', methods=['GET'])
@require_role(['superadmin', 'admin'])
def get_users():
    """Get all users with RLS filtering"""
    try:
        users = SQLOP.get_all_users()
        return jsonify({
            "status": "success",
            "data": users
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users', methods=['POST'])
@require_role(['superadmin', 'admin'])
def create_user():
    """Create new user with role-based restrictions"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        if role not in ['superadmin', 'admin', 'user']:
            return jsonify({"error": "Invalid role"}), 400
        
        # Admins can only create normal users
        if session['role'] == 'admin' and role in ['superadmin', 'admin']:
            return jsonify({"error": "Admins can only create normal users"}), 403
        
        # Create user (sql_ops_rls.py handles password hashing internally)
        new_user = SQLOP.create_user(username, password, role)
        
        # Grant default access
        SQLOP.grant_default_access(new_user['id'], role)
        
        return jsonify({
            "status": "success",
            "data": {
                "id": new_user['id'],
                "username": new_user['username'],
                "role": role
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users/<int:user_id>', methods=['DELETE'])
@require_role(['superadmin', 'admin'])
def delete_user(user_id):
    """Delete user with role-based restrictions"""
    try:
        success = SQLOP.delete_user(user_id)
        if success:
            return jsonify({"status": "success"})
        else:
            return jsonify({"error": "User not found or cannot be deleted"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users/<int:user_id>/access', methods=['GET'])
@require_role(['superadmin', 'admin'])
def get_user_access(user_id):
    """Get user access permissions"""
    try:
        access = SQLOP.get_user_access(user_id)
        return jsonify({
            "status": "success",
            "data": access
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users/<int:user_id>/fleet-access', methods=['POST'])
@require_role(['superadmin', 'admin'])
def grant_user_fleet_access(user_id):
    """Grant fleet access to user with admin restrictions"""
    try:
        data = request.get_json()
        fleet_id = data.get('fleet_id')
        
        if not fleet_id:
            return jsonify({"error": "Fleet ID required"}), 400
        
        SQLOP.grant_fleet_access(user_id, fleet_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users/<int:user_id>/fleet-access/<int:fleet_id>', methods=['DELETE'])
@require_role(['superadmin', 'admin'])
def revoke_user_fleet_access(user_id, fleet_id):
    """Revoke fleet access from user with admin restrictions"""
    try:
        SQLOP.revoke_fleet_access(user_id, fleet_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users/<int:user_id>/ship-access', methods=['POST'])
@require_role(['superadmin', 'admin'])
def grant_user_ship_access(user_id):
    """Grant ship access to user with admin restrictions"""
    try:
        data = request.get_json()
        ship_id = data.get('ship_id')
        
        if not ship_id:
            return jsonify({"error": "Ship ID required"}), 400
        
        SQLOP.grant_ship_access(user_id, ship_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/users/<int:user_id>/ship-access/<int:ship_id>', methods=['DELETE'])
@require_role(['superadmin', 'admin'])
def revoke_user_ship_access(user_id, ship_id):
    """Revoke ship access from user with admin restrictions"""
    try:
        SQLOP.revoke_ship_access(user_id, ship_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/admin/fleets', methods=['GET'])
@require_role(['superadmin', 'admin'])
def get_all_fleets():
    """Get all fleets for access management"""
    try:
        fleets = SQLOP.get_all_fleets()
        return jsonify({
            "status": "success",
            "data": fleets
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sailing/admin/ships', methods=['GET'])
@require_role(['superadmin', 'admin'])
def get_all_ships():
    """Get all ships for access management"""
    try:
        ships = SQLOP.get_all_ships()
        return jsonify({
            "status": "success",
            "data": ships
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================================
# EXISTING DATA ENDPOINTS WITH RLS
# ==============================================

@app.route('/sailing/fleets', methods=['GET'])
def get_fleets():
    """Endpoint to retrieve fleet names and the ships under each fleet"""
    return jsonify({
        "status": "success",
        "data": FLEET_DATA
    })

@app.route('/sailing/sheets', methods=['GET'])
def get_sheets():
    """Endpoint to retrieve sheet names"""
    return jsonify({
        "status": "success",
        "data": SHEET_LIST
    })

@app.route('/sailing/metrics', methods=['GET'])
def get_metrics():
    """Endpoint to retrieve various metrics related to sailing"""
    return jsonify({
        "status": "success",
        "data": METRIC_ATTRIBUTES
    })

@app.route('/sailing/sailing_numbers', methods=['GET'])
def get_sailing_numbers():
    """Endpoint to retrieve sailing numbers with RLS filtering"""
    sailing_list = SQLOP.fetch_sailings(None, None, None)
    return jsonify({
        "status": "success",
        "data": sailing_list
    })

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
    res = SQLOP.fetch_sailings(ships_list, start_date, end_date)
    
    return jsonify({
        "status": "success",
        "data": res
    })

@app.route('/sailing/getRatingSmry', methods=['POST'])
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

    # RLS automatically filters accessible ratings
    res = SQLOP.fetch_cruise_ratings(sailing_list)

    return jsonify({
        "status": "success",
        "data": res
    })

@app.route('/sailing/getMetricRating', methods=['POST'])
def get_metric_comparison():
    """Enhanced endpoint with metric value filtering"""
    data = request.get_json()
    
    if not data or "filter_by" not in data or "metric" not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    metric = data["metric"]
    filter_below = data.get("filterBelow")
    compare_avg = data.get("compareToAverage", False)
    filter_by = data.get("filter_by", "sailing")
    
    if metric not in METRIC_ATTRIBUTES:
        return jsonify({
            "error": "Metric must be a numeric field (not 'Review')",
            "valid_metrics": METRIC_ATTRIBUTES
        }), 400
    
    working_data = filter_sailings(data)
    if working_data == -1:
        return jsonify({"error": "Sailings must be provided when filtering by sailing"}), 400
    if working_data == -2:
        return jsonify({"error": "Both fromDate and toDate must be provided when filtering by date"}), 400
    if working_data == -3:
        return jsonify({"error": "Filters must be provided when filtering by date"}), 400
    if working_data == -4:
        return jsonify({"error": "Invalid filterBy value. Must be 'sailing' or 'date'"}), 400

    results = []
    all_metric_values = []

    for sailing in working_data:
        ship = sailing["Ship Name"]
        number = sailing["Sailing Number"]
        df = get_sailing_df(ship, number)
        df_reason = get_sailing_df_reason(ship, number)
        
        if df is None or metric not in df.columns:
            results.append({
                "ship": ship,
                "sailingNumber": number,
                "error": "Data not found" if df is None else "Invalid metric"
            })
            continue
        
        metric_values = pd.to_numeric(df[metric], errors='coerce').dropna()
        avg_rating = metric_values.mean()
        all_metric_values.extend(metric_values.tolist())
        
        filtered_reviews = []
        if filter_below is not None:
            mask = df[metric].astype(float) <= filter_below
            filtered_reviews = df_reason.loc[mask, metric].tolist()
            for i, rev in enumerate(filtered_reviews):
                if is_empty_or_nan(rev):
                    filtered_reviews[i] = "Please refer to the comment"
            filtered_metric = df.loc[mask, metric].tolist()
        
        results.append({
            "ship": ship,
            "sailingNumber": number,
            "metric": metric,
            "averageRating": round(avg_rating, 2),
            "ratingCount": len(metric_values),
            "filteredReviews": filtered_reviews,
            "filteredMetric": filtered_metric,
            "filteredCount": len(filtered_reviews)
        })
    
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

@app.route('/sailing/ships', methods=['GET'])
def get_ships():
    """Get ships with RLS filtering"""
    try:
        # Use RLS-enabled function
        ships_data = SQLOP.fetch_ships()
        # Format for compatibility with existing frontend
        all_ships = []
        for fleet_data in ships_data:
            all_ships.extend(fleet_data['ships'])
        
        return jsonify({
            "status": "success",
            "data": [{"name": ship, "id": idx+1} for idx, ship in enumerate(all_ships)]
        })
    except Exception as e:
        # Fallback to sample data if database not available
        SHIPS = []
        for ent in SAMPLE_DATA:
            SHIPS.append(ent["Ship Name"])
        return jsonify({
            "status": "success",
            "data": [{"name": ship, "id": idx+1} for idx, ship in enumerate(SHIPS)]
        })

@app.route('/sailing/semanticSearch', methods=['POST'])
def get_semantic_search():
    """Endpoint for semantic search based on user query and filters"""
    data = request.get_json()

    query = data.get("query")
    fleets = data.get("fleets")
    ships = data.get("ships")
    start_date = data.get("start_date", None)
    end_date = data.get("end_date", None)
    sailing_number_filter = data.get("sailing_numbers", None)
    sheet_names = data.get("sheet_names", [])
    meal_time = data.get("meal_time")
    semantic = data.get("semanticSearch", True)
    similarity_range = data.get("similarity_score_range", [0,1])
    num_results = data.get("num_results", 10)

    if not query:
        return jsonify({"error": "Search query is mandatory"}), 400

    fleets = [doc.lower() for doc in fleets]
    ships = [doc.lower() for doc in ships]
    sheet_names = [doc.lower() for doc in sheet_names]
    
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
    
    data = results.to_dict(orient='records')
    
    return jsonify({
        "status": "success",
        "results": data
    })

@app.route('/sailing/getIssuesList', methods=['POST'])
def get_issues_list():
    """Endpoint to retrieve a summary of issues based on user input with RLS filtering"""
    data = request.get_json()
    sailing_numbers = data.get("sailing_numbers", None)
    sheets = data.get("sheets", None)
    ships = None    # RLS automatically filters accessible issues
    issues_list = SQLOP.fetch_issues(ships, sailing_numbers, sheets)
    # Note: add_sailing_summaries function would be implemented here
    final_list = issues_list  # Placeholder until function is implemented

    return jsonify({
        "status": "success",
        "data": final_list
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
