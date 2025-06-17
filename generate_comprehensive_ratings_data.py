import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Define the sailing number to ship mapping
def get_ship_from_sailing(sailing_number):
    if sailing_number.startswith('MEX-'):
        return 'Explorer'
    elif sailing_number.startswith('MDY-'):
        return 'Discovery'
    elif sailing_number.startswith('MDY2-'):
        return 'Discovery 2'
    elif sailing_number.startswith('MEX2-'):
        return 'Explorer 2'
    elif sailing_number.startswith('MVO-'):
        return 'Voyager'
    else:
        return 'Unknown'

# All sailing numbers from your list
sailing_numbers = [
    'MEX-10-17Jan-AtlanticIslands',
    'MEX-11-17April-CanarianFlavours',
    'MEX-14-20March-CanarianFlavours',
    'MEX-14-21Feb-CanarianFlavours',
    'MEX-14-24April-EasterExplorer',
    'MEX-16-22May-AdriaticExplorer',
    'MEX-17-24Jan-CanarianFlavours',
    'MEX-18-24April-EasterExplorer',
    'MEX-18-24Jan',
    'MEX-21-26March-AtlanticIslands',
    'MEX-21-28Feb-AtlanticIslands',
    'MEX-24-31Jan-AtlanticIslands',
    'MEX-25April-2May-MagicalMediterranean',
    'MEX-27Dec-3Jan-ANewYearsDream',
    'MEX-28Feb-7March-CanarianFlavours',
    'MEX-28March-3April-CanarianFlavours',
    'MEX-3-10Jan-CanarianFlavours',
    'MEX-31Jan-7Feb-CanarianFlavours',
    'MEX-4-10April-AtlanticIslands',
    'MEX-7-13Feb-AtlanticIslands',
    'MEX-7-13March-AtlanticIslands',
    'MDY-12-19Jan',
    'MDY-16-23Feb',
    'MDY-16-23Mar',
    'MDY-19-26Jan',
    'MDY-2-9Feb',
    'MDY-2-9Mar',
    'MDY-20-27May-HighlightsofMed',
    'MDY-20Apr-6May-TransatlanticSunsets',
    'MDY-23-30Mar',
    'MDY-23Feb-3Mar',
    'MDY-26Jan-2Feb',
    'MDY-29Dec-5Jan',
    'MDY-30Mar-6Apr',
    'MDY-5-12Jan',
    'MDY-6-13April',
    'MDY-9-16Mar',
    'MDY2-10-17Feb',
    'MDY2-10-17March',
    'MDY2-17-24Feb',
    'MDY2-17-24March',
    'MDY2-2-9April',
    'MDY2-20-27Jan',
    'MDY2-21-28May-AegeanGems',
    'MDY2-23-30April-GrecianDiscovery',
    'MDY2-24Feb-3March',
    'MDY2-24March-1April',
    'MDY2-27Feb-3Feb',
    'MDY2-3-10Feb',
    'MDY2-3-10March',
    'MDY2-30Apr-7May-AegeanGems',
    'MDY2-9-14April',
    'MEX2-1-7Apr-TreasuresoftheMediterranean',
    'MEX2-11-17Mar-ColoursoftheCaribbeanV3',
    'MEX2-11-18Feb-ColoursoftheCaribbean',
    'MEX2-14-21Jan-ColoursoftheCaribbean',
    'MEX2-15-21Apr-TreasuresoftheMediterranean',
    'MEX2-18-25Feb-CaribbeanClassics',
    'MEX2-18-31Mar-AtlanticOdyssey',
    'MEX2-21-28Jan-CaribbeanClassics',
    'MEX2-22-28Apr-MediterraneanMedley',
    'MEX2-22-28April-MediterraneanMedley',
    'MEX2-22-28May-AdriaticDelights',
    'MEX2-25Feb-4Mar-ColoursoftheCaribbean',
    'MEX2-29Apr-7May-MysticIsles',
    'MEX2-31Jan-7Jan-ColoursoftheCaribbean',
    'MEX2-3Jan-4Feb-ColoursoftheCaribbean',
    'MEX2-4-10Mar-CaribbeanClassics',
    'MEX2-4-11Feb-TropicalTreasures',
    'MEX2-7-14Jan-TropicalTreasures',
    'MEX2-8-14Apr-MediterraneanMedley',
    'MVO-10-17Apr-ATasteoftheTropicsV2',
    'MVO-13-20Feb-ATasteoftheTropics',
    'MVO-13-20Mar-ATasteoftheTropics',
    'MVO-16-23Jan-ATasteoftheTropics',
    'MVO-17Apr-3May-AtlanticAdventure',
    'MVO-2-9Jan-ATasteoftheTropicsV3',
    'MVO-20-27Feb-ParadiseIslands',
    'MVO-20-27Mar-ParadiseIslandsV2',
    'MVO-23-30Jan-ParadiseIslandsV3',
    'MVO-24-31May-MediterraneanMedley',
    'MVO-27Feb-6Mar-ATasteoftheTropicsV3',
    'MVO-27Mar-3Apr-ATasteoftheTropics',
    'MVO-3-10Apr-ParadiseIslands',
    'MVO-3-10May-TreasuresfotheMediterranean',
    'MVO-3-10May-TreasuresoftheMediterranean',
    'MVO-30Jan-6Feb-ATasteoftheTropicsV3',
    'MVO-6-13Feb-ParadiseIslandsV3',
    'MVO-6-13Mar-ParadiseIslandsV3',
    'MVO-9-16Jan-ParadiseIslandsV3'
]

