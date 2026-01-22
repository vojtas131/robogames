#!/usr/bin/env python3
"""
Script to download and process Czech school registry data from MŠMT.
Downloads the full RSSZ (Rejstřík škol a školských zařízení) and extracts
only the school names and addresses for the frontend autocomplete.

Source: https://lkod-ftp.msmt.gov.cz/00022985/88a7c12b-6084-4e47-8b50-46097c6e683f/RSSZ-cela-CR.jsonld

Usage:
    python3 update_schools.py

Output:
    ../src/assets/schools.json - Processed school data for frontend

Note: Downloads ~30MB, processes in memory, outputs ~2MB. No temp files created.
"""

import json
import urllib.request
import os
import sys
from datetime import datetime, timezone
from io import BytesIO

# URL of the MŠMT school registry data
MSMT_DATA_URL = "https://lkod-ftp.msmt.gov.cz/00022985/88a7c12b-6084-4e47-8b50-46097c6e683f/RSSZ-cela-CR.jsonld"

# Output file path (relative to this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "src", "assets")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "schools.json")


def format_address(adresa):
    """
    Format address from the MŠMT data structure.
    
    Input structure:
    {
        "ulice": "Ostrovní",
        "cisloDomovni": 139,
        "typCislaDomovniho": "č.p.",
        "cisloOrientacni": 11,
        "obec": "Praha",
        "castObce": "Nové Město",
        "cisloObvoduPrahy": "Praha 1",
        "psc": "110 00"
    }
    
    Output: "Ostrovní 139/11, Praha 1" or "Ostrovní 139/11, Nové Město, Praha"
    """
    if not adresa:
        return ""
    
    parts = []
    
    # Street with number
    street = adresa.get("ulice", "")
    house_num = adresa.get("cisloDomovni", "")
    orient_num = adresa.get("cisloOrientacni", "")
    
    if street:
        if house_num and orient_num:
            parts.append(f"{street} {house_num}/{orient_num}")
        elif house_num:
            parts.append(f"{street} {house_num}")
        else:
            parts.append(street)
    
    # City/district
    prague_district = adresa.get("cisloObvoduPrahy", "")
    city = adresa.get("obec", "")
    city_part = adresa.get("castObce", "")
    
    if prague_district:
        parts.append(prague_district)
    elif city_part and city_part != city:
        parts.append(f"{city_part}, {city}")
    elif city:
        parts.append(city)
    
    return ", ".join(parts)


def get_simple_location(adresa):
    """
    Get just the city/district for display with school name.
    """
    if not adresa:
        return ""
    
    prague_district = adresa.get("cisloObvoduPrahy", "")
    if prague_district:
        return prague_district
    
    city = adresa.get("obec", "")
    return city


def download_and_process():
    """
    Download MŠMT data and process it in memory.
    Returns processed data dict or None on error.
    
    Input format (MŠMT RSSZ JSONLD):
    {
        "@context": "http://msmt.cz/",
        "datumVystupu": "2026-01-21",
        "list": [
            {
                "redIzo": "600000206",
                "uplnyNazev": "Mateřská škola sv. Voršily v Praze",
                "zkracenyNazev": "Mateřská škola sv. Voršily v Praze",
                "adresa": {
                    "ulice": "Ostrovní",
                    "cisloDomovni": 139,
                    "obec": "Praha",
                    "cisloObvoduPrahy": "Praha 1",
                    ...
                },
                ...
            },
            ...
        ]
    }
    
    Output format:
    {
        "generatedAt": "2026-01-21T12:00:00Z",
        "sourceDate": "2026-01-21",
        "totalCount": 12345,
        "schools": [
            {
                "name": "Mateřská škola sv. Voršily v Praze",
                "shortName": "MŠ sv. Voršily",
                "address": "Ostrovní 139/11, Praha 1",
                "city": "Praha 1"
            },
            ...
        ]
    }
    """
    print(f"Downloading from: {MSMT_DATA_URL}")
    print("This may take a while (~30MB download)...")
    
    try:
        req = urllib.request.Request(
            MSMT_DATA_URL,
            headers={'User-Agent': 'Mozilla/5.0 (compatible; SchoolDataUpdater/1.0)'}
        )
        
        # Download into memory buffer
        buffer = BytesIO()
        with urllib.request.urlopen(req, timeout=300) as response:
            total_size = response.getheader('Content-Length')
            if total_size:
                total_size = int(total_size)
                print(f"File size: {total_size / 1024 / 1024:.1f} MB")
            
            downloaded = 0
            chunk_size = 1024 * 1024  # 1MB chunks
            
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                buffer.write(chunk)
                downloaded += len(chunk)
                if total_size:
                    progress = (downloaded / total_size) * 100
                    print(f"\rDownloading: {progress:.1f}% ({downloaded / 1024 / 1024:.1f} MB)", end="", flush=True)
        
        print("\nDownload complete!")
        print()
        
        # Parse JSON from buffer
        print("Parsing JSON data...")
        buffer.seek(0)
        data = json.loads(buffer.read().decode('utf-8'))
        buffer.close()  # Free memory
        
        source_date = data.get("datumVystupu", "unknown")
        schools_list = data.get("list", [])
        
        print(f"Source date: {source_date}")
        print(f"Total records in source: {len(schools_list)}")
        print()
        
        # Process schools
        print("Processing school data...")
        processed_schools = []
        seen_names = set()  # To avoid duplicates
        
        for school in schools_list:
            full_name = (school.get("uplnyNazev") or "").strip()
            short_name = (school.get("zkracenyNazev") or "").strip()
            adresa = school.get("adresa", {})
            
            if not full_name:
                continue
            
            city = get_simple_location(adresa)
            
            # Create unique key to avoid duplicates
            unique_key = f"{full_name}|{city}"
            if unique_key in seen_names:
                continue
            seen_names.add(unique_key)
            
            processed_schools.append({
                "name": full_name,
                "shortName": short_name if short_name != full_name else "",
                "address": format_address(adresa),
                "city": city
            })
        
        # Sort by name
        processed_schools.sort(key=lambda x: x["name"].lower())
        
        print(f"Processed unique schools: {len(processed_schools)}")
        
        # Create output
        output_data = {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sourceDate": source_date,
            "totalCount": len(processed_schools),
            "schools": processed_schools
        }
        
        return output_data
        
    except json.JSONDecodeError as e:
        print(f"\nError parsing JSON: {e}")
        return None
    except Exception as e:
        print(f"\nError: {e}")
        return None


def save_output(data, output_path):
    """Save processed data to JSON file."""
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    file_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"Output written to: {output_path}")
    print(f"Output file size: {file_size:.2f} MB")


def main():
    print("=" * 60)
    print("Czech School Registry Data Updater")
    print("=" * 60)
    print()
    
    # Download and process in memory
    data = download_and_process()
    
    if data is None:
        print("Failed to download or process school data. Exiting.")
        sys.exit(1)
    
    print()
    
    # Save to file
    save_output(data, OUTPUT_FILE)
    
    print()
    print("=" * 60)
    print("Update complete!")
    print(f"School data saved to: {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
