from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from typing import Dict, List
from test_data import *
from navigate_search import *
import pandas as pd
import yaml
from werkzeug.security import check_password_hash
from pathlib import Path

app = Flask(__name__)
# Configure CORS with specific settings
CORS(app, resources={
    r"/sailing/*": {
        "origins": ["http://localhost:8081", "http://localhost:8082", "http://localhost:3000", "http://127.0.0.1:8081", "http://192.168.57.157:8081", "http://192.168.57.*:8081"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Request-Method", "Access-Control-Request-Headers"],
        "supports_credentials": True,
        "expose_headers": ["Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"]
    }
})

METRIC_ATTRIBUTES_OLD = ['Ship overall', 'Ship rooms', 'F&B quality overall',
       'F&B service overall', 'F&B quality main dining', 'Entertainment',
       'Excursions', 'drinks offerings', 'bar service', 'cabin cleanliness',
       'crew friendliness', 'Sentiment analysis', 'Primary issues mentioned',
       'Review']

METRIC_ATTRIBUTES = ['Overall Holiday', 'Prior Customer Service', 'Flight', 'Embarkation/Disembarkation', 'Value for Money', 'App Booking', 'Pre-Cruise Hotel Accomodation', 'Cabins', 'Cabin Cleanliness', 'F&B Quality', 'F&B Service', 'Bar Service', 'Drinks Offerings and Menu', 'Entertainment', 'Excursions', 'Crew Friendliness', 'Ship Condition/Cleanliness (Public Areas)', 'Sentiment Score']

FLEET_DATA = [
    {
        "fleet":"marella",
        "ships": ["explorer", "discovery", "discovery 2", "explorer 2", "voyager"]
    }
]

SHEET_LIST = ["Ports and Excursions", "Other Feedback", "Entertainment",
               "Bars", "Dining", "What went well", "What else"
              ]

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
    print("in filter_sailings - filter_by:", filter_by)
    print("data received:", data)

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

    elif filter_by == "all":
        # Return all data without date filtering
        print("Using all dates - returning all SAMPLE_DATA")
        print("SAMPLE_DATA length:", len(SAMPLE_DATA))
        results = SAMPLE_DATA
        
        # Apply fleet/ship filters if provided
        if "filters" in data:
            filters = data["filters"]
            print("Filters provided:", filters)
            
            # Filter by fleets if specified
            if "fleets" in filters and filters["fleets"]:
                print("Filtering by fleets:", filters["fleets"])
                results = [
                    item for item in results
                    if any(fleet.lower() in item.get("Fleet", "").lower() for fleet in filters["fleets"])
                ]
                print("After fleet filtering:", len(results))
            
            # Filter by ships if specified  
            if "ships" in filters and filters["ships"]:
                print("Filtering by ships:", filters["ships"])
                results = [
                    item for item in results
                    if any(
                        # Check both "Ship" and "Ship Name" fields
                        ship.lower().replace(' ', '') in item.get("Ship", "").lower().replace(' ', '') or
                        ship.lower().replace(' ', '') in item.get("Ship Name", "").lower().replace(' ', '') or
                        # Also check reverse match (in case ship names are formatted differently)
                        item.get("Ship", "").lower().replace(' ', '') in ship.lower().replace(' ', '') or
                        item.get("Ship Name", "").lower().replace(' ', '') in ship.lower().replace(' ', '')
                        for ship in filters["ships"]
                    )
                ]
                print("After ship filtering:", len(results))

    else:
        return -4

    # Remove duplicates if both sailings and date filters are applied
    results = list({frozenset(item.items()): item for item in results}.values())
    return results

# API Endpoints
@app.route('/sailing/check', methods=['GET'])
def get_check():
    return ("hi how are you")

@app.route('/sailing/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle preflight OPTIONS requests for all sailing routes"""
    response = jsonify({})
    # Allow requests from your network
    origin = request.headers.get('Origin')
    allowed_origins = [
        'http://localhost:8081', 
        'http://127.0.0.1:8081',
        'http://192.168.57.157:8081'
    ]
    if origin and any(origin.startswith(allowed.rsplit(':', 1)[0]) for allowed in allowed_origins):
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
    
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.errorhandler(404)
def not_found(e):
    return {"error": "Not Found"}, 404

@app.before_request
def whitelist_sailing_routes():
    path = request.path
    ip = request.remote_addr

    if not path.startswith("/sailing"):
        app.logger.warning(f"Blocked path: {path} | IP: {ip}")
        abort(404, description="")  # empty response body

@app.after_request
def remove_server_header(response):
    response.headers["Server"] = ""
    return response

@app.route('/sailing/getRatingSmry', methods=['POST', 'OPTIONS'])
def get_rating_summary():
    """Endpoint for getting full rating summaries"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    data = request.get_json()
    print(data)

    # Validate input
    if not data or ("sailings" not in data and "filters" not in data and data.get("filter_by") != "all"):
        return jsonify({"error": "Missing sailings or filters parameter"}), 400
    
    working_data = filter_sailings(data)
    if working_data == -1:
        return jsonify({"error": "Sailings must be provided when filtering by sailing"}), 400
    if working_data == -2:
        return jsonify({"error": "Both fromDate and toDate must be provided when filtering by date"}), 400
    if working_data == -3:
        return jsonify({"error": "Filters must be provided when filtering by date"}), 400
    if working_data == -4:
        return jsonify({"error": "Invalid filterBy value. Must be 'sailing', 'date', or 'all'"}), 400
#     working_data = is_empty_or_nan_rating(working_data)
#     print(working_data)
    return jsonify({
        "status": "success",
        "count": len(working_data),
        "data": list(working_data)
    })

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

@app.route('/sailing/getMetricRating', methods=['POST', 'OPTIONS'])
def get_metric_comparison():
    """Enhanced endpoint with metric value filtering and support for multiple metrics"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    data = request.get_json()
    print("data", data)
    
    # Validate input - now supports both single metric and multiple metrics
    if not data or "filter_by" not in data:
        return jsonify({"error": "Missing required parameter: filter_by"}), 400
    
    # Handle both single metric and multiple metrics
    single_metric = data.get("metric")
    multiple_metrics = data.get("metrics", [])
    
    if not single_metric and not multiple_metrics:
        return jsonify({"error": "Either 'metric' or 'metrics' parameter is required"}), 400
    
    # Determine which metrics to process
    if single_metric:
        metrics_to_process = [single_metric]
        is_multiple_mode = False
    else:
        metrics_to_process = multiple_metrics
        is_multiple_mode = True
    
    filter_below = data.get("filterBelow")
    compare_avg = data.get("compareToAverage", False)
    filter_by = data.get("filter_by", "sailing")
    
    print("Processing metrics:", metrics_to_process)

    # Validate metrics (excluding 'Review')
    for metric in metrics_to_process:
        if metric not in METRIC_ATTRIBUTES:
            return jsonify({
                "error": f"Invalid metric: {metric}. Metric must be a numeric field (not 'Review')",
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

    # Prepare response
    results = []
    all_metric_values = []

    # Process each metric
    for metric in metrics_to_process:
        for sailing in working_data:
            print(f"Processing metric {metric} for sailing", sailing)
            ship = sailing["Ship Name"]
            number = sailing["Sailing Number"]
            df = get_sailing_df(ship, number)
            df_reason = get_sailing_df_reason(ship, number)
            
            if df is None or metric not in df.columns:
                results.append({
                    "ship": ship,
                    "sailingNumber": number,
                    "metric": metric,
                    "error": "Data not found" if df is None else "Invalid metric"
                })
                continue
            
            # Calculate basic stats
            metric_values = pd.to_numeric(df[metric], errors='coerce').dropna()
            avg_rating = metric_values.mean()
            
            # Handle NaN values
            if pd.isna(avg_rating):
                avg_rating = 0.0
            
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
                "ship": ship,
                "sailingNumber": number,
                "metric": metric,
                "averageRating": round(float(avg_rating), 2) if not pd.isna(avg_rating) else 0.0,
                "ratingCount": len(metric_values),
                "filteredReviews": filtered_reviews,
                "filteredMetric": filtered_metric,
                "filteredCount": len(filtered_reviews)
            })
    
    # Add comparison to overall average if requested
    if compare_avg and all_metric_values:
        overall_avg = sum(all_metric_values) / len(all_metric_values)
        for result in results:
            if "averageRating" in result and not pd.isna(result["averageRating"]):
                comparison = result["averageRating"] - overall_avg
                result["comparisonToOverall"] = round(float(comparison), 2) if not pd.isna(comparison) else 0.0
    
    # Prepare response based on single or multiple metrics mode
    response = {
        "status": "success",
        "results": results,
        "filterBelow": filter_below,
        "comparedToAverage": compare_avg
    }
    
    if is_multiple_mode:
        response["metrics"] = metrics_to_process
    else:
        response["metric"] = metrics_to_process[0]
    
    return jsonify(response)


@app.route('/sailing/ships', methods=['GET'])
def get_ships():
    SHIPS = []
    for ent in SAMPLE_DATA:
        SHIPS.append(ent["Ship Name"])
    return jsonify({
        "status": "success",
        "data": [{"name": ship, "id": idx+1} for idx, ship in enumerate(SHIPS)]
    })
    # """Endpoint for getting available ships from database"""
    # ships = db.query("SELECT ship_id as id, ship_name as name FROM ships")
    # return jsonify({
    #     "status": "success",
    #     "data": ships
    # })


@app.route('/sailing/auth', methods=['POST', 'OPTIONS'])
def authenticate():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
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
            return jsonify({
                "authenticated": True,
                "user": username,
                "role": user_data.get('role')
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
    
@app.route('/sailing/semanticSearch', methods=['POST', 'OPTIONS'])
def get_semantic_search():
    """Endpoint for semantic search based on user query and filters"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    data = request.get_json()

    # Validate input
    query = data.get("query")
    fleets = data.get("fleets")
    ships = data.get("ships")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    sailing_number_filter = data.get("sailing_numbers", [])
    sheet_names = data.get("sheet_names", [])
    meal_time = data.get("meal_time")
    semantic = data.get("semantic", True)
    similarity_threshold = data.get("similarity_threshold", 0.7)
    num_results = data.get("num_results", 10)

    if not query:
        return jsonify({"error": "Search query is mandatory"}), 400

    if semantic == True:
        results = semantic_search(
            query=query,
            top_k=num_results,
            similarity_threshold=similarity_threshold,
            use_ollama=True,
            fleets=fleets,
            ships=ships,
            sheet=sheet_names,
            restaurant_name=None,
            time_of_meal=meal_time,
            start_date_filter=start_date,
            sailing_number_filter=sailing_number_filter
        )
    else:
        results = word_search(
            query=query,
            top_k=num_results,
            use_ollama=True,
            fleets=fleets,
            ships=ships,
            sheet=sheet_names,
            restaurant_name=None,
            time_of_meal=meal_time,
            start_date_filter=start_date,
            sailing_number_filter=sailing_number_filter
        )

    return jsonify({
        "status": "success",
        "results": results
    })

@app.route('/sailing/fleets', methods=['GET'])
def get_fleets():
    """Endpoint to retrieve fleet names and the ships under each fleet"""
    
    return jsonify({
        "status": "success",
        "data": FLEET_DATA
    })

@app.route('/sailing/metrics', methods=['GET'])
def get_metrics():
    """Endpoint to retrieve various metrics related to sailing"""

    return jsonify({
        "status": "success",
        "data": METRIC_ATTRIBUTES
    })

@app.route('/sailing/sheets', methods=['GET'])
def get_sheets():
    """Endpoint to retrieve the list of sheets available for feedback"""
    return jsonify({
        "status": "success",
        "data": SHEET_LIST
    })

@app.route('/sailing/issuesSmry', methods=['POST', 'OPTIONS'])
def get_issues_summary():
    """Endpoint to retrieve a summary of issues based on user input"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    data = request.get_json()
    # Process the data and generate a summary
    summary = {
        "total_issues": 5,
        "resolved_issues": 3,
        "unresolved_issues": 2
    }
    return jsonify({
        "status": "success",
        "data": summary
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)