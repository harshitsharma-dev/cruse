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
CORS(app, resources={
    r"/sailing/*": {
        "origins": ["http://localhost:8081", "http://localhost:8082", "http://localhost:3000", "http://127.0.0.1:8081"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
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
        abort(404, description="")  # empty response body

@app.after_request
def remove_server_header(response):
    response.headers["Server"] = ""
    return response

@app.route('/sailing/fleets', methods=['GET'])
def get_fleets():
    """Endpoint to retrieve fleet names and the ships under each fleet"""

    return jsonify({
        "status": "success",
        "data": FLEET_DATA
    })

@app.route('/sailing/sheets', methods=['GET'])
def get_sheets():
    """Endpoint to retrieve fleet names and the ships under each fleet"""

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



@app.route('/sailing/getRatingSmry', methods=['POST'])
def get_rating_summary():
    """Endpoint for getting full rating summaries"""
    data = request.get_json()
    print(data)

    # Validate input
    if not data or ("sailings" not in data and "filters" not in data):
        return jsonify({"error": "Missing sailings or filters parameter"}), 400
    
    working_data = filter_sailings(data)
    if working_data == -1:
        return jsonify({"error": "Sailings must be provided when filtering by sailing"}), 400
    if working_data == -2:
        return jsonify({"error": "Both fromDate and toDate must be provided when filtering by date"}), 400
    if working_data == -3:
        return jsonify({"error": "Filters must be provided when filtering by date"}), 400
    if working_data == -4:
        return jsonify({"error": "Invalid filterBy value. Must be 'sailing' or 'date'"}), 400
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

@app.route('/sailing/getMetricRating', methods=['POST'])
def get_metric_comparison():
    """Enhanced endpoint with metric value filtering"""
    data = request.get_json()
#     print("data",data)
    
    # Validate input
    if not data or "filter_by" not in data or "metric" not in data:
        return jsonify({"error": "Missing required parameters"}), 400
    
    metric = data["metric"]
    # sailings = data["sailings"]
    filter_below = data.get("filterBelow")
    compare_avg = data.get("compareToAverage", False)
    filter_by = data.get("filter_by", "sailing")
    print(metric)
#     metric = "F&B Quality"

    # Validate metric (excluding 'Review')
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

    # Prepare response
    results = []
    all_metric_values = []

    for sailing in working_data:
        print("get metric comparison",sailing)
        ship = sailing["Ship Name"]
        number = sailing["Sailing Number"]
        df = get_sailing_df(ship, number)
        df_reason = get_sailing_df_reason(ship, number)
#         print("df_reason",df_reason)
        
        if df is None or metric not in df.columns:
            results.append({
                "ship": ship,
                "sailingNumber": number,
                "error": "Data not found" if df is None else "Invalid metric"
            })
            continue
        
        # Calculate basic stats
        metric_values = pd.to_numeric(df[metric], errors='coerce').dropna()
        avg_rating = metric_values.mean()
        all_metric_values.extend(metric_values.tolist())
        
        # Get filtered reviews if requested
        filtered_reviews = []
        if filter_below is not None:
            mask = df[metric].astype(float) <= filter_below
            filtered_reviews = df_reason.loc[mask, metric].tolist()
#             print(filtered_reviews)
            for i, rev in enumerate(filtered_reviews):
                if is_empty_or_nan(rev):
                    filtered_reviews[i] = "Please refer to the comment"
#             print(filtered_reviews)
#             print(len(filtered_reviews))
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

@app.route('/sailing/ships', methods=['GET'])
def get_ships():
#     SHIPS = ["Voyager", "Explorer", "Discovery", "Explorer 2", "Discovery 2", "Voyager250306"]
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
    
@app.route('/sailing/semanticSearch', methods=['POST'])
def get_semantic_search():
    """Endpoint for semantic search based on user query and filters"""
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
        results = semantic_search(query,num_results,similarity_threshold, True, fleets, ships,
                        sheet_names, None, meal_time,
                        start_date, sailing_number_filter )
    else:
        results = word_search(query,num_results, True, fleets, ships,
                        sheet_names, None, meal_time,
                        start_date, sailing_number_filter )


    return jsonify({
        "status": "success",
        "results": results
    })


@app.route('/sailing/issuesSmry', methods=['POST'])
def get_issues_summary():
    """Endpoint to retrieve a summary of issues based on user input"""
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