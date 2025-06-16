import os
import pandas as pd
from typing import Dict
import re
from datetime import datetime
import json


summary_data = [
    {
        "Sailing Number": "1",
        "Ship Name": "Explorer",
        "Cabins": 7.35,
        "F&B quality overall": 7.47,
        "F&B staff service overall": 8.17,
        "F&B quality main dining": 7.06,
        "Entertainment": 7.05,
        "Excursions": 7.05,
        "drinks offerings": 7.54,
        "bar service": 7.47,
        "cabin cleanliness": 8.21,
        "crew friendliness": 7.96,
        "Pre-Cruise Hotel Accommodation": 5.42,
        "App Booking": 5.83,
        "Prior Customer Service": None,
        "Flight": 4.95,
        "Sentiment analysis": 5.07,
        "Holiday and Ship Experience": 7.54
    },
    {
        "Sailing Number": "1",
        "Ship Name": "Explorer 2",
        "Cabins": 7.38,
        "F&B quality overall": 7.73,
        "F&B staff service overall": 8.5,
        "F&B quality main dining": 7.48,
        "Entertainment": 7.95,
        "Excursions": 6.33,
        "drinks offerings": 7.66,
        "bar service": 7.91,
        "cabin cleanliness": 8.3,
        "crew friendliness": 8.37,
        "Pre-Cruise Hotel Accommodation": 6.44,
        "App Booking": 5.38,
        "Prior Customer Service": None,
        "Flight": 5.22,
        "Sentiment analysis": 6.0,
        "Holiday and Ship Experience": 7.81
    },
    {
        "Sailing Number": "1",
        "Ship Name": "Discovery",
        "F&B quality overall": 7.35,
        "F&B service overall": 8.3,
        "F&B quality main dining": 7.03,
        "Entertainment": 7.46,
        "Excursions": 5.54,
        "drinks offerings": None,
        "bar service": 2.0,
        "cabin cleanliness": None,
        "crew friendliness": 2.0,
        "Sentiment analysis": 6.86,
        "App Booking": 2.67,
        "Flight": 2.93,
        "Hotel Accommodation": 6.0,
        "Prior Customer Service": 4.56,
        "Holiday and Ship Experience": 7.72,
        "Cabins": 7.33
    },
    {
        "Sailing Number": "1",
        "Ship Name": "Discovery 2",
        "Cabins": 7.31,
        "F&B quality overall": 7.72,
        "F&B staff service overall": 8.43,
        "F&B quality main dining": 7.4,
        "Entertainment": 7.7,
        "Excursions": 5.47,
        "drinks offerings": 7.86,
        "bar service": 7.98,
        "cabin cleanliness": 8.2,
        "crew friendliness": 8.39,
        "Pre-Cruise Hotel Accommodation": 7.0,
        "App Booking": 6.41,
        "Prior Customer Service": None,
        "Flight": 4.46,
        "Sentiment analysis": 6.33,
        "Holiday and Ship Experience": 7.81
    },
    {
        "Sailing Number": "1",
        "Ship Name": "Voyager250306",
        "Cabins": 7.53,
        "F&B quality overall": 7.74,
        "F&B staff service overall": 8.39,
        "F&B quality main dining": 7.46,
        "Entertainment": 7.61,
        "Excursions": 6.39,
        "drinks offerings": 7.23,
        "bar service": 7.61,
        "cabin cleanliness": 8.11,
        "crew friendliness": 8.47,
        "Pre-Cruise Hotel Accommodation": 6.0,
        "App Booking": 7.32,
        "Prior Customer Service": None,
        "Flight": 6.35,
        "Sentiment analysis": 5.67,
        "Holiday and Ship Experience": 7.93
    },
    {
        "Sailing Number": "1",
        "Ship Name": "Voyager",
        "Cabins": 6.92,
        "F&B quality overall": 7.64,
        "F&B staff service overall": 8.43,
        "F&B quality main dining": 7.2,
        "Entertainment": 7.47,
        "Excursions": 6.34,
        "drinks offerings": 7.08,
        "bar service": 7.34,
        "cabin cleanliness": 8.15,
        "crew friendliness": 8.32,
        "Pre-Cruise Hotel Accommodation": 5.5,
        "App Booking": 5.65,
        "Prior Customer Service": None,
        "Flight": 4.71,
        "Sentiment analysis": 5.89,
        "Holiday and Ship Experience": 7.87
    }
]

