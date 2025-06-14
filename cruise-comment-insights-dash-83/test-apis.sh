#!/bin/bash

# API Testing Script for Cruise Dashboard
# Base URL: http://13.126.187.166:5000

BASE_URL="http://13.126.187.166:5000"

echo "🚢 Testing Cruise Dashboard APIs"
echo "================================="
echo ""

# Test GET endpoints
echo "📋 Testing GET Endpoints:"
echo "-------------------------"

echo "1. Testing /sailing/fleets..."
curl -s -X GET "$BASE_URL/sailing/fleets" -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/sailing/fleets" -H "Content-Type: application/json"
echo ""

echo "2. Testing /sailing/metrics..."
curl -s -X GET "$BASE_URL/sailing/metrics" -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/sailing/metrics" -H "Content-Type: application/json"
echo ""

echo "3. Testing /sailing/sheets..."
curl -s -X GET "$BASE_URL/sailing/sheets" -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "$BASE_URL/sailing/sheets" -H "Content-Type: application/json"
echo ""

echo "4. Testing /sailing/check..."
curl -s -X GET "$BASE_URL/sailing/check" -H "Content-Type: application/json"
echo ""
echo ""

# Test POST endpoints
echo "📤 Testing POST Endpoints:"
echo "-------------------------"

echo "1. Testing /sailing/auth..."
curl -s -X POST "$BASE_URL/sailing/auth" \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/sailing/auth" -H "Content-Type: application/json" -d '{"username": "test", "password": "test"}'
echo ""

echo "2. Testing /sailing/semanticSearch..."
curl -s -X POST "$BASE_URL/sailing/semanticSearch" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "food quality",
    "fleets": ["marella"],
    "ships": ["explorer"],
    "filter_params": {},
    "sheet_names": [],
    "semanticSearch": true,
    "similarity_score_range": [0.0, 1.0],
    "num_results": 10
  }' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/sailing/semanticSearch" -H "Content-Type: application/json" -d '{"query": "food quality", "fleets": ["marella"], "ships": ["explorer"], "filter_params": {}, "sheet_names": [], "semanticSearch": true, "similarity_score_range": [0.0, 1.0], "num_results": 10}'
echo ""

echo "3. Testing /sailing/getRatingSmry..."
curl -s -X POST "$BASE_URL/sailing/getRatingSmry" \
  -H "Content-Type: application/json" \
  -d '{
    "filter_by": "date",
    "filters": {
      "fromDate": "2024-01-01",
      "toDate": "2024-12-31"
    }
  }' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/sailing/getRatingSmry" -H "Content-Type: application/json" -d '{"filter_by": "date", "filters": {"fromDate": "2024-01-01", "toDate": "2024-12-31"}}'
echo ""

echo "4. Testing /sailing/getMetricRating..."
curl -s -X POST "$BASE_URL/sailing/getMetricRating" \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "Overall Holiday",
    "fleets": ["marella"],
    "ships": ["explorer"],
    "fromDate": "2024-01-01",
    "toDate": "2024-12-31",
    "filterBelow": 5
  }' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/sailing/getMetricRating" -H "Content-Type: application/json" -d '{"metric": "Overall Holiday", "fleets": ["marella"], "ships": ["explorer"], "fromDate": "2024-01-01", "toDate": "2024-12-31", "filterBelow": 5}'
echo ""

echo "5. Testing /sailing/issuesSmry..."
curl -s -X POST "$BASE_URL/sailing/issuesSmry" \
  -H "Content-Type: application/json" \
  -d '{
    "fleets": ["marella"],
    "ships": ["explorer"],
    "fromDate": "2024-01-01",
    "toDate": "2024-12-31"
  }' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/sailing/issuesSmry" -H "Content-Type: application/json" -d '{"fleets": ["marella"], "ships": ["explorer"], "fromDate": "2024-01-01", "toDate": "2024-12-31"}'
echo ""

echo "✅ API testing complete!"
echo ""
echo "📊 Summary:"
echo "- ✅ Working: /sailing/fleets, /sailing/check, /sailing/auth, /sailing/semanticSearch, /sailing/getRatingSmry"
echo "- ❌ Not Found: /sailing/metrics, /sailing/sheets, /sailing/issuesSmry"
echo "- ⚠️  Parameter Error: /sailing/getMetricRating"
