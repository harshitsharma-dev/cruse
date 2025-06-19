import datetime
from sqlalchemy import create_engine, text, Table, MetaData, select
import json

db_path = "./sqlComments.db"
engine = create_engine(f"sqlite:///file:{db_path}?mode=ro&uri=true", echo=False)

def fetch_comments(fleet_name=None, ship_name=None, sailing_number=None,
                   start_date=None, end_date=None, sheet_name=None):
    with engine.connect() as conn:
        query = """
        SELECT 
            Fleets.name AS fleet_name,
            Ships.name AS ship_name,
            Sailings.sailing_number,
            Sailings.start_date,
            Sheets.name AS sheet_name,
            Comments.issues
        FROM Comments
        JOIN Sheets ON Comments.sheet_id = Sheets.id
        JOIN Sailings ON Comments.sailing_id = Sailings.id
        JOIN Ships ON Comments.ship_id = Ships.id
        JOIN Fleets ON Ships.fleet_id = Fleets.id
        WHERE 1=1
        """

        params = {}

        if fleet_name:
            query += " AND Fleets.name = :fleet_name"
            params["fleet_name"] = fleet_name
        if ship_name:
            query += " AND Ships.name = :ship_name"
            params["ship_name"] = ship_name
        if sailing_number:
            query += " AND Sailings.sailing_number = :sailing_number"
            params["sailing_number"] = sailing_number
        if start_date:
            query += " AND Sailings.start_date >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query += " AND Sailings.start_date <= :end_date"
            params["end_date"] = end_date
        if sheet_name:
            query += " AND Sheets.name = :sheet_name"
            params["sheet_name"] = sheet_name

        result = conn.execute(text(query), params)
        rows = result.fetchall()

        return [dict(row._mapping) for row in rows]

def fetch_fleets():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM Fleets"))
        return [row[0] for row in result]

def fetch_ships():
    with engine.connect() as conn:
        query = """
        SELECT Fleets.name AS fleet_name, Ships.name AS ship_name
        FROM Ships
        JOIN Fleets ON Ships.fleet_id = Fleets.id
        """
        result = conn.execute(text(query))
        data = {}
        for row in result:
            fleet = row._mapping["fleet_name"]
            ship = row._mapping["ship_name"]
            if fleet not in data:
                data[fleet] = []
            data[fleet].append(ship)
        return [{"fleet": fleet, "ships": ships} for fleet, ships in data.items()]

def fetch_sheets():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM Sheets"))
        return [row[0] for row in result]

def fetch_sailings(ships=None, start_date=None, end_date=None):
    with engine.connect() as conn:
        query = """
        SELECT Sailings.sailing_number, Ships.name AS ship_name, Sailings.start_date, Sailings.end_date
        FROM Sailings
        JOIN Ships ON Sailings.ship_id = Ships.id
        WHERE 1=1
        """
        params = {}

        if ships:
            placeholders = ", ".join([f":ship{i}" for i in range(len(ships))])
            query += f" AND Ships.name IN ({placeholders})"
            for i, ship in enumerate(ships):
                params[f"ship{i}"] = ship

        if start_date:
            start_ts = datetime.datetime.strptime(start_date, "%Y-%m-%d").timestamp()
            query += " AND Sailings.start_date_dt >= :start_ts"
            params["start_ts"] = start_ts

        if end_date:
            end_ts = datetime.datetime.strptime(end_date, "%Y-%m-%d").timestamp()
            query += " AND Sailings.start_date_dt <= :end_ts"
            params["end_ts"] = end_ts

        result = conn.execute(text(query), params)
        return [row[0] for row in result]

def fetch_cruise_ratings(sailing_numbers):    
    # Reflect the Cruise_Ratings table
    metadata = MetaData()
    metadata.reflect(bind=engine)
    cruise_ratings = metadata.tables['Cruise_Ratings']
    
    # Query and fetch data
    with engine.connect() as connection:
        query = select(cruise_ratings).where(
            cruise_ratings.c['Sailing Number'].in_(sailing_numbers)
        )
        result = connection.execute(query)
        rows = [dict(row) for row in result.mappings().all()]
    
    # Convert result to JSON
    return json.dumps(rows)    


def fetch_issues(ship_names=None, sailing_numbers=None, sheet_names=None):
    with engine.connect() as conn:
        query = """
            SELECT 
                Ships.name AS ship_name,
                Sailings.sailing_number,
                Sheets.name AS sheet_name,
                Issues.issues
            FROM Issues
            JOIN Sheets ON Issues.sheet_id = Sheets.id
            JOIN Sailings ON Issues.sailing_id = Sailings.id
            JOIN Ships ON Issues.ship_id = Ships.id
            WHERE 1=1
        """
        params = {}

        if sailing_numbers:
            sailing_placeholders = ", ".join([f":sailing{i}" for i in range(len(sailing_numbers))])
            query += f" AND Sailings.sailing_number IN ({sailing_placeholders})"
            for i, sn in enumerate(sailing_numbers):
                params[f"sailing{i}"] = sn

        if ship_names:
            ship_placeholders = ", ".join([f":ship{i}" for i in range(len(ship_names))])
            query += f" AND Ships.name IN ({ship_placeholders})"
            for i, ship in enumerate(ship_names):
                params[f"ship{i}"] = ship

        if sheet_names:
            sheet_placeholders = ", ".join([f":sheet{i}" for i in range(len(sheet_names))])
            query += f" AND Sheets.name IN ({sheet_placeholders})"
            for i, sheet in enumerate(sheet_names):
                params[f"sheet{i}"] = sheet

        result = conn.execute(text(query), params)
        return [dict(row._mapping) for row in result]
    
    
# 🔍 Example Usage
# print(fetch_comments(
#     fleet_name="Mediterranean Fleet",
#     ship_name="Explorer",
#     sailing_number="MEX-10-17Jan-AtlanticIslands",
#     start_date="2025-01-01",
#     end_date="2025-01-31",
#     sheet_name="Dining"
# ))

# print(fetch_fleets())
# print(fetch_ships())
# print(fetch_sheets())
# print(fetch_sailings("Explorer", start_date="2025-01-01", end_date="2025-01-31"))