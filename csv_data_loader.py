#!/usr/bin/env python3
"""
CSV Data Loader for Apollo Cruise Analytics
Loads the rating summary data that matches your test_data.py structure
"""

import pandas as pd
import json
from datetime import datetime
import os

def load_rating_summary_csv(csv_path="./test_data/cruise_ratings_summary.csv"):
    """
    Load rating summary data from CSV file
    Returns data in the same format as your test_data.py
    """
    try:
        df = pd.read_csv(csv_path)
        
        # Convert DataFrame to list of dictionaries (same as your test_data.py format)
        rating_data = []
        for _, row in df.iterrows():
            record = {
                'Sailing Number': str(row['Sailing Number']),
                'Ship Name': row['Ship Name'],
                'Fleet': row['Fleet'],
                'Start': row['Start'],
                'End': row['End'],
                'Overall Holiday': row['Overall Holiday'],
                'Prior Customer Service': row['Prior Customer Service'] if pd.notna(row['Prior Customer Service']) else None,
                'Flight': row['Flight'],
                'Embarkation/Disembarkation': row['Embarkation/Disembarkation'],
                'Value for Money': row['Value for Money'],
                'App Booking': row['App Booking'],
                'Pre-Cruise Hotel Accommodation': row['Pre-Cruise Hotel Accommodation'] if pd.notna(row['Pre-Cruise Hotel Accommodation']) else None,
                'Cabins': row['Cabins'],
                'Cabin Cleanliness': row['Cabin Cleanliness'],
                'F&B Quality': row['F&B Quality'],
                'F&B Service': row['F&B Service'],
                'Bar Service': row['Bar Service'],
                'Drinks Offerings and Menu': row['Drinks Offerings and Menu'],
                'Entertainment': row['Entertainment'],
                'Excursions': row['Excursions'],
                'Crew Friendliness': row['Crew Friendliness'],
                'Ship Condition/Cleanliness (Public Areas)': row['Ship Condition/Cleanliness (Public Areas)'],
                'Sentiment Score': row['Sentiment Score']
            }
            rating_data.append(record)
        
        print(f"Loaded {len(rating_data)} rating records from CSV")
        return rating_data
        
    except Exception as e:
        print(f"Error loading rating summary CSV: {e}")
        return []

def load_fleet_ship_csv(csv_path="./test_data/fleet_ship_data.csv"):
    """
    Load fleet and ship data from CSV file
    """
    try:
        df = pd.read_csv(csv_path)
        
        # Group ships by fleet
        fleet_data = []
        fleets = df.groupby('Fleet')
        
        for fleet_name, ships_df in fleets:
            ships = ships_df['Ship'].tolist()
            fleet_data.append({
                'fleet': fleet_name.lower(),
                'ships': ships
            })
        
        print(f"Loaded {len(fleet_data)} fleets with ships")
        return fleet_data
        
    except Exception as e:
        print(f"Error loading fleet/ship CSV: {e}")
        return []

def load_sailing_summary_csv(csv_path="./test_data/sailing_summary.csv"):
    """
    Load sailing summary data from CSV file
    """
    try:
        df = pd.read_csv(csv_path)
        
        sailing_data = []
        for _, row in df.iterrows():
            record = {
                'Sailing Number': str(row['Sailing_Number']),
                'Fleet': row['Fleet'],
                'Ship': row['Ship'],
                'Itinerary': row['Itinerary'],
                'Start Date': row['Start_Date'],
                'End Date': row['End_Date'],
                'Duration Days': row['Duration_Days'],
                'Destination': row['Destination'],
                'Ports Visited': row['Ports_Visited'],
                'Total Guests': row['Total_Guests'],
                'Occupancy Rate': row['Occupancy_Rate'],
                'Weather Conditions': row['Weather_Conditions'],
                'Sea Conditions': row['Sea_Conditions'],
                'Guest Satisfaction Avg': row['Guest_Satisfaction_Avg']
            }
            sailing_data.append(record)
        
        print(f"Loaded {len(sailing_data)} sailing records")
        return sailing_data
        
    except Exception as e:
        print(f"Error loading sailing summary CSV: {e}")
        return []

def load_metrics_definitions_csv(csv_path="./test_data/metrics_definitions.csv"):
    """
    Load metrics definitions from CSV file
    """
    try:
        df = pd.read_csv(csv_path)
        
        metrics_data = []
        for _, row in df.iterrows():
            record = {
                'Metric Name': row['Metric_Name'],
                'Category': row['Category'],
                'Description': row['Description'],
                'Calculation Method': row['Calculation_Method'],
                'Target Value': row['Target_Value'],
                'Current Value': row['Current_Value'],
                'Trend': row['Trend'],
                'Last Updated': row['Last_Updated']
            }
            metrics_data.append(record)
        
        print(f"Loaded {len(metrics_data)} metric definitions")
        return metrics_data
        
    except Exception as e:
        print(f"Error loading metrics definitions CSV: {e}")
        return []

