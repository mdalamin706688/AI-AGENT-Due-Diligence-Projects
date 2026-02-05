#!/usr/bin/env python3
"""Test script to verify AI provider configuration"""

import os

def test_provider_selection():
    """Test that the AI provider environment variable is read correctly"""

    # Test with different providers
    providers = ['ollama', 'openrouter', 'grok', 'together']

    for provider in providers:
        os.environ['AI_PROVIDER'] = provider
        print(f"Set AI_PROVIDER to: {provider}")

        # Simulate the logic from answer_service.py
        AI_PROVIDER = os.getenv('AI_PROVIDER', 'ollama').lower()
        print(f"  Detected provider: {AI_PROVIDER}")

        if AI_PROVIDER == "ollama":
            print("  Would call Ollama API")
        elif AI_PROVIDER == "openrouter":
            print("  Would call OpenRouter API")
        elif AI_PROVIDER == "grok":
            print("  Would call Grok API")
        elif AI_PROVIDER == "together":
            print("  Would call Together AI API")
        else:
            print(f"  Unknown provider: {AI_PROVIDER}")

        print()

if __name__ == "__main__":
    test_provider_selection()