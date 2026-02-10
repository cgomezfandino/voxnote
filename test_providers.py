#!/usr/bin/env python3
"""Quick test script for different LLM providers."""

import os
import sys
from pathlib import Path

# Test transcript
SAMPLE_TRANSCRIPT = """
Buenas tardes equipo. Hoy vamos a revisar el estado del proyecto.
Carlos menciona que terminó el backend de autenticación y está listo para deploy.
Ana propone agregar tests end-to-end antes de lanzar a producción.
Se decide que Carlos hará el deploy mañana y Ana empezará los tests el jueves.
Queda pendiente definir quién se encarga de la documentación del API.
"""


def test_provider(provider_name: str):
    """Test a specific provider."""
    print(f"\n{'='*60}")
    print(f"Testing provider: {provider_name.upper()}")
    print(f"{'='*60}\n")

    try:
        from voxnote.providers import get_provider

        provider = get_provider(provider_name)
        print(f"✓ Provider loaded: {provider.name}")
        print(f"✓ Supports streaming: {provider.supports_streaming}")
        print(f"\nExtracting insights from sample transcript...")

        insights = provider.extract_insights(SAMPLE_TRANSCRIPT)

        print(f"\n✓ Success! Got insights:\n")
        print(f"  Resumen: {insights.get('resumen', 'N/A')}")
        print(f"  Decisiones: {len(insights.get('decisiones', []))} items")
        print(f"  Action items: {len(insights.get('action_items', []))} items")
        print(f"  Insights: {len(insights.get('insights', []))} items")

        if insights.get("action_items"):
            print(f"\n  Action items:")
            for item in insights["action_items"]:
                print(f"    - {item.get('tarea')} (@{item.get('responsable')})")

        return True

    except ValueError as e:
        print(f"✗ Error: {e}")
        return False
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print(f"  Install with: pip install -e \".[{provider_name}]\"")
        return False
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {e}")
        return False


def main():
    """Run provider tests."""
    print("Voxnote Provider Test Suite")
    print("=" * 60)

    # Check which providers to test
    if len(sys.argv) > 1:
        providers = sys.argv[1:]
    else:
        providers = ["ollama", "openai", "kimi", "glm", "google"]

    results = {}
    for provider in providers:
        results[provider] = test_provider(provider)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    for provider, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"  {status:8} {provider}")


if __name__ == "__main__":
    main()
