#!/usr/bin/env python3
"""
Debug script to check available sailing keys from the API
"""

import requests
import json

# API Configuration
API_BASE_URL = "http://ag.api.deepthoughtconsultech.com:5000"
# API_BASE_URL = "http://localhost:5000"  # Uncomment for local testing

# You'll need to replace these with actual credentials
USERNAME = "jayne"  # Replace with actual username
PASSWORD = "jayneAdmin"  # Replace with actual password

def authenticate():
    """Authenticate and get JWT token"""
    auth_url = f"{API_BASE_URL}/sailing/auth"
    auth_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
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

def get_sailing_keys(token):
    """Get sailing keys debug information"""
    debug_url = f"{API_BASE_URL}/sailing/debug/sailing_keys"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(debug_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        return data
        
    except requests.RequestException as e:
        print(f"Debug request failed: {e}")
        return None

def main():
    print("=== Sailing Keys Debug Tool ===")
    print(f"API URL: {API_BASE_URL}")
    print()
    
    # Step 1: Authenticate
    print("1. Authenticating...")
    token = authenticate()
    if not token:
        print("❌ Authentication failed. Please check your credentials.")
        return
    
    print("✅ Authentication successful!")
    print()
    
    # Step 2: Get sailing keys
    print("2. Fetching sailing keys debug information...")
    debug_data = get_sailing_keys(token)
    
    if debug_data:
        print("✅ Debug data retrieved successfully!")
        print()
        print("=== SAILING KEYS DEBUG INFORMATION ===")
        print(json.dumps(debug_data, indent=2))
        
        # Summary
        if debug_data.get("status") == "success":
            total_keys = debug_data.get("total_keys", 0)
            sample_keys = debug_data.get("sample_keys", [])
            
            print()
            print("=== SUMMARY ===")
            print(f"Total sailing data keys: {total_keys}")
            print(f"Sample keys (first 20):")
            for i, key in enumerate(sample_keys, 1):
                print(f"  {i:2d}. {key}")
                
        else:
            print(f"❌ Error: {debug_data.get('message', 'Unknown error')}")
    else:
        print("❌ Failed to retrieve debug data")

if __name__ == "__main__":
    main()
