import requests
import csv
import json
import os
import subprocess
from datetime import datetime
from io import StringIO

class SimpleSheetsConverter:
    def __init__(self, sheet_id):
        self.sheet_id = sheet_id
        self.csv_url = f"https://docs.google.com/spreadsheets/d/1xR2n2WlsAx32ZAkgUte253zL81VSScZq9HDjW8pFuRE/export?format=csv"
    
    def fetch_sheet_data(self):
        """Fetch CSV data from public Google Sheet"""
        try:
            print("📥 Fetching data from Google Sheet...")
            response = requests.get(self.csv_url)
            response.raise_for_status()
            
            # Parse CSV data
            csv_data = list(csv.reader(StringIO(response.text)))
            print(f"✅ Fetched {len(csv_data)} rows from sheet")
            return csv_data
            
        except Exception as e:
            print(f"❌ Error fetching sheet data: {e}")
            return None
    
    def process_data(self, csv_data):
        """Convert CSV data to JSON structure"""
        if not csv_data or len(csv_data) < 2:
            print("❌ No valid data found")
            return []
        
        headers = [h.strip().lower().replace(' ', '_') for h in csv_data[0]]
        projects = []
        
        for row in csv_data[1:]:
            # Skip empty rows
            if not any(cell.strip() for cell in row):
                continue
            
            # Pad row to match headers length
            while len(row) < len(headers):
                row.append('')
            
            project = {}
            
            for i, header in enumerate(headers):
                value = row[i].strip() if i < len(row) else ''
                
                if not value:  # Skip empty fields
                    continue
                
                # Handle comma-separated fields
                if header in ['image_urls', 'audio_urls', 'video_urls', 'tags', 
                             'external_link_names', 'external_link_urls']:
                    project[header] = [item.strip() for item in value.split(',') if item.strip()]
                else:
                    project[header] = value
            
            # Only include projects with at least id and title
            if project.get('id') and project.get('title'):
                projects.append(project)
        
        print(f"✅ Processed {len(projects)} valid projects")
        return projects
    
    def save_json(self, data, filename='data/projects.json'):
        """Save data to JSON file"""
        try:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Saved {len(data)} projects to {filename}")
            return True
            
        except Exception as e:
            print(f"❌ Error saving JSON: {e}")
            return False
    
    def commit_to_github(self, commit_message=None):
        """Commit changes to GitHub"""
        try:
            if not commit_message:
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                commit_message = f"Update projects data - {timestamp}"
            
            # Check if there are changes to commit
            result = subprocess.run(['git', 'diff', '--name-only'], 
                                  capture_output=True, text=True)
            
            if not result.stdout.strip():
                print("ℹ️  No changes detected, skipping commit")
                return True
            
            subprocess.run(['git', 'add', 'data/projects.json'], check=True)
            subprocess.run(['git', 'commit', '-m', commit_message], check=True)
            subprocess.run(['git', 'push'], check=True)
            
            print("✅ Successfully pushed to GitHub")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Git error: {e}")
            return False
        except Exception as e:
            print(f"❌ Error committing to GitHub: {e}")
            return False
    
    def run_pipeline(self):
        """Run the complete pipeline"""
        print("🚀 Starting Google Sheets to JSON pipeline...")
        
        # Fetch data from sheet
        csv_data = self.fetch_sheet_data()
        if not csv_data:
            return False
        
        # Process into JSON structure
        projects = self.process_data(csv_data)
        if not projects:
            return False
        
        # Save to file
        if not self.save_json(projects):
            return False
        
        # Commit to GitHub
        if not self.commit_to_github():
            return False
        
        print("🎉 Pipeline completed successfully!")
        print(f"📊 Updated {len(projects)} projects")
        return True

def main():
    # Get Sheet ID from environment variable (for GitHub Actions) or hardcode for local testing
    SHEET_ID = os.environ.get('SHEET_ID', 'YOUR_SHEET_ID_HERE')
    
    if SHEET_ID == "YOUR_SHEET_ID_HERE":
        print("❌ Please set SHEET_ID environment variable or update the script")
        print("💡 For local testing: SHEET_ID=your_id python sheets_to_json.py")
        return
    
    converter = SimpleSheetsConverter(SHEET_ID)
    converter.run_pipeline()

if __name__ == "__main__":
    main()
