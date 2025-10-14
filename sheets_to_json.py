import requests
import csv
import json
import os
import subprocess
from datetime import datetime
from io import StringIO
import re

class EnhancedSheetsConverter:
    """
    Enhanced Google Sheets to JSON converter with:
    - Link validation and warnings
    - Better error messages
    - Data quality checks
    - Detailed logging
    """
    
    REQUIRED_COLUMNS = ['id', 'title']
    SEMICOLON_SPLIT_FIELDS = ['medium', 'tags']
    COMMA_SPLIT_FIELDS = ['image_urls', 'audio_urls', 'video_urls']
    
    # URL validation regex
    URL_PATTERN = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    def __init__(self, sheet_id):
        self.sheet_id = sheet_id
        self.csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
        self.warnings = []
        self.stats = {
            'total_projects': 0,
            'valid_projects': 0,
            'invalid_links': 0,
            'placeholder_links': 0,
            'empty_links': 0
        }
    
    def validate_url(self, url):
        """Validate if string is a proper URL"""
        if not url or len(url) < 10:
            return False
        return bool(self.URL_PATTERN.match(url))
    
    def is_placeholder(self, text):
        """Check if text is a placeholder (single char, 'h', 'url', etc.)"""
        if not text:
            return True
        text = text.strip().lower()
        placeholders = ['h', 'p', 't', 'g', 'url', 'link', 'todo', 'tbd', '#', 'x']
        return len(text) <= 2 or text in placeholders
    
    def process_external_links(self, project, row_num):
        """
        Process external_link_names and external_link_urls with validation
        Returns processed links and logs warnings
        """
        names_raw = project.get('external_link_names', '')
        urls_raw = project.get('external_link_urls', '')
        
        if not names_raw and not urls_raw:
            return []
        
        # Parse names and URLs
        names = []
        urls = []
        
        if isinstance(names_raw, list):
            names = names_raw
        elif isinstance(names_raw, str):
            names = [n.strip() for n in names_raw.split('|') if n.strip()]
        
        if isinstance(urls_raw, list):
            urls = urls_raw
        elif isinstance(urls_raw, str):
            urls = [u.strip() for u in urls_raw.split('|') if u.strip()]
        
        # Validate and pair
        valid_links = []
        
        for i in range(max(len(names), len(urls))):
            name = names[i] if i < len(names) else ''
            url = urls[i] if i < len(urls) else ''
            
            # Check for placeholders
            if self.is_placeholder(name) and self.is_placeholder(url):
                self.stats['placeholder_links'] += 1
                self.warnings.append(
                    f"⚠️  Row {row_num} ({project.get('title', 'Unknown')}): "
                    f"Placeholder link detected: '{name}' → '{url}'"
                )
                continue
            
            # Check for empty
            if not name or not url:
                self.stats['empty_links'] += 1
                self.warnings.append(
                    f"⚠️  Row {row_num} ({project.get('title', 'Unknown')}): "
                    f"Incomplete link - Name: '{name}', URL: '{url}'"
                )
                continue
            
            # Validate URL format
            if not self.validate_url(url):
                self.stats['invalid_links'] += 1
                self.warnings.append(
                    f"❌ Row {row_num} ({project.get('title', 'Unknown')}): "
                    f"Invalid URL format: '{url}'"
                )
                continue
            
            # Valid link!
            valid_links.append({
                'name': name,
                'url': url
            })
        
        return valid_links
    
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
    
    def validate_headers(self, headers):
        """Validate that required columns exist"""
        missing = [col for col in self.REQUIRED_COLUMNS if col not in headers]
        if missing:
            print(f"❌ Missing required columns: {', '.join(missing)}")
            return False
        return True
    
    def parse_date(self, date_str):
        """Parse date string into consistent format"""
        if not date_str:
            return ""
        try:
            for fmt in ['%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d']:
                try:
                    return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                except ValueError:
                    continue
            return date_str
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
    
    def process_data(self, csv_data):
        """Convert CSV data to JSON structure with validation"""
        if not csv_data:
            print("❌ No data to process")
            return []
        
        headers = [h.strip().lower().replace(' ', '_').replace('-', '_') 
                  for h in csv_data[0]]
        
        if not self.validate_headers(headers):
            return []
        
        projects = []
        self.warnings = []
        
        for row_num, row in enumerate(csv_data[1:], 2):
            if not any(cell.strip() for cell in row):
                continue
            
            row = row + [''] * (len(headers) - len(row))
            project = {}
            
            for header, value in zip(headers, row):
                processed = self.process_field(header, value)
                if processed is not None:
                    project[header] = processed
            
            # Process external links with validation
            if 'external_link_names' in project or 'external_link_urls' in project:
                valid_links = self.process_external_links(project, row_num)
                if valid_links:
                    project['external_links'] = valid_links
                # Remove raw fields
                project.pop('external_link_names', None)
                project.pop('external_link_urls', None)
            
            # Validate required fields
            if all(project.get(field) for field in self.REQUIRED_COLUMNS):
                projects.append(project)
                self.stats['valid_projects'] += 1
            else:
                print(f"⚠️  Skipping row {row_num}: Missing required fields")
        
        self.stats['total_projects'] = len(csv_data) - 1
        return projects
    
    def print_report(self):
        """Print validation report"""
        print("\n" + "="*60)
        print("📊 VALIDATION REPORT")
        print("="*60)
        print(f"Total rows processed: {self.stats['total_projects']}")
        print(f"Valid projects: {self.stats['valid_projects']}")
        print(f"Placeholder links found: {self.stats['placeholder_links']}")
        print(f"Empty/incomplete links: {self.stats['empty_links']}")
        print(f"Invalid URL formats: {self.stats['invalid_links']}")
        
        if self.warnings:
            print(f"\n⚠️  {len(self.warnings)} warnings:")
            for warning in self.warnings[:10]:  # Show first 10
                print(f"   {warning}")
            if len(self.warnings) > 10:
                print(f"   ... and {len(self.warnings) - 10} more")
        else:
            print("\n✅ No warnings! All data looks good.")
        
        print("="*60 + "\n")
    
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
        """Run the complete pipeline with validation"""
        print("🚀 Starting Enhanced Google Sheets to JSON pipeline...\n")
        
        csv_data = self.fetch_sheet_data()
        if not csv_data:
            return False
        
        projects = self.process_data(csv_data)
        if not projects:
            return False
        
        self.print_report()
        
        if not self.save_json(projects):
            return False
        
        if not self.commit_to_github():
            return False
        
        print("🎉 Pipeline completed successfully!")
        return True

def main():
    SHEET_ID = os.environ.get('SHEET_ID', 'YOUR_SHEET_ID_HERE')
    
    if SHEET_ID == "YOUR_SHEET_ID_HERE":
        print("❌ Please set SHEET_ID environment variable")
        print("💡 For local testing: SHEET_ID=your_id python sheets_to_json.py")
        return
    
    converter = EnhancedSheetsConverter(SHEET_ID)
    converter.run_pipeline()

if __name__ == "__main__":
    main()