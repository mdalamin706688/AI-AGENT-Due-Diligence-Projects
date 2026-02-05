#!/usr/bin/env python3
"""Test Z.AI API with real key"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_zai_api():
    """Test the Z.AI API with the provided key"""

    ZAI_API_KEY = os.getenv("ZAI_API_KEY")
    AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")

    print("🔍 Testing Z.AI API Integration")
    print(f"Provider: {AI_PROVIDER}")
    print(f"API Key: {'Configured' if ZAI_API_KEY else 'Missing'}")

    if not ZAI_API_KEY:
        print("❌ Z.AI API key not found!")
        return

    # Test API call
    try:
        print("\n📡 Making test API call to Z.AI...")

        response = requests.post(
            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            headers={
                "Authorization": f"Bearer {ZAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "glm-4.7-flash",  # Try with dots
                "messages": [
                    {"role": "user", "content": "Hello! This is a test message. Please respond with 'Z.AI API is working!'"}
                ],
                "temperature": 0.1,
                "max_tokens": 50
            },
            timeout=30
        )

        print(f"Response Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            print("✅ API call successful!")
            print(f"Response: {ai_response}")
            print("\n🎉 Z.AI integration is working perfectly!")
            print("Your FREE unlimited API is ready to use!")
        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"Error: {response.text}")

    except Exception as e:
        print(f"❌ Error testing Z.AI API: {e}")

if __name__ == "__main__":
    test_zai_api()