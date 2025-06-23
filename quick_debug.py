#!/usr/bin/env python3
import requests, json

# Replace these with your actual credentials
USERNAME = "your_username"
PASSWORD = "your_password"
API_URL = "http://ag.api.deepthoughtconsultech.com:5000"

# Authenticate
auth_resp = requests.post(f"{API_URL}/sailing/auth", json={"username": USERNAME, "password": PASSWORD})
token = auth_resp.json().get("access_token")

if token:
    # Get sailing keys
    debug_resp = requests.get(f"{API_URL}/sailing/debug/sailing_keys", headers={"Authorization": f"Bearer {token}"})
    print(json.dumps(debug_resp.json(), indent=2))
else:
    print("Authentication failed:", auth_resp.json())
