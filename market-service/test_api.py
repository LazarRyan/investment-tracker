#!/usr/bin/env python

import requests
import time
import subprocess
import sys
import os
import signal
from pathlib import Path

def run_api_server():
    """Start the FastAPI server in a separate process"""
    print("Starting API server...")
    # Use python executable from the current environment
    python_path = sys.executable
    
    # Start the server as a subprocess
    process = subprocess.Popen(
        [python_path, "-m", "uvicorn", "main:app", "--port", "8765"],
        cwd=str(Path(__file__).parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for the server to start
    print("Waiting for server to start...")
    time.sleep(3)  # Give it some time to start
    
    return process

def stop_api_server(process):
    """Stop the FastAPI server process"""
    print("Stopping API server...")
    if os.name == 'nt':  # Windows
        process.terminate()
    else:  # Unix/Linux/Mac
        os.kill(process.pid, signal.SIGTERM)
    
    # Wait for the process to terminate
    process.wait()
    
    # Print any output from the server
    stdout, stderr = process.communicate()
    if stdout:
        print("Server stdout:", stdout)
    if stderr:
        print("Server stderr:", stderr)

def test_endpoints():
    """Test the API endpoints"""
    base_url = "http://localhost:8765"
    
    # Test the health endpoint
    print("\nTesting /api/health endpoint...")
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Health endpoint successful!")
            print(f"Response: {response.json()}")
        else:
            print(f"Health endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing health endpoint: {e}")
    
    # Test the stocks/stock endpoint
    print("\nTesting /api/stocks endpoint...")
    try:
        response = requests.get(f"{base_url}/api/stocks")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Stocks endpoint successful!")
            data = response.json()
            print(f"Received {len(data)} market items")
        else:
            print(f"Stocks endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing stocks endpoint: {e}")
    
    # Test the stock endpoint (alias)
    print("\nTesting /api/stock endpoint...")
    try:
        response = requests.get(f"{base_url}/api/stock")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Stock endpoint successful!")
            data = response.json()
            print(f"Received {len(data)} market items")
        else:
            print(f"Stock endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing stock endpoint: {e}")
    
    # Test the root endpoint
    print("\nTesting / (root) endpoint...")
    try:
        response = requests.get(f"{base_url}/")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Root endpoint successful!")
            print(f"Response: {response.json()}")
        else:
            print(f"Root endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing root endpoint: {e}")

def main():
    process = None
    try:
        process = run_api_server()
        test_endpoints()
    finally:
        if process:
            stop_api_server(process)

if __name__ == "__main__":
    main() 