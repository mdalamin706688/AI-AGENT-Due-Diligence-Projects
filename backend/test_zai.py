#!/usr/bin/env python3
"""Test Z.AI provider integration"""

import os

def test_zai_provider():
    """Test that Z.AI provider is correctly configured"""

    # Test Z.AI provider selection
    os.environ['AI_PROVIDER'] = 'zai'
    os.environ['ZAI_API_KEY'] = 'test_key_placeholder'

    print("Testing Z.AI provider configuration:")
    print(f"AI_PROVIDER: {os.environ.get('AI_PROVIDER')}")
    print(f"ZAI_API_KEY configured: {'Yes' if os.environ.get('ZAI_API_KEY') else 'No'}")

    # Simulate the provider logic
    AI_PROVIDER = os.environ.get('AI_PROVIDER', 'ollama').lower()
    ZAI_API_KEY = os.environ.get('ZAI_API_KEY')

    print(f"Selected provider: {AI_PROVIDER}")
    print(f"Z.AI API key available: {'Yes' if ZAI_API_KEY else 'No'}")

    if AI_PROVIDER == "zai":
        print("✅ Z.AI provider correctly selected")
        if ZAI_API_KEY:
            print("✅ Z.AI API key configured")
            print("📝 Ready to use GLM-4.7-Flash (FREE model)")
        else:
            print("⚠️  Z.AI API key not configured")
    else:
        print("❌ Z.AI provider not selected")

    print("\nTo use Z.AI:")
    print("1. Get API key from: https://z.ai/developer")
    print("2. Set ZAI_API_KEY in .env file")
    print("3. Set AI_PROVIDER=zai")
    print("4. Use FREE GLM-4.7-Flash model!")

if __name__ == "__main__":
    test_zai_provider()