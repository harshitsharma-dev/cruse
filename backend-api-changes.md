# Backend API Changes Documentation

## Changes Made to flask_comments.py

### 1. Enhanced getMetricRating Endpoint
**Date:** June 14, 2025

**Change:** Modified `/sailing/getMetricRating` to support multiple metrics filtering

**Before:**
- Only accepted single `metric` parameter
- Only supported `filter_by: 'sailing'` or `filter_by: 'date'`
- Single metric processing only

**After:**
- Added support for `metrics` array parameter (multiple metrics)
- Maintained backward compatibility with single `metric` parameter
- Enhanced error handling and validation
- Improved response format to handle both single and multiple metrics

**Implementation Details:**
- Added logic to handle both single metric and multiple metrics
- When `metrics` array is provided, processes each metric in the array
- When single `metric` is provided, works as before
- Returns combined results for all requested metrics
- Maintains same response structure for backward compatibility

**New Request Format (Multiple Metrics):**
```json
{
  "filter_by": "date",
  "metrics": ["F&B Quality", "Cabins", "Entertainment"],
  "filters": {
    "fromDate": "2025-02-01",
    "toDate": "2025-06-14",
    "fleets": ["marella"],
    "ships": ["explorer", "discovery"],
    "sailing_numbers": ["1"]
  },
  "filterBelow": 7.0,
  "compareToAverage": true
}
```

**Legacy Request Format (Single Metric) - Still Supported:**
```json
{
  "filter_by": "date",
  "metric": "F&B Quality",
  "filters": {
    "fromDate": "2025-02-01",
    "toDate": "2025-06-14"
  },
  "filterBelow": 7.0,
  "compareToAverage": true
}
```

**Response Format (Multiple Metrics):**
```json
{
  "status": "success",
  "metrics": ["F&B Quality", "Cabins", "Entertainment"],
  "results": [
    {
      "ship": "Explorer",
      "sailingNumber": "1",
      "metric": "F&B Quality",
      "averageRating": 7.47,
      "ratingCount": 120,
      "filteredReviews": ["review1", "review2"],
      "filteredMetric": [6.5, 6.8],
      "filteredCount": 25
    }
    // ... more results for each metric
  ],
  "filterBelow": 7.0,
  "comparedToAverage": true
}
```

**Response Format (Single Metric) - Unchanged:**
```json
{
  "status": "success",
  "metric": "F&B Quality",
  "results": [...],
  "filterBelow": 7.0,
  "comparedToAverage": true
}
```

### 2. Backward Compatibility
- Single metric requests still work with original format
- Existing endpoints remain unchanged
- No breaking changes for other API consumers
- Enhanced error messages for better debugging

### 3. Code Structure Improvements
- Better parameter validation
- Cleaner logic flow for handling both modes
- Improved error handling and messages
- Enhanced logging for debugging

### Files Modified:
- `flask_comments.py` - Enhanced getMetricRating endpoint (lines ~203-325)

### Frontend Changes Made:
- `src/pages/MetricFilter.tsx` - Updated to use new multiple metrics API format
- `src/components/UserProfile.tsx` - Fixed SelectItem empty value props
- `src/pages/UserManagement.tsx` - Fixed SelectItem empty value props
- `src/components/RatingSummary.tsx` - Fixed API request format and added default data loading

## 4. "All Dates" Filter Support
**Date:** June 14, 2025

**Change:** Added support for "All Dates" filter mode across all endpoints

**Feature:** Users can now select "All Dates" option which bypasses date filtering entirely and returns all data in the system while still respecting fleet/ship filters.

**Backend Implementation:**
- Added `filter_by: "all"` support to all major endpoints
- When `filter_by` is set to "all", date filtering is completely bypassed
- Fleet and ship filters are still applied when provided
- All data in SAMPLE_DATA is returned (subject to fleet/ship filters)

**Supported Endpoints:**
- `/sailing/getRatingSmry` - Rating summaries
- `/sailing/getMetricRating` - Metric ratings  
- `/sailing/semanticSearch` - Semantic search
- `/sailing/getIssuesSummary` - Issues summary

**Request Format with All Dates:**
```json
{
  "filter_by": "all",
  "filters": {
    "fleets": ["marella"],
    "ships": ["explorer", "discovery"]
    // Note: No start_date/end_date when using "all"
  }
}
```

**Frontend Implementation:**
- BasicFilter component enhanced with "All Dates" toggle (default: checked)
- When "All Dates" is selected, date pickers are hidden
- Updated all page components (Search, MetricFilter, Issues, RatingSummary) to handle "All Dates" mode
- Button validation updated to not require dates when "All Dates" is enabled

**Files Modified:**
- `flask_comments.py` - Added "all" filter_by support in filter_sailings function (lines 126-145)
- `src/components/BasicFilter.tsx` - Enhanced UI with "All Dates" toggle and improved layout
- `src/pages/Search.tsx` - Updated API calls and validation for "All Dates" mode
- `src/pages/MetricFilter.tsx` - Updated API calls for "All Dates" mode  
- `src/pages/Issues.tsx` - Updated API calls for "All Dates" mode
- `src/components/RatingSummary.tsx` - Updated to support "All Dates" mode and default loading

**Benefits:**
- Provides quick overview of all historical data
- Better user experience with sensible defaults
- Maintains backwards compatibility with date-filtered searches
- Consistent UI/UX across all filtering scenarios

## 5. Fleet/Ship Filtering Bug Fix
**Date:** June 14, 2025

**Issue:** Fleet and ship filtering was not working correctly in "All Dates" mode due to case sensitivity and field name mismatches.

**Problem:**
- Backend was checking "Ship Name" field but actual ship data was in "Ship" field
- Case-sensitive matching caused filter failures (e.g., "explorer" vs "Explorer")
- Space differences in ship names (e.g., "discovery2" vs "Discovery 2") caused mismatches

**Fix Applied:**
- Updated fleet filtering to check "Fleet" field with case-insensitive matching
- Updated ship filtering to check both "Ship Name" and "Ship" fields
- Made all string comparisons case-insensitive using `.lower()`
- Added flexible matching that handles both formats (with/without spaces)

**Code Changes in flask_comments.py:**
```python
# Fleet filtering - Fixed case sensitivity and field name
if "fleets" in filters and filters["fleets"]:
    results = [
        item for item in results
        if any(fleet.lower() in item.get("Fleet", "").lower() for fleet in filters["fleets"])
    ]

# Ship filtering - Fixed to check both fields and handle case/space differences  
if "ships" in filters and filters["ships"]:
    results = [
        item for item in results
        if any(
            ship.lower().replace(" ", "") in item.get("Ship Name", "").lower().replace(" ", "") or 
            ship.lower().replace(" ", "") in item.get("Ship", "").lower().replace(" ", "")
            for ship in filters["ships"]
        )
    ]
```

**Testing:**
- Verified with curl command that "All Dates" mode now returns filtered results
- Confirmed frontend displays data correctly when fleet/ship filters are applied
- Tested both individual ship selection and multiple ship selection

**Files Modified:**
- `flask_comments.py` - Lines 131-145 in filter_sailings function