def export_to_json():
    """
    Export all CSV data to JSON files for easy backend integration
    """
    try:
        # Load all data
        rating_data = load_rating_summary_csv()
        fleet_data = load_fleet_ship_csv()
        sailing_data = load_sailing_summary_csv()
        metrics_data = load_metrics_definitions_csv()
        
        # Export to JSON files
        with open('./test_data/rating_summary.json', 'w') as f:
            json.dump(rating_data, f, indent=2)
        
        with open('./test_data/fleet_ships.json', 'w') as f:
            json.dump(fleet_data, f, indent=2)
        
        with open('./test_data/sailing_summary.json', 'w') as f:
            json.dump(sailing_data, f, indent=2)
        
        with open('./test_data/metrics_definitions.json', 'w') as f:
            json.dump(metrics_data, f, indent=2)
        
        print("Successfully exported all data to JSON files")
        
        # Also create a combined data file for the backend
        combined_data = {
            'rating_summary': rating_data,
            'fleet_ships': fleet_data,
            'sailing_summary': sailing_data,
            'metrics_definitions': metrics_data,
            'last_updated': datetime.now().isoformat()
        }
        
        with open('./test_data/apollo_data_combined.json', 'w') as f:
            json.dump(combined_data, f, indent=2)
        
        print("Created combined Apollo data file: apollo_data_combined.json")
        
    except Exception as e:
        print(f"Error exporting to JSON: {e}")

def get_sailing_numbers():
    """
    Get all unique sailing numbers from the data
    """
    rating_data = load_rating_summary_csv()
    sailing_numbers = list(set([r['Sailing Number'] for r in rating_data]))
    print(f"Available sailing numbers: {sailing_numbers}")
    return sailing_numbers

def get_ships_for_sailing(sailing_number="1"):
    """
    Get all ships for a specific sailing number
    """
    rating_data = load_rating_summary_csv()
    ships = [r['Ship Name'] for r in rating_data if r['Sailing Number'] == sailing_number]
    print(f"Ships for sailing {sailing_number}: {len(ships)} ships")
    return ships

def validate_data_consistency():
    """
    Validate that the CSV data is consistent with your test_data.py structure
    """
    print("Validating Apollo data consistency...")
    
    rating_data = load_rating_summary_csv()
    fleet_data = load_fleet_ship_csv()
    sailing_data = load_sailing_summary_csv()
    
    # Check if all ships in rating data exist in fleet data
    rating_ships = set([r['Ship Name'] for r in rating_data])
    fleet_ships = set()
    for fleet in fleet_data:
        fleet_ships.update(fleet['ships'])
    
    missing_ships = rating_ships - fleet_ships
    if missing_ships:
        print(f"⚠️  Ships in rating data but not in fleet data: {missing_ships}")
    else:
        print("✅ All ships in rating data exist in fleet data")
    
    # Check sailing numbers consistency
    rating_sailings = set([r['Sailing Number'] for r in rating_data])
    sailing_sailings = set([str(s['Sailing Number']) for s in sailing_data])
    
    if rating_sailings == sailing_sailings:
        print("✅ Sailing numbers are consistent across datasets")
    else:
        print(f"⚠️  Sailing number mismatch: Rating={rating_sailings}, Sailing={sailing_sailings}")
    
    print(f"📊 Data Summary:")
    print(f"   - Rating records: {len(rating_data)}")
    print(f"   - Fleet groups: {len(fleet_data)}")
    print(f"   - Sailing records: {len(sailing_data)}")
    print(f"   - Ships total: {len(fleet_ships)}")
    print(f"   - Sailing numbers: {len(rating_sailings)}")

if __name__ == "__main__":
    print("🚢 Apollo Cruise Analytics - CSV Data Loader")
    print("=" * 50)
    
    # Validate data consistency
    validate_data_consistency()
    
    print("\n" + "=" * 50)
    
    # Export to JSON for backend integration
    export_to_json()
    
    print("\n" + "=" * 50)
    print("✅ Data loading complete!")
    print("\nTo use this data in your backend:")
    print("1. Use the generated JSON files in ./test_data/")
    print("2. Update your flask backend to load from these files")
    print("3. The data structure matches your existing test_data.py format")
