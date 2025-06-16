import requests
import json
import pandas as pd
import os
import logging
import excel_clean as EC
from typing import Union, List

# Setup logging
logging.basicConfig(
    filename='search_log.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

from util import get_colObj, get_embedding_ollama, get_sheets_config
collection = get_colObj()
SHEET_CONFIG = get_sheets_config
ollama_model =  "llama3.2"


def expand_query(user_query, use_ollama=True):
    prompt = f"""
    Analyze the user's query and expand it to include synonyms, related concepts, and potential sentiment variations.
    The goal is to broaden the search for relevant comments in a customer feedback database.
    Consider different ways the user might express the same idea or related ideas.

    Provide ONLY the expanded query as a comma-separated list of terms and phrases. Do NOT include any code or explanations.

    Example input 1: "bad beef based dishes"
    Example output 1: "bad beef based dishes, poor quality beef, undercooked meat, tough steak, rubbery burgers, issues with roast beef, disappointing brisket, complaints about beef stew"

    Example input 2: "great entertainment shows"
    Example output 2: "great entertainment shows, excellent performances, engaging acts, fantastic stage productions, enjoyable live music, impressive shows, highly rated entertainment"

    Example input 3: "issues with port excursions"
    Example output 3: "issues with port excursions, problems with shore trips, unorganized tours, disappointing excursions, complaints about port visits, poor excursion experiences"

    User Query: "{user_query}"

    Expanded Query (comma-separated list):
    """

    if use_ollama:
        res = requests.post("http://localhost:11434/api/generate", json={
            "model": ollama_model,
            "prompt": prompt,
            "stream": False
        })
        return res.json().get('response', '').strip()
    else:
        res = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return res['choices'][0]['message']['content'].strip()


def build_final_where_clause(sheet: Union[str, List[str]] = None, 
                    restaurant_name: str = None,
                    time_of_meal: str = None, start_date_filter: str = None, 
                    sailing_number_filter:List[str] =None,
                    ships: List[str] =None, fleets: List[str] =None):
    conditions = []
    
    if sheet: # Check if sheet is not None or empty
        if isinstance(sheet, str):
            conditions.append({"sheet": sheet})
        elif isinstance(sheet, list):
            # For a list, use the '$in' operator for an "OR" condition
            if sheet: # Ensure the list is not empty
                conditions.append({"sheet": {"$in": sheet}})  
    if ships: # Check if sheet is not None or empty
        if isinstance(ships, list):
            # For a list, use the '$in' operator for an "OR" condition
            if ships: # Ensure the list is not empty
                conditions.append({"ship_name": {"$in": ships}})
    if fleets: # Check if sheet is not None or empty
        if isinstance(fleets, list):
            # For a list, use the '$in' operator for an "OR" condition
            if fleets: # Ensure the list is not empty
                conditions.append({"fleet_name": {"$in": fleets}})
    if sailing_number_filter: # Check if sheet is not None or empty
        if isinstance(sailing_number_filter, list):
            # For a list, use the '$in' operator for an "OR" condition
            if sailing_number_filter: # Ensure the list is not empty
                conditions.append({"sailing_number": {"$in": sailing_number_filter}})  
    if restaurant_name != None:
        conditions.append({"Name of the restaurant:": restaurant_name})
    if time_of_meal:
        conditions.append({"Time of meal:": time_of_meal})
    # if start_date_filter:
    #     conditions.append({"start_date": start_date_filter})
    
    final_where_clause = None
    if conditions:
        if len(conditions) == 1:
            final_where_clause = conditions[0]
        else:
            final_where_clause = {"$and": conditions}
    return final_where_clause


def prepare_df_results(results_list: list[dict]) -> pd.DataFrame:
    """
    Converts a list of ChromaDB-like query result dictionaries into a pandas DataFrame,
    flattening the 'metadata' dictionary, removing specified keys,
    renaming specific columns, removing underscores from all column names,
    sorting columns, and converting column names to Title Case.

    Args:
        chromadb_results_list (list[dict]): A list of dictionaries, where each dict
                                           has 'id', 'comment', 'metadata', and optionally 'distance_value'.
                                           The 'metadata' dict can have varying keys.

    Returns:
        pd.DataFrame: A pandas DataFrame with 'id', 'comment', 'distance_value'
                      (or None if missing) and all flattened metadata columns,
                      with columns sorted and named in Title Case.
    """
    processed_rows = []
    keys_to_remove_from_metadata = ['row_number', 'end_date']

    for item in results_list:
        row = {
            'id': item.get('id'),
            'comment': item.get('comment'),
            'distance_value': item.get('distance_value')
        }

        metadata = item.get('metadata', {})
        for key, value in metadata.items():
            if key not in keys_to_remove_from_metadata:
                row[key] = value

        processed_rows.append(row)

    df = pd.DataFrame(processed_rows)

    # --- Step 1: Rename specific columns ---
    # Define a dictionary for renames, mapping original names to new names.
    # Note: These are the names *before* title casing or underscore removal.
    column_rename_map = {
        "ship_name": "ship",
        "fleet_name": "fleet",
        "distance_value": "distance score" # Also renaming this for brevity
    }
    # Use .rename() with the axis='columns' parameter
    df = df.rename(columns=column_rename_map)


    # --- Step 2: Remove underscores and convert to Title Case for all column names ---
    # We do this after specific renames but before defining the final order
    new_columns = []
    for col in df.columns:
        # Remove underscores first
        cleaned_col = col.replace("_", " ")
        # Then convert to Title Case
        new_columns.append(cleaned_col.title())
    df.columns = new_columns


    # --- Step 3: Define desired column order using the new, cleaned names ---
    # Ensure all desired leading columns exist in the DataFrame after flattening
    # and title casing.
    desired_leading_columns_order = [
        "Comment",
        "Distance",     # Now "Distance"
        "Ship",         # Now "Ship"
        "Sailing Number" # Now "Sailing Number"
    ]
    # Filter only columns that are actually present
    existing_leading_columns = [col for col in desired_leading_columns_order if col in df.columns]

    # Get all other columns (that are not in our desired leading list)
    other_columns = [col for col in df.columns if col not in desired_leading_columns_order]
    # Filter out columns that are part of the trailing order to avoid duplicates
    # This also helps ensure 'other_columns' are truly "other"
    desired_trailing_columns_order = [
        "Fleet",        # Now "Fleet"
        "Start Date",   # Now "Start Date" (from start_date)
        "Sheet",
        "Id"
    ]
    other_columns = [col for col in other_columns if col not in desired_trailing_columns_order]
    # Sort 'other_columns' alphabetically for consistent ordering
    other_columns.sort()


    existing_trailing_columns = [col for col in desired_trailing_columns_order if col in df.columns]


    # Combine all parts to form the final column order
    final_column_order = existing_leading_columns + other_columns + existing_trailing_columns

    # Use .reindex() to reorder columns. This is safe even if some columns don't exist
    df = df.reindex(columns=final_column_order)

    return df



def semantic_search(query, top_k=5, similarity_threshold=0.7, use_ollama=True,
                    fleets: List[str] =None, ships: List[str] =None,
                    sheet: Union[str, List[str]] = None, 
                    restaurant_name: str = None,
                    time_of_meal: str = None, start_date_filter: str = None, sailing_number_filter : List[str] =None):
    """
    Performs a semantic search on the ChromaDB collection.
    It expands the query, generates embeddings for each expanded term,
    performs multiple searches, and then combines and re-ranks results.
    """
    
    # Build the 'where' clause for metadata filtering
    final_where_clause = build_final_where_clause(sheet, restaurant_name, time_of_meal, 
                            start_date_filter,sailing_number_filter, ships, fleets)

    print(f"Applying metadata filters: {final_where_clause}")

    expanded_query_str = expand_query(query, use_ollama=use_ollama)
    print("🔍 Expanded Query String:", expanded_query_str)

    # Split the expanded query string into individual terms/phrases
    # Clean up terms: strip whitespace and filter out empty strings
    expanded_terms = [term.strip() for term in expanded_query_str.split(',') if term.strip()]
    
    if not expanded_terms:
        print("No valid expanded terms found for search.")
        return pd.DataFrame(columns=["ID", "Comment", "Distance", "Sheet", "Sailing Date", "Restaurant", "Meal Time", "Rating", "Dish"])

    print(f"Generating embeddings for {len(expanded_terms)} expanded terms...")
    # Generate embeddings for each expanded term
    query_embeddings = []
    for term in expanded_terms:
        try:
            query_embeddings.append(get_embedding_ollama(term))
        except Exception as e:
            print(f"Warning: Could not get embedding for term '{term}': {e}")
            continue
    
    if not query_embeddings:
        print("No embeddings could be generated for the expanded terms.")
        return pd.DataFrame(columns=["ID", "Comment", "Distance", "Sheet", "Sailing Date", "Restaurant", "Meal Time", "Rating", "Dish"])

    # Perform a single query with multiple embeddings
    # ChromaDB's query function can take multiple query_embeddings.
    # It returns distances for each query_embedding to each result.
    results = collection.query(
        query_embeddings=query_embeddings, # Pass all generated embeddings
        n_results=top_k * 5, # Fetch more results initially to allow for re-ranking and thresholding
        include=['documents', 'metadatas', 'distances'],
        where=final_where_clause if final_where_clause else None,
        where_document = {"$contains": query}
    )

    # Process results to combine and deduplicate
    combined_hits = {} # {id: {comment, metadata, min_distance}}

    if results and results.get("documents") and results["documents"][0]:
        # results['distances'] will be a list of lists if multiple query embeddings
        # For each query embedding, we get a list of distances and corresponding docs/metadatas/ids.
        # We need to iterate through each sublist of results.

        num_query_embeddings = len(results['documents']) # Number of query embeddings
        
        for q_idx in range(num_query_embeddings):
            docs = results['documents'][q_idx]
            metas = results['metadatas'][q_idx]
            ids = results['ids'][q_idx]
            distances = results['distances'][q_idx]

            for i in range(len(ids)):
                doc_id = ids[i]
                current_distance = distances[i]
                
                # Apply similarity threshold
                if current_distance <= (1 - similarity_threshold):
                    if doc_id not in combined_hits or current_distance < combined_hits[doc_id]['distance_value']:
                        # Store the hit with the minimum distance found so far for this document
                        combined_hits[doc_id] = {
                            "id": doc_id,
                            "comment": docs[i],
                            "metadata": metas[i],
                            "distance_value": current_distance # Store the raw distance for sorting
                        }
                else:
                    print(f"Skipping result {doc_id} due to low similarity (distance: {current_distance:.4f}, threshold: {similarity_threshold}) for one of the query terms.")
    
    # Convert combined_hits dictionary to a list and sort by the best (minimum) distance
    sorted_hits = sorted(combined_hits.values(), key=lambda x: x.get('distance_value', float('inf')))

    # Take only the top_k results after sorting
    final_hits = sorted_hits[:top_k]

    # Prepare data for Gradio Dataframe
    if not final_hits:
        return pd.DataFrame(columns=["ID", "Comment", "Sheet", "Sailing Date", "Ship", "Metadata", "Similarity"])

    df_final = prepare_df_results(final_hits)
    return df_final



def word_search(query, top_k=5, use_ollama=True,
                    fleets: List[str] =None, ships: List[str] =None,
                    sheet: Union[str, List[str]] = None, 
                    restaurant_name: str = None,
                    time_of_meal: str = None, start_date_filter: str = None, sailing_number_filter:List[str] =None):
    """
    Performs a semantic search on the ChromaDB collection.
    It expands the query, generates embeddings for each expanded term,
    performs multiple searches, and then combines and re-ranks results.
    """
    
    # Build the 'where' clause for metadata filtering
    final_where_clause = build_final_where_clause(sheet, restaurant_name, time_of_meal, 
                            start_date_filter,sailing_number_filter, ships, fleets)


    print(f"Applying metadata filters: {final_where_clause}")

    where_document_clause={"$contains": query}

    results = collection.get(
        include=['documents', 'metadatas'],
        where=final_where_clause if final_where_clause else None,
        where_document = where_document_clause,
        limit=top_k
    )

    # print(results)
    # Process results to combine and deduplicate
    combined_hits = {} # {id: {comment, metadata, min_distance}}

    if results and results.get("documents") and results["documents"][0]:
        # results['distances'] will be a list of lists if multiple query embeddings
        # For each query embedding, we get a list of distances and corresponding docs/metadatas/ids.
        # We need to iterate through each sublist of results.

        num_query_embeddings = len(results['documents']) # Number of query embeddings
        
        for q_idx in range(num_query_embeddings):
            docs = results['documents'][q_idx]
            metas = results['metadatas'][q_idx]
            ids = results['ids'][q_idx]
        
            if ids not in combined_hits:
                # Store the hit with the minimum distance found so far for this document
                combined_hits[ids] = {
                    "id": ids,
                    "comment": docs,
                    "metadata": metas,
                }
    
    # Convert combined_hits dictionary to a list and sort by the best (minimum) distance
    sorted_hits = sorted(combined_hits.values(), key=lambda x: x.get('distance_value', float('inf')))

    # Take only the top_k results after sorting
    final_hits = sorted_hits

    # Prepare data for Gradio Dataframe
    if not final_hits:
        return pd.DataFrame(columns=["ID", "Comment", "Sheet", "Sailing Date", "Ship", "Metadata"])

    df_final = prepare_df_results(final_hits)
    return df_final




def fetch_comments_by_metadata(sheet: str = None, sailing_date: str = None, top_k: int = 5000):
    """
    Fetches comments based on specified metadata filters.
    A generic query is used to retrieve a broad set of documents, which are then
    filtered strictly by metadata.
    """
    # Use a generic query to get a broad set of documents for metadata filtering
    generic_query_text = "general feedback cruise experience"
    generic_embedding = get_embedding_ollama(generic_query_text)

    # Build the conditions list for the 'where' clause
    conditions = []
    if sheet:
        conditions.append({"sheet": sheet})
    if sailing_date:
        conditions.append({"start_date": sailing_date})

    final_where_clause = None
    if conditions:
        if len(conditions) == 1:
            # If there's only one condition, use it directly
            final_where_clause = conditions[0]
        else:
            # If there are multiple conditions, combine them with "$and"
            final_where_clause = {"$and": conditions}

    print(f"Fetching comments with metadata filters: {final_where_clause}")

    results = collection.query(
        query_embeddings=[generic_embedding],
        n_results=top_k, # Fetch a large number of results to ensure all relevant are included
        include=['documents', 'metadatas'],
        where=final_where_clause # Apply the correctly structured where clause
    )

    comments = []
    # Ensure to handle cases where results might be empty or structures differ
    if results and results.get("documents") and results["documents"][0]:
        for i in range(len(results["documents"][0])):
            comments.append({
                "comment": results["documents"][0][i],
                "metadata": results["metadatas"][0][i]
            })
    return comments


def identify_core_issues(sailing_date: str, sheet: str, use_ollama: bool = True):
    """
    Identifies core issues and topics from comments for a specific sailing date and sheet.
    """
    print(f"\n--- Identifying Core Issues for Sailing Date: {sailing_date}, Sheet: {sheet} ---")

    # Step 1: Retrieve relevant comments based on sailing_date and sheet
    # relevant_comments = fetch_comments_by_metadata(sheet=sheet, sailing_date=sailing_date, top_k=5000) # Fetch up to 5000 comments
    relevant_comments = fetch_comments_by_metadata(sailing_date='2025-05-03', top_k=5000) # Fetch up to 5000 comments

    if not relevant_comments:
        print(f"No comments found for sailing date: {sailing_date} and sheet: {sheet}")
        return "No comments found for the specified criteria."

    # Concatenate comments for LLM processing
    # Consider chunking for very large sets of comments if context window is an issue
    comments_text = "\n---\n".join([c['comment'] for c in relevant_comments])

    # Step 2: Formulate prompt for LLM to identify issues
    prompt = f"""
    Analyze the following customer feedback comments from the "{sheet}" section for the sailing date "{sailing_date}".
    Identify the main core issues, recurring topics, and key themes discussed.
    Summarize these points concisely, using bullet points.
    Do NOT include any introduction or conclusion, just the bullet points.

    Comments:
    {comments_text}

    Core Issues and Topics:
    """

    print(f"Sending {len(relevant_comments)} comments to LLM for analysis...")

    # Step 3: Call LLM
    if use_ollama:
        res = requests.post("http://localhost:11434/api/generate", json={
            "model": ollama_model, # Assuming llama3 is good for summarization/analysis
            "prompt": prompt,
            "stream": False
        })
        identified_issues = res.json().get('response', '').strip()
    else:
        res = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        identified_issues = res['choices'][0]['message']['content'].strip()

    return identified_issues


def trending_core_issues(sheet: str = None, use_ollama: bool = True):
    """
    For each unique sailing_date in the database, fetch all comments for that sailing_date (optionally filtered by sheet),
    generate up to 30 core issues, and identify trends or repeat problems across all sailings.
    Returns a DataFrame with issues per sailing_date and a summary of trending issues.
    """

    from chromadb_ops import get_metadata_keys

    # Step 1: Get all unique sailing_date values
    unique_metadata = get_metadata_keys()
    sailing_dates = sorted(list(unique_metadata.get("sailing_date", [])))
    print(f"Found {len(sailing_dates)} unique sailing dates.")

    all_issues = []
    sailing_issues_map = {}

    for sailing_date in sailing_dates:
        print(f"\nProcessing sailing_date: {sailing_date}")
        comments = fetch_comments_by_metadata(sailing_date=sailing_date, top_k=5000)
        if not comments:
            print(f"No comments found for {sailing_date}")
            continue
        comments_text = "\n---\n".join([c['comment'] for c in comments])
        prompt = f"""
        Analyze the following customer feedback comments.
        Identify up to 30 main core issues, recurring topics, and key themes discussed.
        Summarize these points concisely, using bullet points. Do NOT include any introduction or conclusion, just the bullet points. The points should be unique.
        Comments:x`
        {comments_text}
        Core Issues and Topics (min 20):
        """
        if use_ollama:
            res = requests.post("http://localhost:11434/api/generate", json={
                "model": ollama_model,
                "prompt": prompt,
                "stream": False
            })
            issues_text = res.json().get('response', '').strip()
        else:
            res = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            issues_text = res['choices'][0]['message']['content'].strip()
        # Split issues into a list (assuming bullet points start with '-', '*', or numbered)
        issues = [line.strip('-*• ').strip() for line in issues_text.splitlines() if line.strip() and (line.strip()[0] in '-*•1234567890')]
        issues = issues[:30]  # Limit to 30
        sailing_issues_map[sailing_date] = issues
        for issue in issues:
            all_issues.append((sailing_date, issue))

    # Step 2: Save issues for each sailing into a DataFrame
    df_issues = pd.DataFrame(all_issues, columns=["sailing_date", "issue"])
    df_issues.to_csv("sailing_issues.csv", index=False)
    print("Saved sailing issues to sailing_issues.csv")

    # Step 3: Identify trends or repeat problems across all sailings (moved to new function)
    return df_issues


def analyze_issue_trends_from_file(csv_path="sailing_issues.csv"):
    """
    Reads the issues CSV and performs trending and time series analysis.
    Returns trending DataFrame and pivot table.
    """
    try:
        df_issues = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Error reading {csv_path}: {e}")
        return None, None

    from collections import defaultdict
    # Trending: Count how many sailings each issue appears in
    issue_to_sailings = defaultdict(set)
    for _, row in df_issues.iterrows():
        issue_to_sailings[row['issue']].add(row['sailing_date'])
    trending = [(issue, len(sailings)) for issue, sailings in issue_to_sailings.items()]
    trending.sort(key=lambda x: x[1], reverse=True)
    trending_df = pd.DataFrame(trending, columns=["issue", "num_sailings"])
    print("\nTrending/Repeat Issues Across Sailings:")
    print(trending_df.head(20))

    # Time Series Analysis
    pivot = df_issues.pivot_table(index="issue", columns="sailing_date", aggfunc=len, fill_value=0)
    print("\nTime Series Issue Frequency Table:")
    print(pivot.head(20))

    # Optional: Plot heatmap for visual trend analysis
    try:
        import matplotlib.pyplot as plt
        import numpy as np
        plt.figure(figsize=(10, min(20, len(pivot))))
        data = pivot.values
        plt.imshow(data, aspect='auto', cmap='YlOrRd')
        plt.colorbar(label='Frequency')
        plt.title("Issue Frequency per Sailing Date (Heatmap)")
        plt.ylabel("Issue")
        plt.xlabel("Sailing Date")
        plt.xticks(ticks=np.arange(len(pivot.columns)), labels=pivot.columns, rotation=45, ha='right')
        plt.yticks(ticks=np.arange(len(pivot.index)), labels=pivot.index)
        # Annotate each cell with the numeric value
        for i in range(data.shape[0]):
            for j in range(data.shape[1]):
                plt.text(j, i, str(data[i, j]), ha='center', va='center', color='black', fontsize=8)
        plt.tight_layout()
        plt.show()
    except ImportError:
        print("matplotlib not installed: skipping heatmap plot.")
    except Exception as e:
        print(f"Error plotting heatmap: {e}")

    return trending_df, pivot


if __name__ == "__main__":
    # print(chroma_client)
    # process_excel_for_chroma("apollo/DISCOVERY 2025/MDY 6 to 13 April/MDi250406 Feedback.xls")

    base_dir = './apollo/Fleet Comment Reports - 20 April to 10 May/'
    fleet_name = "marella"
    for subdir_name in os.listdir(base_dir):
        subdir_path = os.path.join(base_dir, subdir_name)
        print("***************",subdir_name)
        if subdir_name == ".ipynb_checkpoints":
            continue
        if os.path.isdir(subdir_path):
            joinedName = EC.format_filename(subdir_name)
            finalNameSplit =EC.split_name(joinedName)
    #         print("--------------", finalNameSplit)
            ship_name = finalNameSplit[0]
            start_date = finalNameSplit[1]
            end_date = finalNameSplit[2]
            sailing_number = joinedName
            for file in os.listdir(subdir_path):
    #             print(file)
                if file.endswith(".xls") or file.endswith(".xlsx"):
                    print(file)
                    fullpath=os.path.join(subdir_path,file)
                    process_excel_for_chroma(fullpath, ship_name, start_date,end_date, sailing_number, fleet_name)

# ----------------------------
    print("\n--- Performing Semantic Search Simple---")
    # query = "bad beef based dishes"
    # # Adjust top_k to get more results initially before filtering
    # # Adjust similarity_threshold (0.0 to 1.0, where 1.0 means perfect match for cosine similarity)
    # search_results = semantic_search_terminal_simple(query, top_k=10, similarity_threshold=0.7)

    # print(f"\nSearch Results for '{query}' (threshold >= 0.7):")
    # if not search_results:
    #     print("No results found above the similarity threshold.")
    # for i, hit in enumerate(search_results):
    #     print(f"Result {i+1}:")
    #     print(f"  Comment ID: {hit['id']}")
    #     print(f"  Comment: {hit['comment']}")
    #     print(f"  Similarity Distance (lower is better): {hit['distance']:.4f}")
    #     print("  All Metadata:")
    #     for key, value in hit['metadata'].items():
    #         print(f"    {key}: {value}")
    #     print("-" * 30)

    # print("\n--- Another Semantic Search ---")
    # query_2 = "good entertainment shows"
    # search_results_2 = semantic_search_terminal_simple(query_2, top_k=10, similarity_threshold=0.75)

    # print(f"\nSearch Results for '{query_2}' (threshold >= 0.75):")
    # if not search_results_2:
    #     print("No results found above the similarity threshold.")
    # for i, hit in enumerate(search_results_2):
    #     print(f"Result {i+1}:")
    #     print(f"  Comment ID: {hit['id']}")
    #     print(f"  Comment: {hit['comment']}")
    #     print(f"  Similarity Distance (lower is better): {hit['distance']:.4f}")
    #     print("  All Metadata:")
    #     for key, value in hit['metadata'].items():
    #         print(f"    {key}: {value}")
    #     print("-" * 30)
    
# ====================================================
    print("\n--- Performing Semantic Search with Filters ---")

    # # Example 1: Search for bad beef dishes in Dining, at a specific restaurant, during dinner
    # print("\n--- Search 1: Bad beef dishes, Dining, Restaurant '47', Dinner ---")
    # query_1 = "bad beef based dishes"
    # search_results_1 = semantic_search_terminal(
    #     query=query_1,
    #     top_k=10,
    #     similarity_threshold=0.7,
    #     # sheet="Dining",
    #     # restaurant_name="47", # Match the exact key and value from your metadata
    #     # time_of_meal="Dinner" # Match the exact key and value
    # )

    # print(f"\nSearch Results for '{query_1}' (filtered):")
    # if not search_results_1:
    #     print("No results found for this query and filters above the similarity threshold.")
    # for i, hit in enumerate(search_results_1):
    #     print(f"Result {i+1}:")
    #     print(f"  Comment ID: {hit['id']}")
    #     print(f"  Comment: {hit['comment']}")
    #     print(f"  Similarity Distance (lower is better): {hit['distance']:.4f}")
    #     print("  All Metadata:")
    #     for key, value in hit['metadata'].items():
    #         print(f"    {key}: {value}")
    #     print("-" * 30)

#     # Example 2: Search for good entertainment shows
#     print("\n--- Search 2: Good entertainment shows, Entertainment sheet ---")
#     query_2 = "good entertainment shows"
#     search_results_2 = semantic_search_terminal(
#         query=query_2,
#         top_k=10,
#         similarity_threshold=0.75,
#         sheet="Entertainment"
#     )

#     print(f"\nSearch Results for '{query_2}' (filtered):")
#     if not search_results_2:
#         print("No results found for this query and filters above the similarity threshold.")
#     for i, hit in enumerate(search_results_2):
#         print(f"Result {i+1}:")
#         print(f"  Comment ID: {hit['id']}")
#         print(f"  Comment: {hit['comment']}")
#         print(f"  Similarity Distance (lower is better): {hit['distance']:.4f}")
#         print("  All Metadata:")
#         for key, value in hit['metadata'].items():
#             print(f"    {key}: {value}")
#         print("-" * 30)

#     # Example 3: Search for comments on a specific sailing date
#     print("\n--- Search 3: Comments from a specific sailing date ---")
#     query_3 = "general feedback" # A general query if you just want comments from this date
#     search_results_3 = semantic_search_terminal(
#         query=query_3,
#         top_k=10,
#         similarity_threshold=0.6, # Lower threshold for general search
#         start_date_filter="MDY-19-26Jan"
#     )

#     print(f"\nSearch Results for '{query_3}' on MDY-19-26Jan (filtered):")
#     if not search_results_3:
#         print("No results found for this query and filters above the similarity threshold.")
#     for i, hit in enumerate(search_results_3):
#         print(f"Result {i+1}:")
#         print(f"  Comment ID: {hit['id']}")
#         print(f"  Comment: {hit['comment']}")
#         print(f"  Similarity Distance (lower is better): {hit['distance']:.4f}")
#         print("  All Metadata:")
#         for key, value in hit['metadata'].items():
#             print(f"    {key}: {value}")
#         print("-" * 30)

# # ------------------------------------------------------------------------
    # print("\n--- Identifying Core Issues and Topics ---")

    # # Example 1: Identify core issues for Dining on a specific sailing date
    # sailing_date_to_analyze_1 = "MDY-19-26Jan" # Use a date that has data
    # sheet_to_analyze_1 = "Dining"
    # dining_issues = identify_core_issues(sailing_date=sailing_date_to_analyze_1, sheet=sheet_to_analyze_1)
    # print(f"\nCore Issues for '{sheet_to_analyze_1}' on '{sailing_date_to_analyze_1}':")
    # print(dining_issues)
    # print("-" * 30)

    # # Example 2: Identify core issues for Entertainment on the same sailing date
    # sheet_to_analyze_2 = "Entertainment"
    # entertainment_issues = identify_core_issues(sailing_date=sailing_date_to_analyze_1, sheet=sheet_to_analyze_2)
    # print(f"\nCore Issues for '{sheet_to_analyze_2}' on '{sailing_date_to_analyze_1}':")
    # print(entertainment_issues)
    # print("-" * 30)