summary_discovery2 = [
    {
        'Overall Holiday': 8.79,
        'Prior Customer Service': 8.14,
        'Flight': 4.05,
        'Embarkation/Disembarkation': 7.67,
        'Value for Money': 6.64,
        'App Booking': 6.57,
        'Pre-Cruise Hotel Accomodation': 2.0,
        'Cabins': 7.87,
        'Cabin Cleanliness': 8.11,
        'F&B Quality': 7.85,
        'F&B Service': 8.63,
        'Bar Service': 7.86,
        'Drinks Offerings and Menu': 6.3,
        'Entertainment': 7.99,
        'Excursions': 6.89,
        'Crew Friendliness': 9.48,
        'Ship Condition/Cleanliness (Public Areas)': 7.67,
        'Sentiment Score': 8.05,
        'Ship Name': 'MDY2-2-9April',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.73,
        'Prior Customer Service': 7.59,
        'Flight': 4.31,
        'Embarkation/Disembarkation': 6.38,
        'Value for Money': 7.12,
        'App Booking': 7.27,
        'Pre-Cruise Hotel Accomodation': None,
        'Cabins': 7.95,
        'Cabin Cleanliness': 8.49,
        'F&B Quality': 7.91,
        'F&B Service': 8.42,
        'Bar Service': 8.17,
        'Drinks Offerings and Menu': 7.85,
        'Entertainment': 8.82,
        'Excursions': 6.04,
        'Crew Friendliness': 9.51,
        'Ship Condition/Cleanliness (Public Areas)': 7.5,
        'Sentiment Score': 7.94,
        'Ship Name': 'MDY2-24March-1April',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.86,
        'Prior Customer Service': 8.12,
        'Flight': 6.39,
        'Embarkation/Disembarkation': 7.56,
        'Value for Money': 7.28,
        'App Booking': 4.81,
        'Pre-Cruise Hotel Accomodation': 7.75,
        'Cabins': 7.98,
        'Cabin Cleanliness': 8.68,
        'F&B Quality': 7.83,
        'F&B Service': 8.67,
        'Bar Service': 8.09,
        'Drinks Offerings and Menu': 7.08,
        'Entertainment': 8.66,
        'Excursions': 6.6,
        'Crew Friendliness': 9.24,
        'Ship Condition/Cleanliness (Public Areas)': 7.55,
        'Sentiment Score': 8.18,
        'Ship Name': 'MDY2-10-17Feb',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.59,
        'Prior Customer Service': 7.9,
        'Flight': 4.98,
        'Embarkation/Disembarkation': 7.47,
        'Value for Money': 6.36,
        'App Booking': 7.0,
        'Pre-Cruise Hotel Accomodation': 7.0,
        'Cabins': 7.81,
        'Cabin Cleanliness': 8.56,
        'F&B Quality': 7.52,
        'F&B Service': 8.4,
        'Bar Service': 7.59,
        'Drinks Offerings and Menu': 7.11,
        'Entertainment': 7.77,
        'Excursions': 5.94,
        'Crew Friendliness': 9.42,
        'Ship Condition/Cleanliness (Public Areas)': 7.29,
        'Sentiment Score': 7.8,
        'Ship Name': 'MDY2-24Feb-3March',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.52,
        'Prior Customer Service': 7.97,
        'Flight': 5.22,
        'Embarkation/Disembarkation': 7.0,
        'Value for Money': 7.12,
        'App Booking': 5.75,
        'Pre-Cruise Hotel Accomodation': 10.0,
        'Cabins': 7.49,
        'Cabin Cleanliness': 8.77,
        'F&B Quality': 7.39,
        'F&B Service': 8.58,
        'Bar Service': 7.61,
        'Drinks Offerings and Menu': 6.06,
        'Entertainment': 7.69,
        'Excursions': 6.31,
        'Crew Friendliness': 9.63,
        'Ship Condition/Cleanliness (Public Areas)': 7.73,
        'Sentiment Score': 7.79,
        'Ship Name': 'MDY2-3-10March',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.6,
        'Prior Customer Service': 7.72,
        'Flight': 5.45,
        'Embarkation/Disembarkation': 7.0,
        'Value for Money': 6.73,
        'App Booking': 6.89,
        'Pre-Cruise Hotel Accomodation': 6.0,
        'Cabins': 7.72,
        'Cabin Cleanliness': 8.64,
        'F&B Quality': 7.96,
        'F&B Service': 8.52,
        'Bar Service': 7.33,
        'Drinks Offerings and Menu': 5.57,
        'Entertainment': 8.08,
        'Excursions': 5.91,
        'Crew Friendliness': 9.3,
        'Ship Condition/Cleanliness (Public Areas)': 7.52,
        'Sentiment Score': 7.8,
        'Ship Name': 'MDY2-17-24March',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.79,
        'Prior Customer Service': 8.17,
        'Flight': 4.79,
        'Embarkation/Disembarkation': 6.0,
        'Value for Money': 6.63,
        'App Booking': 5.45,
        'Pre-Cruise Hotel Accomodation': 7.33,
        'Cabins': 8.08,
        'Cabin Cleanliness': 8.93,
        'F&B Quality': 7.69,
        'F&B Service': 7.96,
        'Bar Service': 8.44,
        'Drinks Offerings and Menu': 6.17,
        'Entertainment': 8.24,
        'Excursions': 7.44,
        'Crew Friendliness': 9.46,
        'Ship Condition/Cleanliness (Public Areas)': 7.86,
        'Sentiment Score': 7.93,
        'Ship Name': 'MDY2-9-14April',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.15,
        'Prior Customer Service': 7.46,
        'Flight': 5.12,
        'Embarkation/Disembarkation': 6.84,
        'Value for Money': 6.81,
        'App Booking': 5.8,
        'Pre-Cruise Hotel Accomodation': 10.0,
        'Cabins': 7.36,
        'Cabin Cleanliness': 8.41,
        'F&B Quality': 7.01,
        'F&B Service': 8.15,
        'Bar Service': 8.1,
        'Drinks Offerings and Menu': 6.23,
        'Entertainment': 8.15,
        'Excursions': 5.85,
        'Crew Friendliness': 9.24,
        'Ship Condition/Cleanliness (Public Areas)': 6.71,
        'Sentiment Score': 7.42,
        'Ship Name': 'MDY2-20-27Jan',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.89,
        'Prior Customer Service': 8.29,
        'Flight': 5.03,
        'Embarkation/Disembarkation': 8.36,
        'Value for Money': 7.0,
        'App Booking': 7.83,
        'Pre-Cruise Hotel Accomodation': None,
        'Cabins': 8.07,
        'Cabin Cleanliness': 8.47,
        'F&B Quality': 7.53,
        'F&B Service': 8.83,
        'Bar Service': 8.32,
        'Drinks Offerings and Menu': 7.18,
        'Entertainment': 7.77,
        'Excursions': 8.05,
        'Crew Friendliness': 9.47,
        'Ship Condition/Cleanliness (Public Areas)': 8.16,
        'Sentiment Score': 8.15,
        'Ship Name': 'MDY2-10-17March',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.84,
        'Prior Customer Service': 7.51,
        'Flight': 6.6,
        'Embarkation/Disembarkation': 7.47,
        'Value for Money': 7.48,
        'App Booking': 5.88,
        'Pre-Cruise Hotel Accomodation': 8.0,
        'Cabins': 7.44,
        'Cabin Cleanliness': 8.49,
        'F&B Quality': 8.09,
        'F&B Service': 8.29,
        'Bar Service': 7.74,
        'Drinks Offerings and Menu': 6.8,
        'Entertainment': 8.36,
        'Excursions': 7.0,
        'Crew Friendliness': 9.69,
        'Ship Condition/Cleanliness (Public Areas)': 7.65,
        'Sentiment Score': 8.1,
        'Ship Name': 'MDY2-17-24Feb',
        'Sailing Number': '1'},
    {
        'Overall Holiday': 8.58,
        'Prior Customer Service': 7.61,
        'Flight': 5.83,
        'Embarkation/Disembarkation': 6.59,
        'Value for Money': 6.73,
        'App Booking': 3.0,
        'Pre-Cruise Hotel Accomodation': 6.0,
        'Cabins': 7.84,
        'Cabin Cleanliness': 8.56,
        'F&B Quality': 7.82,
        'F&B Service': 8.45,
        'Bar Service': 6.92,
        'Drinks Offerings and Menu': 5.69,
        'Entertainment': 7.56,
        'Excursions': 7.39,
        'Crew Friendliness': 9.47,
        'Ship Condition/Cleanliness (Public Areas)': 6.7,
        'Sentiment Score': 7.8,
        'Ship Name': 'MDY2-3-10Feb',
        'Sailing Number': '1'}
    ]

