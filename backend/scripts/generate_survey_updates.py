#!/usr/bin/env python3
"""
Generate SQL UPDATE statements from survey CSV to update liked_most and would_improve columns.
Usage: python generate_survey_updates.py <csv_file> > updates.sql
"""

import csv
import sys
from pathlib import Path

def escape_sql_string(s):
    """Escape single quotes for SQL strings."""
    if s is None:
        return ''
    return s.replace("'", "''")

def generate_updates(csv_path):
    """Generate SQL UPDATE statements from CSV file."""
    
    print("-- Auto-generated SQL updates for usability_survey_responses")
    print("-- Source:", csv_path)
    print("-- Generated: 2025-12-15")
    print()
    print("BEGIN;")
    print()
    
    count = 0
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            user_id = row.get('User ID', '').strip()
            sus_score = row.get('SUS Score', '').strip()
            avg_rating = row.get('Average Rating', '').strip()
            liked_most = escape_sql_string(row.get('Liked Most', '').strip())
            would_improve = escape_sql_string(row.get('Would Improve', '').strip())
            
            if not user_id or not sus_score or not avg_rating:
                continue
            
            # Generate UPDATE statement matching on user_id, sus_score, and average_rating
            print(f"""UPDATE usability_survey_responses 
SET liked_most = '{liked_most}', 
    would_improve = '{would_improve}', 
    updated_at = NOW()
WHERE user_id = '{user_id}' 
  AND ABS(sus_score - {sus_score}) < 0.01 
  AND ABS(average_rating - {avg_rating}) < 0.01;
""")
            count += 1
    
    print("COMMIT;")
    print()
    print(f"-- Total updates: {count}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        # Default to the known CSV path
        csv_path = Path(__file__).parent.parent.parent / 'school_docs' / 'defense' / 'lifepattern_surveys_updated_2025-12-14.csv'
    else:
        csv_path = Path(sys.argv[1])
    
    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)
    
    generate_updates(csv_path)
