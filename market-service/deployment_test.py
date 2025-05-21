#!/usr/bin/env python

import requests
import json
import sys
import argparse
import time
from datetime import datetime

def test_api_endpoint(base_url, api_key, endpoint="/api/health"):
    """Test an API endpoint and return the result"""
    print(f"\n🔍 Testing endpoint: {base_url}{endpoint}")
    
    start_time = time.time()
    try:
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
        
        response = requests.get(
            f"{base_url}{endpoint}", 
            headers=headers,
            timeout=10
        )
        
        elapsed = time.time() - start_time
        print(f"⏱️  Response time: {elapsed:.2f}s")
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ API endpoint available")
            try:
                data = response.json()
                print(f"📋 Response: {json.dumps(data, indent=2)[:500]}...")
                return True, data
            except:
                print("❌ Could not parse JSON response")
                print(f"🔤 Response text: {response.text[:200]}...")
                return False, None
        else:
            print(f"❌ Error response: {response.status_code}")
            print(f"🔤 Response text: {response.text[:200]}...")
            return False, None
            
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"⏱️  Elapsed time before error: {elapsed:.2f}s")
        print(f"❌ Exception: {str(e)}")
        return False, None

def check_cors_preflight(base_url, origin):
    """Test a CORS preflight request"""
    print(f"\n🔍 Testing CORS preflight for origin: {origin}")
    
    try:
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type, x-api-key"
        }
        
        response = requests.options(
            f"{base_url}/api/stocks", 
            headers=headers,
            timeout=10
        )
        
        print(f"📊 Status code: {response.status_code}")
        print(f"📋 CORS Headers: {json.dumps({k: v for k, v in response.headers.items() if k.lower().startswith('access-control')}, indent=2)}")
        
        # Check if CORS headers are present
        if "Access-Control-Allow-Origin" in response.headers:
            print(f"✅ CORS allowed origin: {response.headers['Access-Control-Allow-Origin']}")
            if response.headers["Access-Control-Allow-Origin"] == "*" or response.headers["Access-Control-Allow-Origin"] == origin:
                print("✅ Origin is allowed")
                return True
            else:
                print(f"❌ Origin is not allowed. Expected {origin}, got {response.headers['Access-Control-Allow-Origin']}")
                return False
        else:
            print("❌ No CORS headers found")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test API connectivity")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of the API")
    parser.add_argument("--key", default="56568d9f2686c1bc812e8b9f3e020bbdc90d4642371285cb8696a1939954f94d", help="API key")
    parser.add_argument("--production", action="store_true", help="Test production connectivity")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print(f"🧪 API CONNECTIVITY TEST - {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Test the provided endpoint
    success, data = test_api_endpoint(args.url, args.key)
    
    # If health check succeeds, test the stocks endpoint
    if success:
        test_api_endpoint(args.url, args.key, "/api/stocks")
    
    # Test CORS for local development
    check_cors_preflight(args.url, "http://localhost:3000")
    
    # Test CORS for production
    check_cors_preflight(args.url, "https://investment-tracker-tau.vercel.app")
    
    # If production flag is set, test connecting from Vercel to the API
    if args.production:
        print("\n" + "=" * 60)
        print("🌐 TESTING PRODUCTION CONNECTIVITY")
        print("=" * 60)
        
        # This simulates what Vercel will do
        vercel_request = requests.get(
            "https://investment-tracker-tau.vercel.app/api/market-data", 
            timeout=20
        )
        
        print(f"📊 Vercel API status code: {vercel_request.status_code}")
        try:
            data = vercel_request.json()
            print(f"📋 Response: {json.dumps(data, indent=2)[:500]}...")
            print("✅ Production connectivity successful")
        except:
            print("❌ Could not parse JSON response")
            print(f"🔤 Response text: {vercel_request.text[:200]}...")
            
if __name__ == "__main__":
    main() 