# Rating categories as per your format
rating_categories = [
    'Overall Holiday',
    'Prior Customer Service',
    'Flight',
    'Embarkation/Disembarkation',
    'Value for Money',
    'App Booking',
    'Pre-Cruise Hotel Accomodation',
    'Cabins',
    'Cabin Cleanliness',
    'F&B Quality',
    'F&B Service',
    'Bar Service',
    'Drinks Offerings and Menu',
    'Entertainment',
    'Excursions',
    'Crew Friendliness',
    'Ship Condition/Cleanliness (Public Areas)',
    'Sentiment Score'
]

# Function to generate realistic ratings (1-10) with some None values
def generate_rating():
    # 30% chance of None (guest didn't rate this category)
    if random.random() < 0.3:
        return None
    else:
        # Generate ratings with bias towards higher scores (7-9 range)
        weights = [1, 1, 2, 3, 5, 8, 15, 20, 25, 20]  # Weights for ratings 1-10
        return random.choices(range(1, 11), weights=weights)[0]

# Generate comprehensive dataset
def generate_cruise_ratings_data():
    data = []
    
    # Generate multiple rating records per sailing (simulating multiple guests)
    for sailing_number in sailing_numbers:
        ship_name = get_ship_from_sailing(sailing_number)
        
        # Generate 50-200 guest ratings per sailing
        num_guests = random.randint(50, 200)
        
        for guest_id in range(num_guests):
            record = {}
            
            # Generate ratings for each category
            for category in rating_categories:
                if category in ['Overall Holiday', 'Sentiment Score']:
                    # These should rarely be None
                    if random.random() < 0.05:  # Only 5% chance of None
                        record[category] = None
                    else:
                        record[category] = float(generate_rating() or 8)
                else:
                    rating = generate_rating()
                    record[category] = float(rating) if rating is not None else None
            
            # Add metadata
            record['Sailing Number'] = sailing_number
            record['Fleet'] = 'Marella'
            record['Ship'] = ship_name
            record['Guest ID'] = f"{sailing_number}-G{guest_id+1:03d}"
            
            # Add some additional realistic fields
            record['Guest Type'] = random.choice(['First Time', 'Repeat', 'VIP', 'Suite'])
            record['Cabin Category'] = random.choice(['Interior', 'Ocean View', 'Balcony', 'Suite'])
            record['Age Group'] = random.choice(['25-35', '36-45', '46-55', '56-65', '65+'])
            record['Travel Party Size'] = random.randint(1, 6)
            
            # Add start and end dates based on sailing number (approximate)
            base_year = 2024
            if 'Jan' in sailing_number:
                month = 1
            elif 'Feb' in sailing_number:
                month = 2
            elif 'Mar' in sailing_number or 'March' in sailing_number:
                month = 3
            elif 'Apr' in sailing_number or 'April' in sailing_number:
                month = 4
            elif 'May' in sailing_number:
                month = 5
            elif 'Dec' in sailing_number:
                month = 12
            else:
                month = random.randint(1, 12)
            
            # Extract day from sailing number (simplified)
            try:
                day_part = sailing_number.split('-')[1]
                start_day = int(''.join(filter(str.isdigit, day_part[:2])))
                if start_day > 31:
                    start_day = random.randint(1, 28)
            except:
                start_day = random.randint(1, 28)
            
            start_date = datetime(base_year, month, start_day)
            end_date = start_date + timedelta(days=7)  # Assume 7-day cruises
            
            record['Start'] = start_date.strftime('%Y-%m-%d')
            record['End'] = end_date.strftime('%Y-%m-%d')
            
            data.append(record)
    
    return data

# Generate the data
print("Generating cruise ratings data...")
cruise_data = generate_cruise_ratings_data()

# Convert to DataFrame
df = pd.DataFrame(cruise_data)

# Reorder columns to match your preferred format
column_order = [
    'Guest ID', 'Sailing Number', 'Fleet', 'Ship', 'Start', 'End',
    'Guest Type', 'Cabin Category', 'Age Group', 'Travel Party Size'
] + rating_categories

df = df[column_order]

# Save to CSV
output_file = 'c:/Users/harsh/OneDrive/Documents/cruise/test_data/comprehensive_cruise_ratings.csv'
df.to_csv(output_file, index=False)

print(f"Generated {len(df)} rating records across {len(sailing_numbers)} sailings")
print(f"Data saved to: {output_file}")

# Display sample data
print("\nSample records:")
print(df.head(3).to_string())

# Show statistics
print(f"\nDataset Statistics:")
print(f"Total records: {len(df)}")
print(f"Unique sailings: {df['Sailing Number'].nunique()}")
print(f"Ships: {df['Ship'].unique()}")
print(f"Average records per sailing: {len(df) / df['Sailing Number'].nunique():.1f}")

# Show rating distribution for Overall Holiday
print(f"\nOverall Holiday Rating Distribution:")
overall_ratings = df['Overall Holiday'].dropna()
for rating in range(1, 11):
    count = sum(overall_ratings == rating)
    percentage = (count / len(overall_ratings)) * 100
    print(f"Rating {rating}: {count} ({percentage:.1f}%)")