summary_discovery = [
    {'Overall Holiday': 10.0,
    'Prior Customer Service': None,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 10,
    'Primary Issues': None,
    'Ship Name': 'MDY-2-9Feb',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': 6.0,
    'Flight': None,
    'Embarkation/Disembarkation': 9.0,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': 10.0,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 8.0,
    'Primary Issues': 'Unreliable wake-up calls could lead to missed excursions.; Need for improved Wi-Fi connectivity.',
    'Ship Name': 'MDY-29Dec-5Jan',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': None,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': 10.0,
    'F&B Service': 10.0,
    'Bar Service': 10.0,
    'Drinks Offerings and Menu': None,
    'Entertainment': 5.0,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 9.0,
    'Primary Issues': None,
    'Ship Name': 'MDY-23-30Mar',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 10.0,
    'Prior Customer Service': 10.0,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': 10.0,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 10,
    'Primary Issues': None,
    'Ship Name': 'MDY-2-9Mar',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': None,
    'Prior Customer Service': 4.0,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 7.0,
    'Primary Issues': 'Lack of proactive communication regarding flight delays.; Need for improved passenger updates during travel disruptions.',
    'Ship Name': 'MDY-5-12Jan',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 10.0,
    'Prior Customer Service': 10.0,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 10.0,
    'Primary Issues': None,
    'Ship Name': 'MDY-16-23Feb',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': None,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': 9.0,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 10.0,
    'Primary Issues': None,
    'Ship Name': 'MDY-19-26Jan',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 8.0,
    'Prior Customer Service': 7.0,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 7,
    'Primary Issues': 'Inconsistent gluten-free meal service on flights.',
    'Ship Name': 'MDY-12-19Jan',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 10.0,
    'Prior Customer Service': 10.0,
    'Flight': 10.0,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': 10.0,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': 10.0,
    'Bar Service': 10.0,
    'Drinks Offerings and Menu': None,
    'Entertainment': 10.0,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 9.0,
    'Primary Issues': 'Spa voucher with unexpected fees',
    'Ship Name': 'MDY-6-13April',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': 10.0,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': 10.0,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': 10.0,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 9.0,
    'Primary Issues': None,
    'Ship Name': 'MDY-9-16Mar',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 8.0,
    'Prior Customer Service': 9.0,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': 9.0,
    'Cabin Cleanliness': 10.0,
    'F&B Quality': 6.0,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': 10.0,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 7.0,
    'Primary Issues': 'Poor food quality; Limited breakfast options',
    'Ship Name': 'MDY-26Jan-2Feb',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': None,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': 3.0,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 7.0,
    'Primary Issues': 'Expensive excursions; Difficulties booking tables for large groups',
    'Ship Name': 'MDY-23Feb-3Mar',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Discovery'}
    ]

summary_others = [
    {'Overall Holiday': 10.0,
    'Prior Customer Service': 4.5,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': 8.3,
    'Cabin Cleanliness': None,
    'F&B Quality': None,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 10,
    'Primary Issues': None,
    'Ship Name': 'MEX-2-9Feb',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Explorer'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': 6.0,
    'Flight': None,
    'Embarkation/Disembarkation': 9.0,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': 10.0,
    'F&B Service': None,
    'Bar Service': None,
    'Drinks Offerings and Menu': None,
    'Entertainment': None,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 8.0,
    'Primary Issues': 'Unreliable wake-up calls could lead to missed excursions.; Need for improved Wi-Fi connectivity.',
    'Ship Name': 'MEX2-29Dec-5Jan',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Explorer 2'},
    {'Overall Holiday': 9.0,
    'Prior Customer Service': None,
    'Flight': None,
    'Embarkation/Disembarkation': None,
    'Value for Money': None,
    'App Booking': None,
    'Pre-Cruise Hotel Accomodation': None,
    'Cabins': None,
    'Cabin Cleanliness': None,
    'F&B Quality': 10.0,
    'F&B Service': 10.0,
    'Bar Service': 10.0,
    'Drinks Offerings and Menu': None,
    'Entertainment': 5.0,
    'Excursions': None,
    'Crew Friendliness': None,
    'Ship Condition/Cleanliness (Public Areas)': None,
    'Sentiment Score': 9.0,
    'Primary Issues': None,
    'Ship Name': 'MoV-23-30Mar',
    'Sailing Number': '1',
    'Fleet': 'Marella',
    'Ship': 'Voyager'}
    ]


def filename_date(filename, dNumber, year=2025):
    if dNumber == 1:
        match = re.match(r'MDY-(\d+[A-Za-z]*)-(\d+[A-Za-z]+)', filename)
    else:
    # Extract all date parts using improved regex
        match = re.match(r'MDY2-(\d+[A-Za-z]*)-(\d+[A-Za-z]+)', filename)
    if not match:
        print(f"Filename format not recognized: {filename}")
        return None, None
    
    start_part, end_part = match.groups()
    
    def parse_date(part, month_hint=None):
        try:
            # Extract day and month
            day = int(re.search(r'^\d+', part).group())
            month_match = re.search(r'[A-Za-z]+', part)
            month = month_match.group().capitalize() if month_match else month_hint
            
            if not month:
                raise ValueError(f"Missing month in: {part}")
            
            # Handle month abbreviations (Feb -> February)
            month_map = {
                'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
                'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
            }
            full_month = month_map.get(month[:3], month)
            
            return datetime.strptime(f"{day} {full_month} {year}", "%d %B %Y")
        except Exception as e:
            print(f"Error parsing date part '{part}': {e}")
            return None
    
    try:
        # Get month from end date to use as hint for start date
        end_month = re.search(r'[A-Za-z]+', end_part)
        month_hint = end_month.group().capitalize() if end_month else None
        
        start_date = parse_date(start_part, month_hint)
        end_date = parse_date(end_part)
        
        return (
            start_date.strftime("%Y-%m-%d") if start_date else None,
            end_date.strftime("%Y-%m-%d") if end_date else None
        )
    except Exception as e:
        print(f"Error processing {filename}: {e}")
        return None, None


def is_empty_or_nan_rating(dfList):
    processed_data = [] 
    for data_dict in dfList:
        processed_dict = data_dict.copy()  # Create a copy to avoid modifying the original

        overall_holiday = processed_dict.get('Overall Holiday')  # Use .get() to handle missing key safely

        if overall_holiday is not None:
            replacement_value = overall_holiday - 1
        else:
            replacement_value = 6

        for key, value in processed_dict.items():
            if value is None:
                processed_dict[key] = replacement_value

        processed_data.append(processed_dict)

    return processed_data
    
def get_summary_data():
    for data in summary_discovery2:
        name =  data.get("Ship Name")
        start, end = filename_date(name, 2, year=2025)
        data.update({"Start":start})
        data.update({"End":end})
        data.update({"Fleet":"Marella"})
        data.update({"Ship":"Discovery 2"})
        print(start, end)
    for data in summary_discovery:
        name =  data.get("Ship Name")
        start, end = filename_date(name,1, year=2025)
        data.update({"Start":start})
        data.update({"End":end})
        # data.update({"Fleet":"Marella"})
        # data.update({"Ship":"Discovery"})
        print(start, end)
    for data in summary_others:
        name =  data.get("Ship Name")
        start, end = filename_date(name,1, year=2025)
        data.update({"Start":start})
        data.update({"End":end})
    finalSummary = summary_discovery2+summary_discovery+summary_others
    finalSummary = is_empty_or_nan_rating(finalSummary)
    with open("./smry.json", 'w') as json_file:
        json.dump(finalSummary, json_file, indent=4) 
    return finalSummary
    # return summary_data2

def format_filename(input_string, data_dir_index):
#     input_string = "MDY2 2 - 9 April"
    if data_dir_index == 1:
        modified_string = re.sub(r"(MDY) ", r"\1-", input_string, 1)
    # Replace the first space after "MDY2" with "_"
    else:
        modified_string = re.sub(r"(MDY2) ", r"\1-", input_string, 1)

    # Remove all remaining spaces in the string
    final_string = modified_string.replace(" ", "")

    print(f"Original string: '{input_string}'")
    print(f"Modified string: '{final_string}'")
    return final_string

def load_sailing_data_td1(data_dir: str = "./test_data") -> Dict[str, pd.DataFrame]:
    """
    Load all sailing data CSV files from a directory into DataFrames
    
    Args:
        data_dir: Directory containing sailing data CSV files
        
    Returns:
        Dictionary with keys like "Voyager_CR348" and DataFrame values
    """
    sailing_data = {}
    
    for filename in os.listdir(data_dir):
#         print(filename)
        if filename.endswith(".csv"):
            try:
                # Extract ship and sailing number from filename (format: ShipName_SailingNumber.csv)
#                 print(os.path.splitext(filename))
#                 print(os.path.splitext(filename)[0].split("-"))
                ship = os.path.splitext(filename)[0].split("-")[0].strip()
                sailing = "1"
                key = f"{ship}_{sailing}"
                key = key.lower()
                
                # Load CSV and store in dictionary
                df = pd.read_csv(os.path.join(data_dir, filename))
                sailing_data[key] = df
                
                print(f"Loaded data for {ship} {sailing} with {len(df)} records")
            except Exception as e:
                print(f"Error loading {os.path.join(data_dir, filename)}: {str(e)}")
    
    return sailing_data



# def load_sailing_data_rate_reason(data_dir: str = "./test_data2/DISCOVERY 2 - 2025") -> Dict[str, pd.DataFrame]:
def load_sailing_data_rate_reason() -> Dict[str, pd.DataFrame]:


    """
    Load all sailing data CSV files from a directory into DataFrames
    
    Args:
        data_dir: Directory containing sailing data CSV files
        
    Returns:
        Dictionary with keys like "Voyager_CR348" and DataFrame values
    """
    sailing_data = {}
    sailing_data_reason = {}

    data_directs = ["./test_data2/DISCOVERY 2 - 2025", "./test_data2/DISCOVERY 2025" ]

    for data_dir_index, data_dir in enumerate(data_directs):
        for subdir_name in os.listdir(data_dir):
            subdir_path = os.path.join(data_dir, subdir_name)
            found = False
            if os.path.isdir(subdir_path):
                for file in os.listdir(subdir_path):
                    if file.endswith(subdir_name+".csv"):
                        found = True
                if found == True:
                    concat_rating_file = os.path.join(subdir_path, f"{subdir_name}.csv")
                    concat_reason_file = os.path.join(subdir_path, f"{subdir_name}_reason.csv")
                    n = format_filename(subdir_name, data_dir_index)
                    # print(n)
                    # print(avg_rating_file)
                    df_rating = pd.read_csv(concat_rating_file)
                    df_reason = pd.read_csv(concat_reason_file)

                    ship = n
                    sailing = "1"
                    key = f"{ship}_{sailing}"
                    key = key.lower()

                    sailing_data[key] = df_rating
                    sailing_data_reason[key]= df_reason
                
    
    return sailing_data, sailing_data_reason
# SD = load_sailing_data()

# def get_sailing_data():
#     return SD