#!/usr/bin/env python3
"""
Test script to verify sailing number matching logic
"""

import requests
import json

# API Configuration
API_BASE_URL = "http://ag.api.deepthoughtconsultech.com:5000"
USERNAME = "jayne"
PASSWORD = "jayneAdmin"

def authenticate():
    """Authenticate and get JWT token"""
    auth_url = f"{API_BASE_URL}/sailing/auth"
    auth_data = {"username": USERNAME, "password": PASSWORD}
    
    try:
        response = requests.post(auth_url, json=auth_data)
        response.raise_for_status()
        data = response.json()
        if data.get("authenticated"):
            return data.get("access_token")
        else:
            print(f"Authentication failed: {data.get('error', 'Unknown error')}")
            return None
    except requests.RequestException as e:
        print(f"Authentication request failed: {e}")
        return None

def test_metric_rating(token):
    """Test the metric rating endpoint with sample frontend sailing numbers"""
    metric_url = f"{API_BASE_URL}/sailing/getMetricRating"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test data that mimics what frontend sends
    test_data = {
        "metric": "Cabins",
        "filterLower": 6,
        "filterUpper": 10,
        "compareToAverage": True,
        "ships": ["discovery", "discovery 2"],
        "start_date": "-1",  # All dates
        "end_date": "-1",
        "sailing_numbers": [
            "MEX-11-17April-CanarianFlavours",  # Should map to backend key
            "MDY-12-19Jan",                     # Should map to mdy-12to19jan_1
            "MDY2-3-10March"                    # Should map to mdy2-3-10march_1
        ]
    }
    
    try:
        print("Testing metric rating endpoint with frontend sailing numbers...")
        print(f"Test payload: {json.dumps(test_data, indent=2)}")
        print()
        
        response = requests.post(metric_url, json=test_data, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        print("=== API RESPONSE ===")
        print(json.dumps(data, indent=2))
        
        # Analyze results
        print("\n=== ANALYSIS ===")
        if data.get("status") == "success":
            results = data.get("results", [])
            print(f"Total results: {len(results)}")
            
            for i, result in enumerate(results, 1):
                sailing_num = result.get("sailingNumber", "Unknown")
                ship = result.get("ship", "Unknown")
                error = result.get("error")
                
                if error:
                    print(f"  {i}. {sailing_num} -> ❌ ERROR: {error}")
                else:
                    avg_rating = result.get("averageRating", 0)
                    filtered_count = result.get("filteredCount", 0)
                    print(f"  {i}. {sailing_num} -> ✅ SUCCESS: {ship}, avg={avg_rating}, comments={filtered_count}")
        else:
            print(f"❌ API Error: {data.get('error', 'Unknown error')}")
            
    except requests.RequestException as e:
        print(f"API request failed: {e}")

def main():
    print("=== Sailing Number Matching Test ===")
    print(f"API URL: {API_BASE_URL}")
    print()
    
    # Authenticate
    token = authenticate()
    if not token:
        print("❌ Authentication failed.")
        return
    
    print("✅ Authentication successful!")
    print()
    
    # Test metric rating
    test_metric_rating(token)

if __name__ == "__main__":
    main()
