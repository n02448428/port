import requests
import csv
import json
import os
import subprocess
from datetime import datetime
from io import StringIO

class SimpleSheetsConverter:
    # Required columns for validation
    REQUIRED_COLUMNS = ['id', 'title']
    # Fields that should be split by semicolon
    SEMICOLON_SPLIT_FIELDS = ['medium', 'tags']
    # Fields that should be split by comma
    COMMA_SPLIT_FIELDS = ['image_urls', 'audio_urls', 'video_urls']
    # Fields with paired values (name|url format)
    PAIRED_FIELDS = {
        'external_link_names': 'external_link_urls'
    }

    def __init__(self, sheet_id):
        self.sheet_id = sheet_id
        self.csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    
    def validate_headers(self, headers):
        """Validate that required columns exist"""
        missing_columns = [col for col in self.REQUIRED_COLUMNS if col not in headers]
        if missing_columns:
            print(f"❌ Missing required columns: {', '.join(missing_columns)}")
            return False
        return True

    def parse_date(self, date_str):
        """Parse date string into consistent format"""
        if not date_str:
            return ""
        try:
            # Try different date formats
            for fmt in ['%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d']:
                try:
                    return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                except ValueError:
                    continue
            return date_str  # Return original if no format matches
        except Exception:
            return date_str

    def process_field(self, header, value):
        """Process field based on its type"""
        if not value:
            return None
            
        value = value.strip()
        
        if header == 'date':
            return self.parse_date(value)
        
        if header in self.SEMICOLON_SPLIT_FIELDS:
            return [item.strip() for item in value.split(';') if item.strip()]
            
        if header in self.COMMA_SPLIT_FIELDS:
            return [item.strip() for item in value.split(',') if item.strip()]
            
        return value

    def process_paired_fields(self, project):
        """Process paired fields like external links"""
        for names_field, urls_field in self.PAIRED_FIELDS.items():
            if names_field in project and urls_field in project:
                names_str = project[names_field]
                urls_str = project[urls_field]
                
                # Skip if either field is empty
                if not names_str or not urls_str:
                    continue
                
                # Split by '|' character
                names = [name.strip() for name in names_str.split('|')]
                
                # Handle URLs - split by | first, then handle any commas
                urls = []
                for url_group in urls_str.split('|'):
                    # Take first URL if comma-separated
                    url = url_group.split(',')[0].strip()
                    urls.append(url)
                
                # Create pairs of names and URLs
                links = []
                for i in range(min(len(names), len(urls))):
                    if names[i] and urls[i]:
                        links.append({
                            'name': names[i],
                            'url': urls[i]
                        })
                
                # Update project with processed links
                if links:
                    project['external_links'] = links
                
                # Remove original fields
                del project[names_field]
                del project[urls_field]

    def fetch_sheet_data(self):
        """Fetch CSV data from public Google Sheet"""
        try:
            print("📥 Fetching data from Google Sheet...")
            response = requests.get(self.csv_url)
            response.raise_for_status()
            
            csv_data = list(csv.reader(StringIO(response.text)))
            if len(csv_data) < 2:
                raise ValueError("Sheet contains insufficient data")
                
            print(f"✅ Fetched {len(csv_data)} rows from sheet")
            return csv_data
            
        except Exception as e:
            print(f"❌ Error fetching sheet data: {e}")
            return None
    
    def process_data(self, csv_data):
        """Convert CSV data to JSON structure"""
        if not csv_data:
            print("❌ No data to process")
            return []
        
        headers = [h.strip().lower().replace(' ', '_').replace('-', '_') for h in csv_data[0]]
        
        if not self.validate_headers(headers):
            return []
            
        projects = []
        
        for row_num, row in enumerate(csv_data[1:], 2):
            # Skip completely empty rows
            if not any(cell.strip() for cell in row):
                continue
            
            # Pad row to match headers length
            row = row + [''] * (len(headers) - len(row))
            
            project = {}
            
            for header, value in zip(headers, row):
                processed_value = self.process_field(header, value)
                if processed_value is not None:
                    project[header] = processed_value
            
            # Process paired fields
            self.process_paired_fields(project)
            
            # Validate required fields
            if all(project.get(field) for field in self.REQUIRED_COLUMNS):
                projects.append(project)
            else:
                print(f"⚠️ Skipping row {row_num}: Missing required fields")
        
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
